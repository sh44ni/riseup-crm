"""Request-scoped "who is acting" context for the database activity log.

The activity-log triggers read transaction-local settings (``app.actor_*``) to learn who
made a change. This module owns setting them:

* ``set_actor`` stores the resolved actor in a ContextVar for the current request.
* ``bind_actor_to_session`` applies it to the *current* transaction (auth resolution has
  usually already begun one).
* an ``after_begin`` listener applies it to every later transaction in the same request.

Anything without an actor (workers, migrations, scripts) is recorded as ``system``.
"""
from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any, Dict, Optional

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

_ACTOR_SQL = text(
    "SELECT set_config('app.actor_type', :t, true), set_config('app.actor_user_id', :uid, true), "
    "set_config('app.actor_email', :email, true), set_config('app.actor_name', :name, true), "
    "set_config('app.actor_role', :role, true), set_config('app.actor_ip', :ip, true)"
)


@dataclass(frozen=True)
class ActorContext:
    actor_type: str  # 'user' | 'api_key'
    user_id: Optional[int]
    email: str
    name: str
    role: str
    ip: str

    def params(self) -> Dict[str, str]:
        return {
            "t": self.actor_type,
            "uid": "" if self.user_id is None else str(self.user_id),
            "email": self.email or "",
            "name": self.name or "",
            "role": self.role or "",
            "ip": self.ip or "",
        }


_current_actor: ContextVar[Optional[ActorContext]] = ContextVar("current_actor", default=None)


def actor_from_user(user: Any, ip: str = "") -> ActorContext:
    is_api_key = bool(getattr(user, "is_api_key", False)) or getattr(user, "kind", "user") == "api_key"
    return ActorContext(
        actor_type="api_key" if is_api_key else "user",
        user_id=None if is_api_key else getattr(user, "id", None),
        email=getattr(user, "email", "") or "",
        name=getattr(user, "name", "") or "",
        role=getattr(user, "role", "") or "",
        ip=ip,
    )


def set_actor(actor: Optional[ActorContext]) -> None:
    _current_actor.set(actor)


def get_actor() -> Optional[ActorContext]:
    return _current_actor.get()


async def bind_actor_to_session(db: AsyncSession, actor: ActorContext) -> None:
    """Apply the actor to the session's current (or next) transaction."""
    await db.execute(_ACTOR_SQL, actor.params())


@event.listens_for(Session, "after_begin")
def _apply_actor_on_begin(session: Session, transaction: Any, connection: Any) -> None:  # noqa: ARG001
    actor = _current_actor.get()
    if actor is not None:
        connection.execute(_ACTOR_SQL, actor.params())
