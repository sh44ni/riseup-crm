.PHONY: sync lint format typecheck arch test ci requirements-check ratchet

PY ?= uv run

sync:
	uv sync --frozen

lint:
	$(PY) ruff check app
	$(PY) ruff format --check app

format:
	$(PY) ruff format app

typecheck:
	$(PY) mypy app

arch:
	$(PY) lint-imports

test:
	$(PY) pytest -n auto --cov=app --cov-report=term-missing

# Fails if requirements.txt (used by the Dockerfile) drifts from uv.lock.
requirements-check:
	uv export --no-dev --frozen --no-hashes --no-emit-project -o requirements.txt
	git diff --exit-code -- requirements.txt

test-db-up:
	docker compose -f docker-compose.test.yml up -d --wait

test-db-down:
	docker compose -f docker-compose.test.yml down -v

ci: lint typecheck arch requirements-check test
