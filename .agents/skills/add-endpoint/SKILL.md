---
name: add-endpoint
description: Add or change a FastAPI endpoint in a backend feature, end to end (schema, repository, service, router, tests). Use when creating a new route, changing a request or response shape, or adding a CRUD, list or action endpoint under app/features/.
---

# Add an Endpoint

Procedure only. Rules live elsewhere and apply here:
- Layers, transactions, errors, response contract: `backend/architecture.md`
- Naming, typing, schemas, docstrings: `backend/conventions.md`
- Check commands: `backend/workflow.md`

## 0. Orient
- Open the closest existing endpoint and copy its shape.
- Decide the contract first: method, path, status code, request schema, response schema, who may call it.
- Auth is undefined until the human defines it. If the endpoint needs auth, ask.

## 1. Schemas (`schemas.py`)
- Create: required fields with constraints. Update (PATCH): all fields optional. Read: `from_attributes=True`, no internal fields.
- Endpoints return Pydantic schemas directly. For paginated lists, use `Page[T]` from `core/responses.py` (`items`, `total`, `limit`, `offset`).

## 2. Repository (`repositories.py`)
- Every method is `async def`. Read with `.scalars().all()`, `.scalar_one_or_none()` or `.scalar_one()`. Primary-key lookup: `await session.get(Model, id)`.
- Writes: `session.add(obj)` then `await session.flush()`. Never commit.
- Lists return `tuple[list[Model], int]`. Build the filter conditions once, then run two queries sequentially on the same session: the page (stable `order_by`, `limit`, `offset`) and `select(func.count()).select_from(Model).where(*conditions)`. Never `asyncio.gather` on one session.
- Load relationships the response needs in the same query (`selectinload`/`joinedload`).

## 3. Service (`services.py`)
- Add a method on `<Feature>Service`. Take plain values (`limit`, `offset`, schemas), never FastAPI types. Return ORM objects.
- Not found, conflict, forbidden: raise a domain exception.
- Writes: repository call, then one `await self.session.commit()` at the end. `await self.session.refresh(obj)` for DB-generated values.
- Catch `IntegrityError` only to `await self.session.rollback()` and raise a domain conflict. Other failures propagate; `get_db` rolls back.
- Update: apply `payload.model_dump(exclude_unset=True)` only.
- Side effects (email, worker job): enqueue after commit, IDs only.
- Calling another feature: its service only, same session.

## 4. Dependencies
Shared in `core/dependencies.py` (add once, reuse):
```python
DBSession = Annotated[AsyncSession, Depends(get_session)]

@dataclass
class Pagination:
    limit: Annotated[int, Query(ge=1, le=100)] = 20
    offset: Annotated[int, Query(ge=0)] = 0

PaginationDep = Annotated[Pagination, Depends()]
```
Per feature in `dependencies.py`:
```python
def get_invoice_service(session: DBSession) -> InvoiceService:
    return InvoiceService(session)

InvoiceServiceDep = Annotated[InvoiceService, Depends(get_invoice_service)]
```

## 5. Router (`router.py`)
Once per feature: `router = APIRouter(prefix="/invoices", tags=["invoices"])`. Decorator paths are relative.

```python
@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
async def create_invoice(
    payload: InvoiceCreate,
    service: InvoiceServiceDep,
) -> InvoiceRead:
    """
    Create a new invoice.
    Returns the created invoice.
    """
    invoice = await service.create(payload)
    return InvoiceRead.model_validate(invoice)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
)
async def list_invoices(
    service: InvoiceServiceDep,
    pagination: PaginationDep,
) -> Page[InvoiceRead]:
    """
    List invoices.
    Returns a page of invoices with pagination metadata.
    """
    items, total = await service.list(limit=pagination.limit, offset=pagination.offset)
    return Page(
        items=[InvoiceRead.model_validate(i) for i in items],
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.delete(
    "/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_invoice(
    invoice_id: UUID,
    service: InvoiceServiceDep,
) -> None:
    """
    Delete an invoice.
    Returns no content.
    """
    await service.delete(invoice_id)
```
Rules:
- Decorator argument order: path, `status_code`, `response_model`, then extras (`summary`, `dependencies`, `responses`). Use `status.HTTP_*` constants.
- Parameter order: path params, `payload`, query/pagination, service, auth.
- Body: call the service, convert to the Read schema, return `Response(data=...)` or `PagedResponse.create(...)`. No queries, rules or `try/except` for domain errors.
- Document non-obvious errors with `responses={404: {"model": ErrorResponse}}`.
- Status codes: create `201`, delete `204` (no body), everything else `200`.
- Methods: `POST` create, `GET` read/list, `PATCH` partial update, `PUT` full replacement only, `DELETE` remove. Actions: `POST /{id}/<action>`.
- New feature only: mount its router in `app/api/v1/router.py`.

## 6. Tests (`tests/<feature>/`)
- Service: happy path, each business rule, each raised exception, rollback on conflict.
- API: status code, envelope shape (`data` present, no `error`), `422` remapped to `{"error": ...}`, not found, unauthorized/forbidden.
- Lists: correct `meta.total`, pagination bounds, stable ordering.
- Writes: assert DB state changed. Enqueued jobs: assert the task was called after commit, with IDs.

## 7. Verify
Run Check in `workflow.md`, then call the endpoint once and read the real response body.

## Common mistakes
- Adding `response_model` when function return type already specifies the schema.
- Wrapping responses in custom artificial envelopes (`{"data": ...}`).
- Total computed with different filters than the page query.
- Committing in the repository, or forgetting to commit in the service.
- Enqueuing a job before commit.
- Lazy-loading a relationship while building the response.
- Reusing one schema for create, update and read.