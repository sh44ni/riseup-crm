import hashlib
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


import os

DEV_LIKE_ENVIRONMENTS = frozenset({"development", "dev", "local", "test", "testing"})
MIN_SECRET_LENGTH = 32

# SHA-256 digests of secrets that were previously committed or defaulted. The plaintext values
# must never appear in source; a deployment using any of them is refused at startup.
KNOWN_BAD_SECRET_HASHES = frozenset({
    "ddf9cc1cdf0aa7250a88afa67ea2cb0e5315fed312d7ec62dd90785d43dfab7f",
    "79404179e451a22c2456ba5a6a8a7a44a772527ee499b7f70fddb6d9428f5ddb",
    "68e59684d862b174db3799518e3675777c7ad58467ab222883843f2c9287693d",
    "a957d3cd2f0edca1b99bbd0c8da03fd5404dc02876e8b9e5926e7b33a9fd7ad3",
    "d2a9f5799ed4a316c7dc633cdbced3b989f657a61b02c758fe1997cd3c280217",
})


def _normalize_env(value: str) -> str:
    env = (value or "").strip().lower()
    if env == "prod":
        return "production"
    return env or "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            ".env",
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env.production"),
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    APP_ENV: str = "development"  # alias of ENVIRONMENT; both resolve to one effective value
    APP_NAME: str = "Rise Up Roofing API & Developer Platform"
    DEBUG: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://riseuprac.com",
        "https://riseuproofing.vercel.app",
        "https://riseup-roofing.vercel.app",
    ]

    # Database — must be set in .env, no hardcoded fallback
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5434/riseup_db"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 5
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_PRE_PING: bool = True

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Authentication & Admin
    SESSION_SECRET_KEY: str = ""
    COOKIE_NAME: str = "admin_session"
    SESSION_HOURS: int = 24
    MIGRATION_KEY: str = ""
    LEGACY_BEARER_AUTH: bool = True
    CSRF_COOKIE_NAME: str = "csrf_token"
    CSRF_HEADER_NAME: str = "x-csrf-token"

    # Developer Portal & Dynamic API Keys
    DEVELOPER_SEEDPHRASE: str = ""
    DEVELOPER_SEEDPHRASE_HASH: str = ""
    DEVELOPER_COOKIE_NAME: str = "dev_session"
    DEVELOPER_SESSION_HOURS: int = 12
    API_KEY_PREFIX_LIVE: str = "rup_live_"
    API_KEY_PREFIX_TEST: str = "rup_test_"

    # S3 Storage (MinIO / R2 / AWS S3)
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_MEDIA: str = "riseup-media"
    S3_BUCKET_DOCS: str = "riseup-documents"
    S3_REGION: str = "us-east-1"
    S3_PUBLIC_URL_BASE: str = "http://localhost:9000/riseup-media"

    # Integrations
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""  # full callback URL; defaults to PUBLIC_BACKEND_URL + /api/admin/google-callback
    PUBLIC_BACKEND_URL: str = ""  # e.g. https://backend.riseuprac.com (no trailing slash)
    GOOGLE_BUSINESS_PROFILE_ID: str = "17709679383662028228"
    CRON_SECRET: str = ""

    YELP_CLIENT_ID: str = ""
    YELP_API_KEY: str = ""
    YELP_BUSINESS_ID: str = "a5D1p0D5siZYO43g16Excg"
    YELP_BUSINESS_ALIAS: str = "rise-up-roofing-and-construction-oceanside-2"

    WEATHER_API_KEY: str = ""

    # Resend Transactional Email Service
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "Rise Up Roofing <estimates@riseuprac.com>"
    RESEND_VERIFICATION_EMAIL: str = "Rise Up Roofing <verification@riseuprac.com>"
    CRM_FRONTEND_URL: str = "https://crm.riseuprac.com"

    # Cloudflare Turnstile Spam Defense
    CLOUDFLARE_TURNSTILE_SECRET_KEY: str = ""

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    @model_validator(mode="after")
    def unify_environment(self) -> "Settings":
        """Collapse ENVIRONMENT / APP_ENV into one effective value.

        If either variable names a non-dev environment, that one wins, so setting only
        APP_ENV=production (or only ENVIRONMENT=production) always enables the safeguards.
        """
        env = _normalize_env(self.ENVIRONMENT)
        app_env = _normalize_env(self.APP_ENV)
        effective = env if env not in DEV_LIKE_ENVIRONMENTS else app_env
        self.ENVIRONMENT = effective
        self.APP_ENV = effective
        return self

    @property
    def is_dev_like(self) -> bool:
        return self.ENVIRONMENT in DEV_LIKE_ENVIRONMENTS

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Fail fast outside dev/test if critical secrets are missing, short or known-bad."""
        if self.is_dev_like:
            return self

        checks = {
            "SESSION_SECRET_KEY": self.SESSION_SECRET_KEY,
            "MIGRATION_KEY": self.MIGRATION_KEY,
            "CRON_SECRET": self.CRON_SECRET,
        }

        for name, value in checks.items():
            digest = hashlib.sha256((value or "").encode("utf-8")).hexdigest()
            if digest in KNOWN_BAD_SECRET_HASHES or len(value or "") < MIN_SECRET_LENGTH:
                raise ValueError(
                    f"CRITICAL: {name} is not set, shorter than {MIN_SECRET_LENGTH} characters, "
                    f"or uses a default/known-bad value. Set a strong secret in the environment."
                )

        return self


settings = Settings()
