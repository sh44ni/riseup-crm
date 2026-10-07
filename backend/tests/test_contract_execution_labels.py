import pytest
from app.services.contract_pdf_generator import _render_contract_html


class TestContractExecutionLabelsAndSignatures:
    """
    Validates:
    1. Contract PDF footer displays execution status label on left side:
       - 'DRAFT' when neither party has signed
       - 'PARTIALLY EXECUTED' when client has signed
       - 'FULLY EXECUTED' when CRM counter-signs
    2. Company representative signature is suppressed until fully executed.
    """

    def test_draft_state_when_no_one_signed(self):
        data = {
            "contract_number": "RU-1001",
            "client_name": "Glen Woods",
            "project_address": "123 Ocean Blvd, Oceanside, CA 92054",
            "is_signed": False,
        }
        html = _render_contract_html(data)

        # Execution status label on footer
        assert "draft" in html
        assert "DRAFT" in html
        assert "PARTIALLY EXECUTED" not in html
        assert "FULLY EXECUTED" not in html

        # Status badge appears on pages with footer
        assert html.count('class="tag draft"') == 6
        assert html.count(">DRAFT</span>") == 7

    def test_partially_executed_state_when_client_signs(self):
        data = {
            "contract_number": "RU-1002",
            "client_name": "Glen Woods",
            "project_address": "123 Ocean Blvd, Oceanside, CA 92054",
            "is_signed": True,
            "client_signed_at": "September 25, 2026",
            "client_signature_name": "Glen Woods",
            "client_initials": "GW",
        }
        html = _render_contract_html(data)

        # Execution status label on footer
        assert "partially-executed" in html
        assert "PARTIALLY EXECUTED" in html
        assert "DRAFT" not in html
        assert "FULLY EXECUTED" not in html

        # Client signature is visible
        assert "Glen Woods" in html
        assert "GW" in html

        # Status badge appears on pages with footer
        assert html.count('class="tag partially-executed"') == 6
        assert html.count(">PARTIALLY EXECUTED</span>") == 7

    def test_fully_executed_state_when_crm_counter_signs(self):
        data = {
            "contract_number": "RU-1003",
            "client_name": "Glen Woods",
            "project_address": "123 Ocean Blvd, Oceanside, CA 92054",
            "is_signed": True,
            "client_signed_at": "September 25, 2026",
            "client_signature_name": "Glen Woods",
            "client_initials": "GW",
            "is_counter_signed": True,
            "counter_signed_at": "September 25, 2026",
            "contractor_name": "Edith Guerrero",
            "contractor_signature_name": "Edith Guerrero",
        }
        html = _render_contract_html(data)

        # Execution status label on footer
        assert "fully-executed" in html
        assert "FULLY EXECUTED" in html
        assert "DRAFT" not in html
        assert "PARTIALLY EXECUTED" not in html

        # Contractor signature is now displayed
        assert "Edith Guerrero" in html

        # Status badge appears on pages with footer
        assert html.count('class="tag fully-executed"') == 6
        assert html.count(">FULLY EXECUTED</span>") == 7
