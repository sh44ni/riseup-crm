import pytest
from datetime import datetime, timezone, timedelta
from app.services.calculator import calculate_roof_estimate, ROOFING_MATERIALS, PITCH_MULTIPLIERS
from app.services.scoring import calculate_lead_score
from app.services.sla import evaluate_lead_sla


class TestCalculatorService:
    def test_calculate_roof_estimate_defaults(self):
        result = calculate_roof_estimate({
            "roof_squares": 20.0,
            "material_id": "oc_duration",
            "pitch": "4:12",
            "stories": 1,
            "tearoff_layers": 1,
            "margin_pct": 30.0,
            "financing_months": 60,
        })
        assert result["squares"] == 20.0
        assert result["material"]["id"] == "oc_duration"
        # 20 * 175 = 3500
        assert result["material_subtotal"] == 3500
        # 20 * 225 = 4500
        assert result["labor_subtotal"] == 4500
        # 20 * 45 = 900
        assert result["tearoff_subtotal"] == 900
        # cost = 3500 + 4500 + 900 = 8900
        assert result["cost_subtotal"] == 8900
        # price = 8900 / (1 - 0.30) = 8900 / 0.70 = 12714
        assert result["total_price"] == 12714
        # monthly = 12714 / 60 = 212
        assert result["monthly_payment"] == 212

    def test_calculate_roof_estimate_pitch_and_story_multipliers(self):
        # 6:12 pitch has 1.07 multiplier, 2 stories has 1.1 multiplier
        result = calculate_roof_estimate({
            "roof_squares": 25.0,
            "material_id": "eagle_tile",
            "pitch": "6:12",
            "stories": 2,
            "tearoff_layers": 2,
            "margin_pct": 35.0,
        })
        assert result["squares"] == 25.0
        # Material: 25 * 260 = 6500
        assert result["material_subtotal"] == 6500
        # Labor: 295 * 1.07 * 1.1 * 25
        expected_labor = round(25.0 * 295 * 1.07 * 1.1)
        assert result["labor_subtotal"] == expected_labor
        # Tearoff: 25 * 85 = 2125
        assert result["tearoff_subtotal"] == 2125

    def test_calculate_roof_estimate_with_addons(self):
        result = calculate_roof_estimate({
            "roof_squares": 15.0,
            "material_id": "oc_duration",
            "addons": [
                {"id": "plywood", "quantity": 10},  # 10 * 95 = 950
                {"id": "skylight", "quantity": 1},  # 1 * 1250 = 1250
            ]
        })
        assert result["addons_subtotal"] == 2200
        assert len(result["addons_detail"]) == 2


class TestScoringService:
    def test_emergency_repair_lead_scoring(self):
        score, priority, factors = calculate_lead_score({
            "serviceType": "emergency leak repair",
            "phone": "760-555-1234",
            "address": "123 Main St, Escondido, CA",
            "zip": "92025",
            "roofSqf": 3000,
            "formType": "estimate",
        })
        # Emergency (45) + Estimate (20) + Phone (20) + Large area (15) + Escondido (10) = 110 -> capped or high
        assert score >= 80
        assert priority in ("hot", "warm")
        assert any("Emergency" in f for f in factors)
        assert any("phone" in f.lower() for f in factors)

    def test_minimal_cold_lead_scoring(self):
        score, priority, factors = calculate_lead_score({
            "serviceType": "general inspection",
            "phone": "",
            "address": "Remote Area",
            "zip": "99999",
        })
        assert score < 50
        assert priority in ("cold", "cool")


class TestSLAService:
    def test_sla_met_initial_contact(self):
        now = datetime.now(timezone.utc)
        result = evaluate_lead_sla(
            stage="stage_2_initial_contact",
            stage_entered_at=now - timedelta(hours=5),
            initial_contacted_at=now - timedelta(hours=2)
        )
        assert result["status"] == "met"
        assert result["isStale"] is False

    def test_sla_breached_initial_contact(self):
        now = datetime.now(timezone.utc)
        result = evaluate_lead_sla(
            stage="stage_2_initial_contact",
            stage_entered_at=now - timedelta(hours=60),  # 60 hours > 48h SLA
            initial_contacted_at=None
        )
        assert result["status"] == "breached"
        assert result["isStale"] is True
        assert "breached" in result["alertMessage"].lower()
