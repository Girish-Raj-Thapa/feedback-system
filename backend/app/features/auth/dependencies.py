"""
FastAPI dependency providers and aliases for authentication and RBAC authorization.
"""

from collections.abc import Callable
from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.dependencies import DBSession
from app.core.errors import AuthenticationError, ForbiddenError
from app.core.redis import is_token_revoked
from app.core.security.jwt import decode_token
from app.features.auth.models import User
from app.features.auth.services import AuthService

bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_service(session: DBSession) -> AuthService:
    return AuthService(session)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


async def get_token_payload(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    """
    Extract and decode JWT token payload from either Authorization header or HTTP-only cookie.
    """
    token: str | None = None

    if credentials is not None:
        token = credentials.credentials
    else:
        # Fall back to cookie (ff_session or access_token) for Next.js web application
        token = request.cookies.get("ff_session") or request.cookies.get("access_token")

    if not token:
        raise AuthenticationError("Authorization credentials missing")

    token_payload = decode_token(token, expected_type="access")
    jti = token_payload.get("jti")
    if jti and await is_token_revoked(jti):
        raise AuthenticationError("Token has been revoked")

    return token_payload


CurrentTokenPayload = Annotated[dict[str, Any], Depends(get_token_payload)]


async def get_current_user(
    service: AuthServiceDep,
    token_payload: CurrentTokenPayload,
) -> User:
    user_id_str = token_payload.get("sub")
    if not user_id_str:
        raise AuthenticationError("Invalid token subject")

    try:
        user_id = UUID(user_id_str)
    except ValueError as exc:
        raise AuthenticationError("Invalid user identifier in token") from exc

    return await service.get_current_user(user_id)


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_admin(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise ForbiddenError("Administrator access required")
    return current_user


CurrentAdmin = Annotated[User, Depends(get_current_admin)]


def require_permission(permission_id: str) -> Callable[..., Any]:
    """
    Dependency factory to enforce workspace-scoped permission checks.
    Extracts workspace_id from path parameters or 'x-workspace-id' header.
    """

    async def _permission_dependency(
        request: Request,
        current_user: CurrentUser,
        service: AuthServiceDep,
        x_workspace_id: UUID | None = Header(default=None, alias="x-workspace-id"),
    ) -> None:
        ws_id: UUID | None = None
        raw_path_ws_id = request.path_params.get("workspace_id")
        if raw_path_ws_id:
            try:
                ws_id = (
                    UUID(raw_path_ws_id)
                    if isinstance(raw_path_ws_id, str)
                    else raw_path_ws_id
                )
            except ValueError as exc:
                raise ForbiddenError("Invalid workspace identification format") from exc
        elif x_workspace_id is not None:
            ws_id = x_workspace_id

        if ws_id is None:
            raise ForbiddenError("Workspace identification is required for this action")

        has_perm = await service.has_permission(
            workspace_id=ws_id,
            user=current_user,
            required_permission=permission_id,
        )
        if not has_perm:
            raise ForbiddenError(f"Missing required permission: {permission_id}")

    return _permission_dependency
