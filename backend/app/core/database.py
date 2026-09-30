import re
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Base class for SQLAlchemy declarative models
Base = declarative_base()

def get_database_url() -> str:
    url = settings.DATABASE_URL
    # Ensure scheme is postgresql+asyncpg://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Strip parameters that asyncpg doesn't accept directly in query string
    url = re.sub(r'[?&]channel_binding=[^&]+', '', url)
    return url

# Clean SSL config for asyncpg
connect_args = {}
if "sslmode=require" in settings.DATABASE_URL or "ssl=require" in settings.DATABASE_URL:
    connect_args["ssl"] = "require"

engine = create_async_engine(
    get_database_url(),
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=settings.DB_POOL_PRE_PING,
    pool_recycle=3600,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    connect_args=connect_args,
    echo=False,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an async database session per request.
    Rolls back automatically on exception, commits on successful handler exit.
    """
    async with async_session_factory() as session:
        try:
            yield session
            if session.is_active:
                await session.commit()
        except Exception:
            if session.is_active:
                await session.rollback()
            raise
        finally:
            await session.close()
