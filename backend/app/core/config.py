from typing import Any, Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)

    # -----------------------------------------------------------------------
    # Core Application & Routing
    # -----------------------------------------------------------------------
    ENVIRONMENT: Literal["dev", "test", "prod"] = Field(...)
    APP_NAME: str = "Feedback System"
    FRONTEND_URL: str = Field(...)
    PUBLIC_FEEDBACK_URL: str = Field(...)
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: Literal["console", "json"] = "console"
    CORS_ORIGINS: list[str] = Field(...)

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "prod"

    # -----------------------------------------------------------------------
    # Database (PostgreSQL 16 via asyncpg)
    # -----------------------------------------------------------------------
    DATABASE_URL: str = Field(...)
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 5
    DB_POOL_TIMEOUT: int = 30
    DB_ECHO: bool = False

    # -----------------------------------------------------------------------
    # Redis (Taskiq Broker & Session/Permission Cache)
    # -----------------------------------------------------------------------
    REDIS_URL: str = Field(...)

    # -----------------------------------------------------------------------
    # Authentication & Cryptographic Security
    # -----------------------------------------------------------------------
    JWT_SECRET_KEY: str = Field(...)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_TTL_MINUTES: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 7
    EMAIL_VERIFY_TOKEN_TTL_HOURS: int = 24
    PASSWORD_RESET_TOKEN_TTL_MINUTES: int = 30
    WORKSPACE_INVITE_TOKEN_TTL_DAYS: int = 7
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_MAX_LENGTH: int = 128

    # -----------------------------------------------------------------------
    # Email / Transactional SMTP Delivery
    # -----------------------------------------------------------------------
    SMTP_HOST: str = Field(...)
    SMTP_PORT: int = Field(...)
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_TLS: bool = False
    EMAILS_FROM_EMAIL: str = Field(...)
    EMAILS_FROM_NAME: str = Field(...)

    # -----------------------------------------------------------------------
    # AI & LLM Service Configuration (Abstract Factory Layer)
    # -----------------------------------------------------------------------
    LLM_PROVIDER: Literal["gemini", "openai", "mock"] = "mock"
    GEMINI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    LLM_MODEL: str = "gemini-1.5-flash"
    LLM_TEMPERATURE: float = 0.2
    LLM_MAX_OUTPUT_TOKENS: int = 1024

    # -----------------------------------------------------------------------
    # Rate Limiting & Abuse Prevention
    # -----------------------------------------------------------------------
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60

    # -----------------------------------------------------------------------
    # Billing & Subscriptions (Stripe / Paddle)
    # -----------------------------------------------------------------------
    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None

    # -----------------------------------------------------------------------
    # Database Encryption at Rest (Field-Level / Envelope Encryption)
    # -----------------------------------------------------------------------
    FIELD_ENCRYPTION_KEY: str | None = None
    FIELD_ENCRYPTION_ROTATION_KEYS: list[str] = Field(default_factory=list)

    # -----------------------------------------------------------------------
    # Slack OAuth v2 & Outbound Notifications
    # -----------------------------------------------------------------------
    SLACK_CLIENT_ID: str = ""
    SLACK_CLIENT_SECRET: str = ""
    SLACK_REDIRECT_URI: str = "http://localhost:3000/integrations/slack/callback"

    @property
    def SECRET_KEY(self) -> str:
        return self.JWT_SECRET_KEY

    @property
    def master_encryption_key(self) -> str:
        return self.FIELD_ENCRYPTION_KEY or self.JWT_SECRET_KEY


settings = Settings()
