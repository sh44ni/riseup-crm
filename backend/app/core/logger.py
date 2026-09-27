"""
Centralized logging setup for Rise Up Roofing API.
All modules should use get_logger(__name__) instead of print().
"""
import logging
import sys


def setup_logging(level: str = "INFO") -> None:
    """Configure root logger with timestamp, level, and module name."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Call as: logger = get_logger(__name__)"""
    return logging.getLogger(name)
