#!/usr/bin/env python3
"""
Rise Up Roofing & Construction - Application Entrypoint & CLI Runner

Usage:
    python run.py                  # Start FastAPI server (default: host 0.0.0.0, port 8000, reload enabled)
    python run.py server           # Explicit server command
    python run.py worker           # Run ARQ async background task worker
    python run.py migrate          # Run Alembic database migrations (upgrade head)
    python run.py check            # Verify configuration and test database/redis connectivity

Options:
    --host <str>                   Bind socket to this host (default: from config or 0.0.0.0)
    --port <int>, -p <int>         Bind socket to this port (default: 8000)
    --reload / --no-reload         Toggle auto-reload (default: enabled in development)
    --workers <int>, -w <int>      Number of uvicorn worker processes (default: 1)
    --log-level <str>              Log level: debug, info, warning, error (default: info)
"""

import sys
import os
import argparse
import asyncio
from pathlib import Path

# Ensure backend root is in sys.path and is current working directory
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

try:
    from app.core.config import settings
except ImportError as e:
    print(f"[Error] Failed to import app settings: {e}")
    sys.exit(1)


def print_banner(host: str, port: int, reload: bool, workers: int):
    display_host = "localhost" if host in ("0.0.0.0", "127.0.0.1") else host
    base_url = f"http://{display_host}:{port}"
    
    banner = f"""
======================================================================
  Rise Up Roofing & Construction API & Developer Platform
======================================================================
  * Base URL:        {base_url}
  * Swagger Docs:    {base_url}/docs
  * ReDoc:           {base_url}/redoc
  * Developer UI:    {base_url}/developer
  * Health Endpoint: {base_url}/health
  ------------------------------------------------------------------
  * Environment:     {settings.APP_ENV}
  * Auto-reload:     {reload}
  * Worker Count:    {workers}
  * Bound Socket:    {host}:{port}
======================================================================
"""
    print(banner)


def run_server(host: str = None, port: int = None, reload: bool = None, workers: int = 1, log_level: str = "info"):
    import uvicorn

    host = host or getattr(settings, "HOST", "0.0.0.0")
    port = port or getattr(settings, "PORT", 8000)
    if reload is None:
        reload = settings.APP_ENV.lower() in ("development", "dev", "local")

    # If reload is enabled, workers must be 1 in uvicorn
    if reload:
        workers = 1

    print_banner(host, port, reload, workers)

    try:
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=reload,
            workers=workers,
            log_level=log_level.lower(),
            access_log=True,
        )
    except KeyboardInterrupt:
        print("\n[Rise Up Server] Shutting down gracefully...")


def run_worker():
    print("======================================================================")
    print("  Starting ARQ Async Background Task Worker...")
    print(f"  Redis URL: {settings.REDIS_URL}")
    print("======================================================================")
    
    try:
        from arq.worker import run_worker as arq_run_worker
        from app.tasks.worker import WorkerSettings
        arq_run_worker(WorkerSettings)
    except KeyboardInterrupt:
        print("\n[Rise Up Worker] Worker stopped gracefully.")
    except Exception as e:
        print(f"[Rise Up Worker Error] {e}")
        sys.exit(1)


def run_migrations(revision: str = "head"):
    print("======================================================================")
    print(f"  Running Alembic Database Migrations -> target: {revision}")
    print("======================================================================")
    try:
        import alembic.config
        import alembic.command

        alembic_cfg = alembic.config.Config(str(BACKEND_DIR / "alembic.ini"))
        alembic.command.upgrade(alembic_cfg, revision)
        print("[Rise Up Migrations] Migrations applied successfully!")
    except Exception as e:
        print(f"[Rise Up Migration Error] {e}")
        sys.exit(1)


async def check_health():
    print("======================================================================")
    print("  Checking Rise Up Roofing Backend Services & Connectivity...")
    print("======================================================================")
    
    # 1. Check Database
    db_status = "UNKNOWN"
    try:
        from app.core.database import engine
        from sqlalchemy import text
        
        async def _check_db():
            async with engine.connect() as conn:
                res = await conn.execute(text("SELECT 1"))
                return res.scalar() == 1

        is_ok = await asyncio.wait_for(_check_db(), timeout=4.0)
        if is_ok:
            db_status = "CONNECTED (PostgreSQL OK)"
        await engine.dispose()
    except asyncio.TimeoutError:
        db_status = "FAILED: Connection timed out after 4 seconds"
    except Exception as e:
        db_status = f"FAILED: {e}"

    # 2. Check Redis
    redis_status = "UNKNOWN"
    try:
        import redis.asyncio as aioredis
        
        async def _check_redis():
            r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            res = await r.ping()
            await r.aclose()
            return res

        ping_res = await asyncio.wait_for(_check_redis(), timeout=3.0)
        if ping_res:
            redis_status = "CONNECTED (Redis OK)"
    except asyncio.TimeoutError:
        redis_status = "FAILED: Connection timed out (is Redis running on localhost:6379?)"
    except Exception as e:
        redis_status = f"FAILED: {e}"

    print(f"  * Database:    {db_status}")
    print(f"  * Redis:       {redis_status}")
    print(f"  * Environment: {settings.APP_ENV}")
    print(f"  * S3 URL:      {settings.S3_ENDPOINT_URL}")
    print("======================================================================")


def main():
    parser = argparse.ArgumentParser(
        description="Rise Up Roofing FastAPI & Services CLI Runner",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # ── Server Command ──
    server_parser = subparsers.add_parser("server", help="Run the FastAPI Web Application Server")
    server_parser.add_argument("--host", type=str, default=getattr(settings, "HOST", "0.0.0.0"), help="Host IP to bind")
    server_parser.add_argument("-p", "--port", type=int, default=getattr(settings, "PORT", 8000), help="Port to bind")
    server_parser.add_argument("--reload", dest="reload", action="store_true", default=None, help="Enable auto-reload")
    server_parser.add_argument("--no-reload", dest="reload", action="store_false", help="Disable auto-reload")
    server_parser.add_argument("-w", "--workers", type=int, default=1, help="Number of workers (when reload=False)")
    server_parser.add_argument("--log-level", type=str, default="info", help="Log level (debug, info, warning, error)")

    # ── Worker Command ──
    subparsers.add_parser("worker", help="Run the ARQ Background Tasks Worker")

    # ── Migrate Command ──
    migrate_parser = subparsers.add_parser("migrate", help="Apply Alembic Database Migrations")
    migrate_parser.add_argument("--revision", type=str, default="head", help="Migration target revision (default: head)")

    # ── Check Command ──
    subparsers.add_parser("check", help="Test Database, Redis and configuration health")

    # Top-level direct flags for convenience: `python run.py --worker`, `python run.py --migrate`
    parser.add_argument("--host", type=str, default=getattr(settings, "HOST", "0.0.0.0"), help="Host IP to bind")
    parser.add_argument("-p", "--port", type=int, default=getattr(settings, "PORT", 8000), help="Port to bind")
    parser.add_argument("--reload", dest="reload", action="store_true", default=None, help="Enable auto-reload")
    parser.add_argument("--no-reload", dest="reload", action="store_false", help="Disable auto-reload")
    parser.add_argument("-w", "--workers", type=int, default=1, help="Number of workers")
    parser.add_argument("--log-level", type=str, default="info", help="Log level")
    parser.add_argument("--worker", action="store_true", help="Shortcut to start background task worker")
    parser.add_argument("--migrate", action="store_true", help="Shortcut to run alembic migrations")
    parser.add_argument("--check", action="store_true", help="Shortcut to check connectivity and settings")

    args = parser.parse_args()

    # Determine action
    if args.worker or args.command == "worker":
        run_worker()
    elif args.migrate or args.command == "migrate":
        rev = getattr(args, "revision", "head")
        run_migrations(rev)
    elif args.check or args.command == "check":
        asyncio.run(check_health())
    else:
        # Default action: run server
        run_server(
            host=args.host,
            port=args.port,
            reload=args.reload,
            workers=args.workers,
            log_level=args.log_level,
        )


if __name__ == "__main__":
    main()
