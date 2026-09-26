"""Application settings and environment configuration."""

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = Field(default="development")
    PORT: int = Field(default=8000)
    ALLOWED_ORIGINS: str = Field(default="http://localhost:3000")

    # Shared secret injected by the Next.js proxy (proxy.ts) into x-internal-auth.
    # The backend trusts forwarded client IPs only when this secret matches.
    BACKEND_PROXY_SECRET: str = Field(default="")

    @model_validator(mode="after")
    def _require_proxy_secret_in_production(self) -> "Settings":
        """Fail fast: without the proxy secret, production rate limiting degrades
        to a single shared bucket (all guests behind one server IP)."""
        if self.ENVIRONMENT.strip().lower() == "production":
            if not self.BACKEND_PROXY_SECRET.strip():
                raise ValueError(
                    "BACKEND_PROXY_SECRET must be set when ENVIRONMENT is 'production'."
                )
            missing = []
            if not self.STRIPE_SECRET_KEY.strip():
                missing.append("STRIPE_SECRET_KEY")
            if not self.STRIPE_WEBHOOK_SECRET.strip():
                missing.append("STRIPE_WEBHOOK_SECRET")
            if not self.STRIPE_PRICE_ID_STAY.strip():
                missing.append("STRIPE_PRICE_ID_STAY")
            if missing:
                raise ValueError(
                    f"Missing required Stripe settings in production: {', '.join(missing)}"
                )
        return self

    # Supabase credentials
    SUPABASE_URL: str = Field(default="")
    SUPABASE_PUBLISHABLE_KEY: str = Field(default="")
    SUPABASE_SECRET_KEY: str = Field(default="")
    SUPABASE_JWKS_URL: str = Field(default="")

    # OpenRouter LLM & Embedding credentials
    OPENROUTER_API_KEY: str = Field(default="")
    OPENROUTER_MODEL: str = Field(default="google/gemini-2.5-flash")
    OPENROUTER_EMBEDDING_MODEL: str = Field(default="openai/text-embedding-3-small")
    EMBEDDING_DIMENSIONS: int = Field(default=1536)

    # Frontend URL (for Stripe redirects)
    FRONTEND_URL: str = Field(default="http://localhost:3000")

    # Stripe
    STRIPE_SECRET_KEY: str = Field(default="")
    STRIPE_WEBHOOK_SECRET: str = Field(default="")
    STRIPE_PRICE_ID_STAY: str = Field(default="")

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()
