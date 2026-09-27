from typing import List, Union
from pydantic import AnyHttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


import os

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
    APP_ENV: str = "development"
    APP_NAME: str = "Rise Up Roofing API & Developer Platform"
    DEBUG: bool = True
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

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Fail fast in production if critical secrets are missing or default."""
        env = (self.ENVIRONMENT or self.APP_ENV or "").lower()
        if env not in ("production", "prod"):
            return self
        
        KNOWN_BAD_SECRETS = {
            "riseup-super-secret-key-change-in-production-64-chars-long!",
            "riseup_migrate_secret_2025",
            "sheWASg0n3forgood",
            "riseup_cron_sec_88f92a10e",
            "ec61cfb5c3ab44b6b3c184755261209",
            "",
        }
        
        checks = {
            "SESSION_SECRET_KEY": self.SESSION_SECRET_KEY,
            "MIGRATION_KEY": self.MIGRATION_KEY,
            "CRON_SECRET": self.CRON_SECRET,
        }
        
        for name, value in checks.items():
            if value in KNOWN_BAD_SECRETS:
                raise ValueError(
                    f"CRITICAL: {name} is not set or uses a default/known-bad value. "
                    f"Set a strong secret in your production .env file."
                )
        
        return self


settings = Settings()
