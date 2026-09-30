import pytest
from app.services.sync import normalize_phone, format_phone
from app.models.client import Client, Lead, ClientDocument
from app.models.estimate import Estimate
from app.models.job import Job


class TestSyncAndPhoneNormalization:
    def test_phone_normalization_standard(self):
        assert normalize_phone("(760) 555-0199") == "7605550199"
        assert normalize_phone("760.555.0199") == "7605550199"
        assert normalize_phone("+1 760 555 0199") == "7605550199"
        assert normalize_phone("1-760-555-0199") == "7605550199"

    def test_phone_normalization_invalid_or_empty(self):
        assert normalize_phone("") is None
        assert normalize_phone(None) is None
        assert normalize_phone("123") == "123"  # Preserves raw digits if non-standard

    def test_phone_formatting(self):
        assert format_phone("7605550199") == "(760) 555-0199"
        assert format_phone("+17605550199") == "(760) 555-0199"
        assert format_phone("17605550199") == "(760) 555-0199"
        assert format_phone("") == ""
        assert format_phone(None) == ""


class TestModelIndexDeclarations:
    def test_client_model_has_indexes_and_constraints(self):
        table = Client.__table__
        indexed_cols = {col.name for col in table.columns if col.index}
        assert "email" in indexed_cols
        assert "phone" in indexed_cols
        assert "phone_normalized" in indexed_cols
        assert "status" in indexed_cols

    def test_lead_model_has_indexes(self):
        table = Lead.__table__
        indexed_cols = {col.name for col in table.columns if col.index}
        assert "client_id" in indexed_cols
        assert "source_type" in indexed_cols
        assert "assigned_to_user_id" in indexed_cols
        assert "status" in indexed_cols

    def test_client_document_model_structure(self):
        table = ClientDocument.__table__
        assert "client_id" in table.columns
        assert "file_url" in table.columns
        assert table.columns["client_id"].index is True


class TestAddressNormalizationAndDataPurity:
    def test_parse_address_full_address_string(self):
        from app.services.sync import parse_address_components
        res = parse_address_components("1234 Coast Hwy, Oceanside, CA 92054")
        assert res["address"] == "1234 Coast Hwy"
        assert res["city"] == "Oceanside"
        assert res["zip"] == "92054"

    def test_parse_address_preserves_9_digit_zip(self):
        from app.services.sync import parse_address_components
        res = parse_address_components("5678 Mission Ave, Oceanside, CA 92054-1234")
        assert res["address"] == "5678 Mission Ave"
        assert res["city"] == "Oceanside"
        assert res["zip"] == "92054-1234"

    def test_parse_address_city_only_input(self):
        from app.services.sync import parse_address_components
        res = parse_address_components("Carlsbad")
        assert res["address"] is None
        assert res["city"] == "Carlsbad"
        assert res["zip"] is None

    def test_parse_address_separate_fields(self):
        from app.services.sync import parse_address_components
        res = parse_address_components("2182 S El Camino Real", raw_city="Oceanside", raw_zip="92054")
        assert res["address"] == "2182 S El Camino Real"
        assert res["city"] == "Oceanside"
        assert res["zip"] == "92054"

    def test_parse_address_empty_and_whitespace(self):
        from app.services.sync import parse_address_components
        res = parse_address_components("   ", raw_city="", raw_zip="  ")
        assert res["address"] is None
        assert res["city"] is None
        assert res["zip"] is None

    def test_contract_defaults_contain_no_fake_customer_data(self):
        from app.services.contract_pdf_generator import DEFAULT_CONTRACT_DATA, _render_contract_html
        assert DEFAULT_CONTRACT_DATA["project_address"] == ""
        assert DEFAULT_CONTRACT_DATA["client_name"] == ""
        assert "Bryce Kirklen" not in DEFAULT_CONTRACT_DATA.values()
        assert "28663 Miller Road" not in str(DEFAULT_CONTRACT_DATA)

        # Rendering with empty data must show clear pending indicator, not mock person/address
        html = _render_contract_html({})
        assert "[Project Address Pending]" in html
        assert "[Client Name Pending]" in html
        assert "Bryce Kirklen" not in html
        assert "28663 Miller Road" not in html

    def test_proposal_defaults_contain_no_fake_customer_data(self):
        from app.services.pdf_generator import DEFAULT_PROPOSAL_DATA
        assert DEFAULT_PROPOSAL_DATA["customer_name"] == ""
        assert DEFAULT_PROPOSAL_DATA["customer_address"] == ""
        assert DEFAULT_PROPOSAL_DATA["customer_city"] == ""
        assert "David Martinez" not in str(DEFAULT_PROPOSAL_DATA)
        assert "742 Evergreen Terrace" not in str(DEFAULT_PROPOSAL_DATA)
