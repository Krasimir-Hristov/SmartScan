"""Application settings and environment configuration."""

from pydantic import Field
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

    # Supabase credentials
    SUPABASE_URL: str = Field(default="")
    SUPABASE_PUBLISHABLE_KEY: str = Field(default="")
    SUPABASE_SECRET_KEY: str = Field(default="")
    SUPABASE_JWKS_URL: str = Field(default="")

    # OpenRouter LLM credentials
    OPENROUTER_API_KEY: str = Field(default="")
    OPENROUTER_MODEL: str = Field(default="google/gemini-2.5-flash")

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()
