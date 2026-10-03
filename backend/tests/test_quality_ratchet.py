"""Unit tests for scripts/quality_ratchet.py (pure comparison/update logic)."""
import importlib.util
import json
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "quality_ratchet.py"
spec = importlib.util.spec_from_file_location("quality_ratchet", SCRIPT)
qr = importlib.util.module_from_spec(spec)
sys.modules["quality_ratchet"] = qr
spec.loader.exec_module(qr)


def statuses(baseline, current):
    return {r.name: r.status for r in qr.compare(baseline, current)}


def test_lower_is_better_metrics():
    result = statuses(
        {"fe.any_count": 10, "be.sql_in_api": 5, "fe.raw_fetch": 3},
        {"fe.any_count": 11, "be.sql_in_api": 4, "fe.raw_fetch": 3},
    )
    assert result == {"fe.any_count": "regressed", "be.sql_in_api": "improved", "fe.raw_fetch": "ok"}


def test_coverage_is_higher_is_better_with_tolerance():
    result = statuses(
        {"cov.backend": 50.0, "cov.frontend": 40.0},
        {"cov.backend": 49.5, "cov.frontend": 40.005},
    )
    assert result == {"cov.backend": "regressed", "cov.frontend": "ok"}
    assert statuses({"cov.backend": 50.0}, {"cov.backend": 60.0}) == {"cov.backend": "improved"}


def test_unmeasured_and_new_metrics_do_not_fail():
    result = statuses({"cov.backend": 50.0}, {"fe.any_count": 3, "cov.backend": None})
    assert result == {"cov.backend": "unmeasured", "fe.any_count": "new"}


def test_update_only_moves_in_improving_direction():
    new = qr.updated_baseline(
        {"fe.any_count": 10, "cov.backend": 50.0, "be.sql_in_api": 5},
        {"fe.any_count": 8, "cov.backend": 55.0, "be.sql_in_api": 5},
    )
    assert new == {"fe.any_count": 8, "cov.backend": 55.0, "be.sql_in_api": 5}


def test_update_refuses_when_anything_regressed_so_it_cannot_loosen_a_gate():
    with pytest.raises(ValueError, match="fe.any_count"):
        qr.updated_baseline({"fe.any_count": 10, "be.sql_in_api": 5}, {"fe.any_count": 11, "be.sql_in_api": 1})


def test_update_fills_metrics_that_were_never_measured():
    new = qr.updated_baseline({"fe.any_count": 10}, {"fe.any_count": 10, "cov.backend": 42.0})
    assert new["cov.backend"] == 42.0


def test_markdown_report_flags_failure():
    results = qr.compare({"fe.any_count": 1}, {"fe.any_count": 2})
    assert "FAILED" in qr.render_markdown(results)
    assert "passed" in qr.render_markdown(qr.compare({"fe.any_count": 1}, {"fe.any_count": 1}))


def test_baseline_roundtrip(tmp_path):
    path = tmp_path / "baseline.json"
    qr.save_baseline({"b": 2, "a": 1.5}, path)
    assert qr.load_baseline(path) == {"a": 1.5, "b": 2}
    assert list(json.loads(path.read_text())["metrics"]) == ["a", "b"]


def test_committed_baseline_is_valid_and_covers_deterministic_metrics():
    baseline = qr.load_baseline()
    for name in (
        "fe.any_count", "fe.raw_fetch", "fe.files_over_300", "fe.hex_colors",
        "be.except_exception", "be.sql_in_api", "be.files_over_400", "be.ruff_baseline_entries",
    ):
        assert isinstance(baseline.get(name), int | float), name


def test_regex_metrics_detect_expected_patterns():
    assert qr._ANY_RE.search("const x: any = 1")
    assert qr._ANY_RE.search("foo as any")
    assert qr._ANY_RE.search("items: any[]")
    assert not qr._ANY_RE.search("const company = 1")
    assert qr._FETCH_RE.search("await fetch('/x')")
    assert not qr._FETCH_RE.search("refetch()")
    assert not qr._FETCH_RE.search("api.fetch(x)")
    assert qr._EXCEPT_RE.search("    except Exception as e:")
    assert qr._EXCEPT_RE.search("except:")
    assert not qr._EXCEPT_RE.search("except ValueError:")
    assert qr._HEX_RE.search("bg-[#1a5ba5]")


def test_baseline_generator_helpers():
    spec2 = importlib.util.spec_from_file_location(
        "gen_ruff_baseline", Path(__file__).resolve().parents[1] / "scripts" / "gen_ruff_baseline.py"
    )
    gen = importlib.util.module_from_spec(spec2)
    spec2.loader.exec_module(gen)
    root = gen.BACKEND_DIR
    grouped = gen.group_violations(
        [
            {"filename": str(root / "app" / "a.py"), "code": "E501"},
            {"filename": str(root / "app" / "a.py"), "code": "B008"},
            {"filename": str(root / "app" / "a.py"), "code": "E501"},
            {"filename": str(root / "app" / "b.py"), "code": None},  # syntax error: never baselined
        ]
    )
    assert grouped == {"app/a.py": ["B008", "E501"]}
    rendered = gen.render_baseline(grouped)
    assert '"app/a.py" = ["B008", "E501"]' in rendered
    assert "[lint.extend-per-file-ignores]" in rendered
