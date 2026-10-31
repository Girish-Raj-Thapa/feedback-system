# Backend Conventions

Scope: `backend/`. Formatter and linter handle style; this file covers judgment calls they can't.

## Tooling
- Format/lint: ruff. Types: pyright
- Code must pass both before a task is considered done (commands in `workflow.md`).

## Naming
- Files, modules, functions, columns: `snake_case`. Classes: `PascalCase`. Constants: `UPPER_SNAKE`.
- Tables: plural `snake_case`. Foreign keys: `<entity>_id`.
- ORM model `Invoice`; schemas `InvoiceCreate`, `InvoiceUpdate`, `InvoiceRead`.
- Exceptions end in `Error` and name the failure: `InvoiceNotFoundError`.
- Services: classes named `<Feature>Service`, constructed with a session (see `architecture.md` → Call direction). Repositories: `<Feature>Repository`.
- URL paths: plural nouns, kebab-case, no verbs (`/invoices`). Non-CRUD actions are sub-resources (`POST /invoices/{id}/send`).
- Request body parameter is named `payload`, never `request`.
- CRUD schemas: `<Entity>Create/Update/Read`. Non-CRUD actions: `<Action>Request`, returning `<Entity>Read`.

## Typing
- Type-hint every function signature, including return types.
- Modern syntax only: `str | None`, `list[str]`. No `Optional`, `List`, `Dict`.
- No bare `Any`. If unavoidable, add a one-line comment explaining why.
- Every FastAPI parameter uses `Annotated` (`Depends`, `Query`, `Path`, `Header`). Define named aliases next to the provider (`InvoiceServiceDep`, `DBSession`, `CurrentUser`) and use only the alias in routers. Never write `Depends(...)` inline in a handler.
- SQLAlchemy 2.0 style only: `Mapped[]`, `mapped_column`, `select()`. No legacy `session.query`.

## Schemas (Pydantic v2)
- Separate Create, Update and Read schemas. Never reuse one for both input and output.
- Read schemas set `from_attributes=True`.
- Update schemas make every field optional; apply with `model_dump(exclude_unset=True)`. Why: distinguishes "not sent" from "set to null".
- Constrain input at the boundary (`Field(min_length=..., ge=...)`) instead of re-checking in services.
- v2 APIs only: `model_validate`, `model_dump`, `field_validator`, `ConfigDict`. No `.dict()` or `class Config`.
- Never expose secrets or internal fields (hashes, tokens, audit internals) in Read schemas.

## Database access
- Load relationships explicitly (`selectinload`, `joinedload`). Why: async sessions raise on lazy loads.
- Avoid N+1: fetch related rows in the same query, not in loops.
- Every list endpoint is paginated. Pagination shape: limit/offset.
- IDs: UUID. Timestamps: timezone-aware UTC only.
- Select only what you need. No `SELECT *` equivalents on wide tables for list views.

## Error handling
- Raise the most specific domain exception. Messages are user-safe: no SQL, stack traces or internal paths.
- Validate early and return early (guard clauses) instead of deep nesting.
- Never catch bare `Exception` except at a top-level boundary, and always log it there. Never swallow errors silently.

## Logging
- Use the shared logger from `core/logging`. Never `print`.
- Never log secrets, tokens, passwords or personal data. Log IDs instead.
- Levels: `info` for business events, `warning` for recoverable oddities, `error` for failures needing attention.

## Imports and config
- Absolute imports from `app.` only. No wildcard imports.
- Zero-Fallback Config: Critical environment variables in `core/config.py` use `Field(...)` without defaults. `Settings` defines `def __init__(self, **kwargs: Any) -> None: super().__init__(**kwargs)` so static typecheckers (Pyright) pass without false-positive missing argument issues.
- No hardcoded URLs, limits or credentials. Settings come from `core/config`; repeated literals become named constants.
- Workspace-scoped permission checks use `require_permission("<id>")` which inspects `request.path_params.get("workspace_id")` and `x-workspace-id` header (never bare `Path(default=None)` which crashes FastAPI validation).

## Comments
- Explain why, not what. If a comment restates the code, delete it.
- Keep comments concise and standard: never use decorative banners (`===`, `---`) or numbered step lists (`1.`, `2.`).
- Docstring only when behavior isn't obvious from name and types (side effects, locking, raised exceptions).
- Route handlers always have a docstring (it becomes the OpenAPI description) and a return type annotation.
- No commented-out code and no TODOs without an owner or issue link.

## Do not
- Add a dependency without asking. Prefer the standard library and existing packages.
- Introduce a second way of doing something the codebase already does (second logger, second HTTP client, second pagination style). Extend the existing one.