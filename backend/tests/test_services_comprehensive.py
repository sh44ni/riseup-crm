import pytest
from datetime import datetime, timezone, timedelta
from app.services.calculator import (
    calculate_roof_estimate, calculate_lead_estimated_value,
    resolve_service_slug, ROOFING_MATERIALS, PITCH_MULTIPLIERS
)
from app.services.scoring import calculate_lead_score
from app.services.sla import evaluate_lead_sla
from app.services.estimate_caps import format_price, validate_field_cap, validate_estimate_data

class TestCalculatorAllMaterials:
    def test_all_five_materials_calculate_correctly(self):
        """Every material ID returns correct materialCostPerSq × squares."""
        cases = [
            ("oc_duration", 175),
            ("eagle_tile", 260),
            ("clay_tile", 395),
            ("tpo_commercial", 210),
            ("standing_seam", 430),
        ]
        for mat_id, cost_per_sq in cases:
            result = calculate_roof_estimate({"roof_squares": 10, "material_id": mat_id, "tearoff_layers": 0})
            assert result["material_subtotal"] == 10 * cost_per_sq, f"Failed for {mat_id}"

    def test_camelcase_aliases_produce_identical_results(self):
        r1 = calculate_roof_estimate({"roof_squares": 20, "material_id": "oc_duration", "tearoff_layers": 0})
        r2 = calculate_roof_estimate({"roofSquares": 20, "materialId": "oc_duration", "tearoff_layers": 0})
        assert r1["total_price"] == r2["total_price"]
        assert r1["labor_subtotal"] == r2["labor_subtotal"]

    def test_unknown_material_fallback_to_oc_duration(self):
        result = calculate_roof_estimate({"roof_squares": 10, "material_id": "nonexistent_xyz"})
        assert result["material"]["id"] == "oc_duration"

    def test_all_pitch_multipliers_applied_correctly(self):
        """Each pitch key produces its documented multiplier on labor."""
        from app.services.calculator import PITCH_MULTIPLIERS
        base_labor_per_sq = 225  # oc_duration
        for pitch, mult in PITCH_MULTIPLIERS.items():
            result = calculate_roof_estimate({
                "roof_squares": 10, "material_id": "oc_duration",
                "pitch": pitch, "stories": 1, "tearoff_layers": 0,
            })
            expected = round(10 * base_labor_per_sq * mult)
            assert result["labor_subtotal"] == expected, f"Pitch {pitch} failed"

    def test_unknown_pitch_defaults_to_1_0_multiplier(self):
        result = calculate_roof_estimate({"roof_squares": 10, "pitch": "999:12", "tearoff_layers": 0})
        expected = round(10 * 225 * 1.0)
        assert result["labor_subtotal"] == expected

    def test_margin_clamped_to_5_percent_minimum(self):
        result = calculate_roof_estimate({"roof_squares": 10, "tearoff_layers": 0, "margin_pct": 0})
        cost = result["cost_subtotal"]
        # At 5% margin: price = cost / 0.95
        assert result["total_price"] == round(cost / 0.95)

    def test_margin_clamped_to_60_percent_maximum(self):
        result = calculate_roof_estimate({"roof_squares": 10, "tearoff_layers": 0, "margin_pct": 99})
        cost = result["cost_subtotal"]
        # At 60% margin: price = cost / 0.40
        assert result["total_price"] == round(cost / 0.40)

    def test_zero_tearoff_layers_no_tearoff_cost(self):
        result = calculate_roof_estimate({"roof_squares": 20, "tearoff_layers": 0})
        assert result["tearoff_subtotal"] == 0

    def test_two_tearoff_layers_cost(self):
        result = calculate_roof_estimate({"roof_squares": 20, "tearoff_layers": 2})
        assert result["tearoff_subtotal"] == 20 * 85

    def test_addon_with_zero_quantity_excluded(self):
        result = calculate_roof_estimate({
            "roof_squares": 10,
            "addons": [
                {"id": "skylight", "quantity": 0},
                {"id": "permit", "quantity": 1}
            ]
        })
        assert len(result["addons_detail"]) == 1
        assert result["addons_detail"][0]["id"] == "permit"

    def test_addon_custom_unit_price_overrides_default(self):
        result = calculate_roof_estimate({
            "roof_squares": 10,
            "addons": [{"id": "plywood", "quantity": 5, "unitPrice": 200}]
        })
        assert result["addons_subtotal"] == 1000  # 5 * 200

    def test_minimum_one_square_enforced(self):
        result = calculate_roof_estimate({"roof_squares": 0})
        assert result["squares"] == 1.0

    def test_result_has_both_snake_and_camel_keys(self):
        result = calculate_roof_estimate({"roof_squares": 10})
        assert "total_price" in result and "totalPrice" in result
        assert result["total_price"] == result["totalPrice"]
        assert "labor_subtotal" in result and "laborSubtotal" in result
        assert result["labor_subtotal"] == result["laborSubtotal"]


class TestLeadValueEstimator:
    def test_residential_default_range_calculation(self):
        result = calculate_lead_estimated_value(sqft=2000)
        assert result["service_slug"] == "residential"
        # low = 500 + (2000 * 4.00) = 8500
        assert result["estimate_low"] == 8500
        # high = 950 + (2000 * 6.20) = 13350
        assert result["estimate_high"] == 13350
        assert result["estimated_value"] == round((8500 + 13350) / 2)

    def test_repair_slug_returns_lower_range_than_residential(self):
        repair = calculate_lead_estimated_value(sqft=1000, service_type="emergency leak repair")
        residential = calculate_lead_estimated_value(sqft=1000, service_type="residential")
        assert repair["service_slug"] == "repair"
        assert repair["estimate_high"] < residential["estimate_low"]

    def test_commercial_slug_has_high_base_fee(self):
        result = calculate_lead_estimated_value(sqft=5000, service_type="commercial flat")
        assert result["service_slug"] == "commercial"
        # low = 2250 + (5000 * 5.0) = 27250
        assert result["estimate_low"] == 27250

    def test_pitch_and_story_multiplier_applied_correctly(self):
        base = calculate_lead_estimated_value(sqft=2000, pitch="4:12", stories=1)
        elevated = calculate_lead_estimated_value(sqft=2000, pitch="9:12", stories=2)
        # 9:12 mult=1.25, 2-story mult=1.1 → combined=1.375
        expected_low = round(base["estimate_low"] * 1.25 * 1.10)
        assert elevated["estimate_low"] == expected_low

    def test_minimum_100_sqft_enforced(self):
        result = calculate_lead_estimated_value(sqft=0)
        assert result["sqft"] == 100.0

    def test_squares_field_is_sqft_divided_by_100(self):
        result = calculate_lead_estimated_value(sqft=2500)
        assert result["squares"] == 25.0

    def test_monthly_payment_range_calculated(self):
        result = calculate_lead_estimated_value(sqft=2000)
        assert result["monthly_low"] == round(result["estimate_low"] / result["financing_term_months"])
        assert result["monthly_high"] == round(result["estimate_high"] / result["financing_term_months"])

    @pytest.mark.parametrize("service,expected_slug", [
        ("tile", "residential"),
        ("shingle", "residential"),
        ("emergency roof leak repair", "repair"),
        ("commercial flat roof", "commercial"),
        ("solar + roofing", "solar"),
        ("", "residential"),
        (None, "residential"),
        ("completely unknown service xyz", "residential"),
    ])
    def test_service_slug_resolution(self, service, expected_slug):
        assert resolve_service_slug(service) == expected_slug


class TestLeadScoringComprehensive:
    def test_score_capped_at_100(self):
        score, priority, factors = calculate_lead_score({
            "serviceType": "emergency leak repair",  # +45
            "formType": "estimate",                   # +20
            "phone": "760-555-1234",                  # +20
            "roofSqf": 3000,                          # +15
            "address": "123 Main St, Escondido CA",   # +10
            "leadSource": "referral from neighbor",   # +25
        })
        assert score == 100  # sum is 135, capped at 100
        assert priority == "hot"

    def test_score_zero_for_completely_empty_lead(self):
        score, priority, factors = calculate_lead_score({})
        assert score == 0
        assert priority == "cool"
        assert factors == []

    def test_commercial_lead_gets_40_points(self):
        score, _, factors = calculate_lead_score({"serviceType": "commercial tpo"})
        assert score == 40
        assert any("Commercial" in f for f in factors)

    def test_solar_lead_gets_30_points(self):
        score, _, _ = calculate_lead_score({"serviceType": "solar installation"})
        assert score == 30

    def test_referral_source_adds_25_points(self):
        score_base, _, _ = calculate_lead_score({})
        score_ref, _, _ = calculate_lead_score({"leadSource": "referral from client"})
        assert score_ref - score_base == 25

    def test_phone_call_source_adds_15_points(self):
        score, _, factors = calculate_lead_score({"leadSource": "phone call inbound"})
        assert score == 15
        assert any("telephone" in f.lower() for f in factors)

    def test_large_roof_area_adds_15_points(self):
        score_large, _, _ = calculate_lead_score({"roofSqf": 2500})
        score_base, _, _ = calculate_lead_score({})
        assert score_large - score_base == 15

    def test_small_roof_area_adds_10_points(self):
        score_small, _, _ = calculate_lead_score({"roofSqf": 1000})
        score_base, _, _ = calculate_lead_score({})
        assert score_small - score_base == 10

    def test_all_primary_cities_award_geographic_bonus(self):
        primary_cities = [
            "escondido", "oceanside", "carlsbad", "san marcos",
            "vista", "encinitas", "poway", "temecula", "murrieta"
        ]
        for city in primary_cities:
            score, _, factors = calculate_lead_score({"address": f"123 Main St, {city} CA"})
            assert score == 10, f"City {city} should award 10 geographic points"
            assert any("North County" in f or "service area" in f.lower() for f in factors)

    def test_priority_thresholds_at_exact_boundaries(self):
        # Warm threshold is >=35, Hot is >=70
        # Score 35 exactly: residential (35) alone
        score_35, priority_35, _ = calculate_lead_score({"serviceType": "residential tile"})
        assert score_35 == 35
        assert priority_35 == "warm"
        
        # Score 34: less than warm — use residential + wrong source type
        # Score below 35 with no phone, no form, no geo
        score_cool, priority_cool, _ = calculate_lead_score({"serviceType": "other thing"})
        assert priority_cool == "cool"


class TestSLAServiceComprehensive:
    def test_stage2_warning_zone_11_hours_remaining(self):
        now = datetime.now(timezone.utc)
        result = evaluate_lead_sla(
            stage="stage_2_initial_contact",
            stage_entered_at=now - timedelta(hours=37),  # 48-37=11h remaining
            initial_contacted_at=None,
        )
        assert result["status"] == "warning"
        assert result["isStale"] is True
        assert result["badgeTone"] == "amber"

    def test_stage2_ok_zone_at_13_hours_remaining(self):
        now = datetime.now(timezone.utc)
        result = evaluate_lead_sla(
            stage="stage_2_initial_contact",
            stage_entered_at=now - timedelta(hours=35),  # 48-35=13h remaining
            initial_contacted_at=None,
        )
        assert result["status"] == "ok"
        assert result["badgeTone"] == "sky"

    def test_stage4_contract_signed_returns_met(self):
        now = datetime.now(timezone.utc)
        result = evaluate_lead_sla(
            stage="stage_4_closing",
            stage_entered_at=now - timedelta(hours=100),
            contract_signed_at=now - timedelta(hours=5),
        )
        assert result["status"] == "met"
        assert result["badgeLabel"] == "Contract Executed"

    def test_stage4_closing_breach_without_signature(self):
        now = datetime.now(timezone.utc)
        result = evaluate_lead_sla(
            stage="stage_4_closing",
            stage_entered_at=now - timedelta(hours=72),
            contract_signed_at=None,
        )
        assert result["status"] == "breached"
        assert "follow-up" in result["alertMessage"].lower()

    def test_general_stage_ok_within_threshold(self):
        now = datetime.now(timezone.utc)
        result = evaluate_lead_sla(
            stage="stage_3_site_visit_estimate",
            stage_entered_at=now - timedelta(hours=10),  # 72h SLA, only 10h in
        )
        assert result["status"] == "ok"
        assert "On Track" in result["badgeLabel"]

    def test_general_stage_breach_past_threshold(self):
        now = datetime.now(timezone.utc)
        result = evaluate_lead_sla(
            stage="stage_3_site_visit_estimate",
            stage_entered_at=now - timedelta(hours=100),
        )
        assert result["status"] == "breached"
        assert result["isStale"] is True

    def test_custom_hours_threshold_overrides_default(self):
        now = datetime.now(timezone.utc)
        result = evaluate_lead_sla(
            stage="stage_1_lead_gen",
            stage_entered_at=now - timedelta(hours=20),
            hours_threshold=12,
        )
        assert result["status"] == "breached"

    def test_none_stage_entered_at_does_not_crash(self):
        result = evaluate_lead_sla(stage="stage_1_lead_gen", stage_entered_at=None)
        assert "status" in result
        assert result["hoursInStage"] == 0

    def test_hours_in_stage_calculation_accuracy(self):
        now = datetime.now(timezone.utc)
        result = evaluate_lead_sla(
            stage="stage_5_completion_followup",
            stage_entered_at=now - timedelta(hours=48),
        )
        assert result["hoursInStage"] == 48

    def test_default_sla_hours_regression(self):
        from app.services.sla import DEFAULT_STAGE_SLA_HOURS
        assert DEFAULT_STAGE_SLA_HOURS["stage_1_lead_gen"] == 24
        assert DEFAULT_STAGE_SLA_HOURS["stage_2_initial_contact"] == 48
        assert DEFAULT_STAGE_SLA_HOURS["stage_3_site_visit_estimate"] == 72
        assert DEFAULT_STAGE_SLA_HOURS["stage_4_closing"] == 48
        assert DEFAULT_STAGE_SLA_HOURS["stage_5_completion_followup"] == 168


class TestEstimateCapsService:
    def test_format_price_whole_number(self):
        assert format_price(26870) == "$26,870"
        assert format_price(0) == "$0"
        assert format_price(1000000) == "$1,000,000"

    def test_format_price_with_cents(self):
        assert format_price(26870.50) == "$26,870.50"
        assert format_price(0.99) == "$0.99"

    def test_validate_field_cap_at_exact_limit(self):
        is_valid, msg = validate_field_cap("plan_name", "A" * 28)
        assert is_valid is True
        assert msg == ""

    def test_validate_field_cap_one_over_limit(self):
        is_valid, msg = validate_field_cap("plan_name", "A" * 29)
        assert is_valid is False
        assert "28" in msg

    def test_validate_field_cap_unknown_field_always_valid(self):
        is_valid, msg = validate_field_cap("nonexistent_field_xyz", "any value" * 100)
        assert is_valid is True
        assert msg == ""

    def test_validate_estimate_data_missing_all_required_fields(self):
        errors = validate_estimate_data({})
        assert any("Client" in e for e in errors)
        assert any("Photo" in e for e in errors)
        assert any("date" in e.lower() or "Date" in e for e in errors)

    def test_validate_estimate_data_plan_name_too_long(self):
        from app.services.estimate_caps import FIELD_CAPS
        data = {
            "client": {"leadId": 1},
            "photo1": "http://example.com/photo.jpg",
            "proposalDate": "2026-01-01",
            "plans": [{"name": "A" * (FIELD_CAPS["plan_name"] + 1), "price": 10000, "scopeItems": ["x"] * 5}],
            "pricing": {"lockInDays": 20},
        }
        errors = validate_estimate_data(data)
        assert any("Plan A name" in e for e in errors)

    def test_validate_estimate_data_scope_items_too_few(self):
        from app.services.estimate_caps import FIELD_CAPS
        data = {
            "client": {"leadId": 1}, "photo1": "url", "proposalDate": "2026-01-01",
            "plans": [{"name": "Valid Plan", "price": 10000, "scopeItems": ["x"] * (FIELD_CAPS["scope_items_min"] - 1)}],
            "pricing": {"lockInDays": 20},
        }
        errors = validate_estimate_data(data)
        assert any("at least" in e for e in errors)

    def test_validate_estimate_data_lock_in_days_out_of_range(self):
        data = {
            "client": {"leadId": 1}, "photo1": "url", "proposalDate": "2026-01-01",
            "plans": [], "pricing": {"lockInDays": 0},
        }
        errors = validate_estimate_data(data)
        assert any("Lock-in days" in e for e in errors)

    def test_validate_estimate_data_valid_data_returns_no_errors(self):
        from app.services.estimate_caps import FIELD_CAPS
        data = {
            "client": {"leadId": 42},
            "photo1": "http://example.com/photo.jpg",
            "proposalDate": "2026-09-26",
            "plans": [
                {"name": "Plan A", "price": 25000, "scopeItems": ["item"] * 6},
            ],
            "addons": [{"title": "Addon", "price": 1500}],
            "pricing": {"lockInDays": 20},
        }
        errors = validate_estimate_data(data)
        assert errors == [], f"Unexpected errors: {errors}"
