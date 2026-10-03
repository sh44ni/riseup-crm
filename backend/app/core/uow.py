from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, AsyncSessionTransaction

from app.core.database import async_session_factory, get_db
from app.core.errors import DomainError
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError


class UnitOfWork:
    """
    Manages transaction boundaries for a single business operation or request.

    Architecture rules:
    - Repositories perform SQL queries via `uow.session`.
    - Repositories MUST NEVER call `session.commit()` or `session.rollback()`.
    - The Service layer or transaction coordinator invokes `commit()` explicitly.
    - An `AsyncSession` is NOT thread-safe and NOT safe for concurrent coroutines.
      Never pass the same `uow` or `session` into `asyncio.gather`.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self._committed = False

    async def commit(self) -> None:
        """Explicitly commits the current transaction."""
        if self.session.is_active:
            await self.session.commit()
            self._committed = True

    async def rollback(self) -> None:
        """Rolls back the current transaction."""
        if self.session.is_active:
            await self.session.rollback()

    @asynccontextmanager
    async def begin_nested(self) -> AsyncGenerator[AsyncSessionTransaction, None]:
        """Creates a savepoint transaction for atomic nested error recovery."""
        async with self.session.begin_nested() as savepoint:
            yield savepoint


async def get_uow(
    session: AsyncSession = Depends(get_db),
) -> AsyncGenerator[UnitOfWork, None]:
    """FastAPI dependency yielding a request-scoped UnitOfWork."""
    yield UnitOfWork(session)


@asynccontextmanager
async def uow_scope(session_factory: Any = None) -> AsyncGenerator[UnitOfWork, None]:
    """Context manager providing an independent UnitOfWork with its own AsyncSession."""
    factory = session_factory or async_session_factory
    async with factory() as session:
        uow = UnitOfWork(session)
        try:
            yield uow
            if not uow._committed and session.is_active:
                await uow.commit()
        except (SQLAlchemyError, DomainError, HTTPException, ValueError, RuntimeError, OSError):
            if session.is_active:
                await uow.rollback()
            raise
        finally:
            await session.close()
