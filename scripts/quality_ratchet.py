#!/usr/bin/env python3
"""Quality ratchet: fail if any tracked quality metric gets worse.

Metrics are deterministic counts computed from the working tree (plus optional tool reports for
the metrics that need an external tool). ``quality-baseline.json`` holds the accepted values.

    python scripts/quality_ratchet.py                  # compare, print table, exit 1 on regression
    python scripts/quality_ratchet.py --update         # lower the baseline where metrics improved
    python scripts/quality_ratchet.py --markdown out.md --eslint-json eslint.json \
        --knip-json knip.json --backend-coverage backend/coverage.xml \
        --frontend-coverage crm/coverage/coverage-summary.json

``--update`` can never loosen a gate: it only ever moves a baseline in the improving direction,
and it refuses to run while any metric is regressed.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE_PATH = ROOT / "quality-baseline.json"
BACKEND_APP = ROOT / "backend" / "app"
CRM_SRC = ROOT / "crm" / "src"

SKIP_DIRS = {"node_modules", "__pycache__", ".venv", "venv", "dist", "coverage", "scratch", ".git", "generated"}
COVERAGE_TOLERANCE = 0.01

# Direction: "lower" is better unless listed here.
HIGHER_IS_BETTER = {"cov.backend", "cov.frontend"}

METRIC_DESCRIPTIONS = {
    "fe.any_count": "explicit `any` in crm/src (non-test)",
    "fe.raw_fetch": "raw fetch( outside the HTTP client (lib/api.ts)",
    "fe.files_over_300": "crm/src files over 300 lines",
    "fe.hex_colors": "hard-coded [#hex] colours in crm/src",
    "fe.unused_exports": "knip unused exports/files",
    "fe.eslint_warnings": "ESLint warnings + errors",
    "fe.axe_serious_critical": "serious + critical axe a11y violations in crm/axe-baseline.json",
    "be.except_exception": "`except Exception` / bare `except` in backend/app",
    "be.sql_in_api": "text( and execute( calls in backend/app/api",
    "be.files_over_400": "backend/app files over 400 lines",
    "be.routes_without_response_model": "routes without a response_model",
    "be.ruff_baseline_entries": "(file, rule) pairs in ruff-baseline.toml",
    "be.authz_xfails": "IDOR / authz strict-xfails in tests/test_authz_matrix.py",
    "cov.backend": "backend line coverage %",
    "cov.frontend": "frontend line coverage %",
}

_ANY_RE = re.compile(r":\s*any\b|\bas\s+any\b|<any[,>\s]|\bany\[\]|Record<[^>]*,\s*any>")
_FETCH_RE = re.compile(r"(?<![\w.])fetch\(")
_HEX_RE = re.compile(r"\[#[0-9A-Fa-f]{3,8}\]")
_EXCEPT_RE = re.compile(r"^\s*except\s*(?:Exception\b|BaseException\b|:)", re.MULTILINE)


# ── file helpers ────────────────────────────────────────────────────────────
def iter_files(base: Path, suffixes: tuple[str, ...]):
    if not base.exists():
        return
    for path in sorted(base.rglob("*")):
        if path.is_file() and path.suffix in suffixes and not (SKIP_DIRS & set(path.parts)):
            yield path


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def is_test_file(path: Path) -> bool:
    name = path.name
    return (
        ".test." in name
        or ".spec." in name
        or "__tests__" in path.parts
        or "test" in path.relative_to(CRM_SRC).parts[:1]
    )


def fe_sources() -> list[Path]:
    return [p for p in iter_files(CRM_SRC, (".ts", ".tsx")) if not is_test_file(p)]


# ── metric computations ─────────────────────────────────────────────────────
def count_fe_any() -> int:
    return sum(len(_ANY_RE.findall(read(p))) for p in fe_sources())


def count_fe_raw_fetch() -> int:
    client = CRM_SRC / "lib" / "api.ts"
    total = 0
    for p in fe_sources():
        if p == client or "shared" in p.parts and "api" in p.parts:
            continue
        total += len(_FETCH_RE.findall(read(p)))
    return total


def count_fe_files_over_300() -> int:
    return sum(1 for p in fe_sources() if len(read(p).splitlines()) > 300)


def count_fe_hex_colors() -> int:
    return sum(len(_HEX_RE.findall(read(p))) for p in fe_sources())


def count_fe_axe_serious_critical() -> int | None:
    path = ROOT / "crm" / "axe-baseline.json"
    if not path.exists():
        return None
    try:
        data = json.loads(read(path))
        return int(data.get("total_serious_critical_violations", 0))
    except Exception:
        return None


def count_be_except_exception() -> int:
    return sum(len(_EXCEPT_RE.findall(read(p))) for p in iter_files(BACKEND_APP, (".py",)))


def count_be_sql_in_api() -> int:
    pattern = re.compile(r"(?<![\w.])text\(|\.execute\(")
    return sum(len(pattern.findall(read(p))) for p in iter_files(BACKEND_APP / "api", (".py",)))


def count_be_files_over_400() -> int:
    return sum(1 for p in iter_files(BACKEND_APP, (".py",)) if len(read(p).splitlines()) > 400)


_ROUTES_SNIPPET = (
    "import json\n"
    "from fastapi.routing import APIRoute\n"
    "from app.main import app\n"
    "print(json.dumps(sum(1 for r in app.routes "
    "if isinstance(r, APIRoute) and r.response_model is None)))\n"
)


def count_be_routes_without_response_model() -> int:
    proc = subprocess.run(  # noqa: S603
        [sys.executable, "-c", _ROUTES_SNIPPET],
        cwd=ROOT / "backend",
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise SystemExit(f"could not introspect routes:\n{proc.stderr[-2000:]}")
    return int(json.loads(proc.stdout.strip().splitlines()[-1]))


def count_ruff_baseline_entries() -> int:
    import tomllib

    path = ROOT / "backend" / "ruff-baseline.toml"
    if not path.exists():
        return 0
    data = tomllib.loads(read(path))
    table = data.get("lint", {}).get("extend-per-file-ignores", {})
    return sum(len(codes) for codes in table.values())


def parse_eslint_json(path: Path) -> int:
    reports = json.loads(read(path))
    return sum(r.get("warningCount", 0) + r.get("errorCount", 0) for r in reports)


def parse_knip_json(path: Path) -> int:
    data = json.loads(read(path))
    total = len(data.get("files", []))
    for issue in data.get("issues", []):
        for key, items in issue.items():
            if key != "file" and isinstance(items, list):
                total += len(items)
    return total


def parse_backend_coverage(path: Path) -> float:
    return round(float(ET.parse(path).getroot().attrib["line-rate"]) * 100, 2)


def parse_frontend_coverage(path: Path) -> float:
    return round(float(json.loads(read(path))["total"]["lines"]["pct"]), 2)


def count_be_authz_xfails() -> int:
    path = ROOT / "backend" / "tests" / "test_authz_matrix.py"
    if not path.exists():
        return 0
    return len(re.findall(r"@pytest\.mark\.xfail", read(path)))


def compute_metrics(args: argparse.Namespace) -> dict[str, float | None]:
    metrics: dict[str, float | None] = {
        "fe.any_count": count_fe_any(),
        "fe.raw_fetch": count_fe_raw_fetch(),
        "fe.files_over_300": count_fe_files_over_300(),
        "fe.hex_colors": count_fe_hex_colors(),
        "fe.unused_exports": parse_knip_json(args.knip_json) if args.knip_json else None,
        "fe.eslint_warnings": parse_eslint_json(args.eslint_json) if args.eslint_json else None,
        "fe.axe_serious_critical": count_fe_axe_serious_critical(),
        "be.except_exception": count_be_except_exception(),
        "be.sql_in_api": count_be_sql_in_api(),
        "be.files_over_400": count_be_files_over_400(),
        "be.routes_without_response_model": (
            None if args.skip_routes else count_be_routes_without_response_model()
        ),
        "be.ruff_baseline_entries": count_ruff_baseline_entries(),
        "be.authz_xfails": count_be_authz_xfails(),
        "cov.backend": parse_backend_coverage(args.backend_coverage) if args.backend_coverage else None,
        "cov.frontend": parse_frontend_coverage(args.frontend_coverage) if args.frontend_coverage else None,
    }
    return metrics


# ── comparison logic (pure; unit-tested) ────────────────────────────────────
@dataclass(frozen=True)
class Result:
    name: str
    baseline: float | None
    current: float | None
    status: str  # "ok" | "improved" | "regressed" | "unmeasured" | "new"


def is_worse(name: str, baseline: float, current: float) -> bool:
    if name in HIGHER_IS_BETTER:
        return current < baseline - COVERAGE_TOLERANCE
    return current > baseline


def is_better(name: str, baseline: float, current: float) -> bool:
    if name in HIGHER_IS_BETTER:
        return current > baseline + COVERAGE_TOLERANCE
    return current < baseline


def compare(baseline: dict[str, float | None], current: dict[str, float | None]) -> list[Result]:
    results = []
    for name in sorted(set(baseline) | set(current)):
        base, cur = baseline.get(name), current.get(name)
        if cur is None:
            status = "unmeasured"
        elif base is None:
            status = "new"
        elif is_worse(name, base, cur):
            status = "regressed"
        elif is_better(name, base, cur):
            status = "improved"
        else:
            status = "ok"
        results.append(Result(name, base, cur, status))
    return results


def updated_baseline(
    baseline: dict[str, float | None], current: dict[str, float | None]
) -> dict[str, float | None]:
    """Move baselines only in the improving direction; fill values that were never measured."""
    new = dict(baseline)
    for r in compare(baseline, current):
        if r.status == "regressed":
            raise ValueError(f"refusing to update: {r.name} regressed ({r.baseline} -> {r.current})")
        if r.status in ("improved", "new") and r.current is not None:
            new[r.name] = r.current
    return new


# ── output ──────────────────────────────────────────────────────────────────
ICONS = {"ok": "=", "improved": "improved", "regressed": "REGRESSED", "unmeasured": "n/a", "new": "new"}


def fmt(value: float | None) -> str:
    if value is None:
        return "-"
    return str(int(value)) if float(value).is_integer() else f"{value:.2f}"


def render_table(results: list[Result]) -> str:
    width = max(len(r.name) for r in results)
    lines = [f"{'metric'.ljust(width)}  baseline  current  status"]
    for r in results:
        lines.append(f"{r.name.ljust(width)}  {fmt(r.baseline):>8}  {fmt(r.current):>7}  {ICONS[r.status]}")
    return "\n".join(lines)


def render_markdown(results: list[Result]) -> str:
    rows = ["| Metric | Baseline | Current | Status |", "|---|---:|---:|---|"]
    for r in results:
        desc = METRIC_DESCRIPTIONS.get(r.name, "")
        rows.append(f"| `{r.name}` {desc} | {fmt(r.baseline)} | {fmt(r.current)} | {ICONS[r.status]} |")
    verdict = "FAILED: a metric regressed" if any(r.status == "regressed" for r in results) else "passed"
    return f"### Quality ratchet: {verdict}\n\n" + "\n".join(rows) + "\n"


def load_baseline(path: Path = BASELINE_PATH) -> dict[str, float | None]:
    if not path.exists():
        return {}
    return json.loads(read(path)).get("metrics", {})


def save_baseline(metrics: dict[str, float | None], path: Path = BASELINE_PATH) -> None:
    payload = {
        "_comment": "Ratchet baseline. Values may only improve. See scripts/quality_ratchet.py.",
        "metrics": dict(sorted(metrics.items())),
    }
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--update", action="store_true", help="lower the baseline where metrics improved")
    p.add_argument("--markdown", type=Path, help="write a markdown report (for PR comments)")
    p.add_argument("--eslint-json", type=Path)
    p.add_argument("--knip-json", type=Path)
    p.add_argument("--backend-coverage", type=Path)
    p.add_argument("--frontend-coverage", type=Path)
    p.add_argument("--skip-routes", action="store_true", help="skip the (slow) route introspection")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    baseline = load_baseline()
    current = compute_metrics(args)
    results = compare(baseline, current)

    print(render_table(results))
    if args.markdown:
        args.markdown.write_text(render_markdown(results), encoding="utf-8")

    if args.update:
        try:
            save_baseline(updated_baseline(baseline, current))
        except ValueError as exc:
            print(f"\n{exc}", file=sys.stderr)
            return 1
        print("\nbaseline updated (improvements only)")
        return 0

    if any(r.status == "regressed" for r in results):
        print("\nRatchet FAILED: fix the regression (do not raise the baseline).", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
