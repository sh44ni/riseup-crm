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
            "contractor_name": "Rise Up Roofing and Construction, Inc.",
            "contractor_signatory_name": "Edith Guerrero",
            "contractor_signatory_title": "President",
            "contractor_signature_name": "Edith Guerrero",
            "contractor_signature_type": "typed",
            "contractor_signature_data": "Edith Guerrero",
        }
        html = _render_contract_html(data)

        # Execution status label on footer
        assert "fully-executed" in html
        assert "FULLY EXECUTED" in html
        assert "DRAFT" not in html
        assert "PARTIALLY EXECUTED" not in html

        # Contractor signature is now displayed
        assert "Edith Guerrero" in html
        assert "By: Edith Guerrero • Title: President" in html

        # Status badge appears on pages with footer
        assert html.count('class="tag fully-executed"') == 6
        assert html.count(">FULLY EXECUTED</span>") == 7

    def test_configured_signatory_is_pre_printed_but_not_signed_on_draft(self):
        data = {
            "contract_number": "RU-1004",
            "client_name": "Glen Woods",
            "is_signed": False,
            "contractor_signatory_name": "Edith Guerrero",
            "contractor_signatory_title": "President",
            "contractor_signature_data": "data:image/png;base64,AAAA",
            "prepared_by_name": "Marc Operator",
            "prepared_by_title": "Project Manager",
        }
        html = _render_contract_html(data)

        # Intro and By/Title point to the configured company signatory
        assert "Rise Up Roofing and Construction, Inc. Edith Guerrero (the “Contractor”)" in html
        assert "By: Edith Guerrero • Title: President" in html
        # The signature image itself only appears once counter-signed
        assert 'alt="Contractor Signature"' not in html
        # Prepared-by is the CRM operator
        assert "Marc Operator" in html

    def test_no_hardcoded_signatory_when_not_configured(self):
        html = _render_contract_html({"contract_number": "RU-1005", "client_name": "Glen Woods"})
        assert "Edith Guerrero" not in html
        assert "By: ____________________ • Title: ____________________" in html
        assert "Rise Up Roofing and Construction, Inc. (the “Contractor”)" in html
