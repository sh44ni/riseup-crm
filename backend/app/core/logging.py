from __future__ import annotations

import contextvars
import logging
import sys
from typing import Any, cast
import structlog

# Context variables for tracing across async execution flows
request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)
user_id_ctx: contextvars.ContextVar[int | None] = contextvars.ContextVar(
    "user_id", default=None
)


def add_request_context(_: Any, __: str, event_dict: dict[str, Any]) -> dict[str, Any]:
    req_id = request_id_ctx.get()
    if req_id:
        event_dict["request_id"] = req_id
    u_id = user_id_ctx.get()
    if u_id:
        event_dict["user_id"] = u_id
    return event_dict


def setup_logging(level: str = "INFO", json_format: bool = False) -> None:
    log_level = getattr(logging, level.upper(), logging.INFO)

    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        add_request_context,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    renderer: Any = (
        structlog.processors.JSONRenderer()
        if json_format
        else structlog.dev.ConsoleRenderer()
    )

    structlog.configure(
        processors=shared_processors
        + [
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.format_exc_info,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(log_level)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    return cast(structlog.stdlib.BoundLogger, structlog.get_logger(name))
