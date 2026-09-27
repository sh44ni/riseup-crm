import pytest

class TestSQLParameterization:
    """Verify date filters use bindparams, never f-string injection."""

    def test_date_filter_returns_tuple_not_string(self):
        from app.api.admin.reports import _get_date_filters
        result = _get_date_filters("2026-01-01", "2026-12-31")
        # Must return a tuple (clause, params)
        assert isinstance(result, tuple)
        assert len(result) == 2
        clause, params = result
        assert isinstance(clause, str)
        assert isinstance(params, dict)

    def test_date_filter_user_dates_in_params_not_clause(self):
        from app.api.admin.reports import _get_date_filters
        clause, params = _get_date_filters("2026-01-01", "2026-12-31")
        # The actual date strings must NOT appear in the SQL clause
        assert "2026-01-01" not in clause
        assert "2026-12-31" not in clause
        # The dates must be in the params dict
        assert params.get("filter_from") == "2026-01-01"
        assert "filter_to" in params

    def test_date_filter_sql_injection_attempt_rejected(self):
        from app.api.admin.reports import _get_date_filters
        malicious = "'; DROP TABLE leads; --"
        clause, params = _get_date_filters(malicious, "2026-12-31")
        # Injection string must not be in the SQL clause
        assert "DROP" not in clause
        assert "SELECT" not in clause
        # Invalid date format should not be added to params
        assert "filter_from" not in params

    def test_date_filter_none_values_return_passthrough(self):
        from app.api.admin.reports import _get_date_filters
        clause, params = _get_date_filters(None, None)
        assert clause == "1=1"
        assert params == {}

    def test_date_filter_only_from_date(self):
        from app.api.admin.reports import _get_date_filters
        clause, params = _get_date_filters("2026-01-01", None)
        assert "filter_from" in params
        assert "filter_to" not in params

    def test_date_filter_only_to_date(self):
        from app.api.admin.reports import _get_date_filters
        clause, params = _get_date_filters(None, "2026-12-31")
        assert "filter_to" in params
        assert "filter_from" not in params
