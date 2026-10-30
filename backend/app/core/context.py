from contextvars import ContextVar, Token

correlation_id_ctx: ContextVar[str | None] = ContextVar("correlation_id", default=None)
user_id_ctx: ContextVar[str | None] = ContextVar("user_id", default=None)


def get_correlation_id() -> str | None:
    return correlation_id_ctx.get()


def set_correlation_id(value: str) -> Token[str | None]:
    return correlation_id_ctx.set(value)


def reset_correlation_id(token: Token[str | None]) -> None:
    correlation_id_ctx.reset(token)


def get_user_id() -> str | None:
    return user_id_ctx.get()


def set_user_id(value: str | None) -> Token[str | None]:
    return user_id_ctx.set(value)


def reset_user_id(token: Token[str | None]) -> None:
    user_id_ctx.reset(token)
