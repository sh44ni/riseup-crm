import pytest
from pydantic import ValidationError

class TestFieldModels:
    def test_create_crew_requires_name_and_role(self):
        from app.api.admin.field import CreateCrewPayload
        with pytest.raises(ValidationError):
            CreateCrewPayload(name="", role="foreman")  # min_length=1
        
        with pytest.raises(ValidationError):
            CreateCrewPayload(name="John", role="")  # min_length=1

        # Valid
        p = CreateCrewPayload(name="John Smith", role="foreman")
        assert p.name == "John Smith"
        assert p.role == "foreman"
        assert p.phone is None
        assert p.active is True
        assert p.currentJobId is None

class TestFinancesModels:
    def test_create_invoice_payload(self):
        from app.api.admin.finances import CreateInvoicePayload
        # Valid
        p = CreateInvoicePayload(jobId=1, amount=100.0)
        assert p.jobId == 1
        assert p.amount == 100.0
            
class TestClientsModels:
    def test_create_client_payload(self):
        from app.api.admin.clients import CreateClientPayload
        # Valid
        p = CreateClientPayload(fullName="Jane Doe")
        assert p.fullName == "Jane Doe"
            
class TestMarketingModels:
    def test_create_review_request(self):
        from app.api.admin.marketing import CreateReviewRequestPayload
        with pytest.raises(ValidationError):
            CreateReviewRequestPayload(customerName="") # min_length=1
        
        # Valid
        p = CreateReviewRequestPayload(customerName="Jane Doe")
        assert p.customerName == "Jane Doe"

@pytest.mark.parametrize("module_path,class_name", [
    ("app.api.admin.field", "CreateCrewPayload"),
    ("app.api.admin.field", "UpdateCrewPayload"),
    ("app.api.admin.field", "SavePhotoPayload"),
    ("app.api.admin.field", "CreateInspectionPayload"),
    ("app.api.admin.field", "CreateWarrantyPayload"),
    ("app.api.admin.field", "UpdateWarrantyPayload"),
    ("app.api.admin.finances", "CreateInvoicePayload"),
    ("app.api.admin.finances", "UpdateInvoicePayload"),
    ("app.api.admin.finances", "CreateExpensePayload"),
    ("app.api.admin.finances", "ManageFinancingPayload"),
    ("app.api.admin.system", "UpdateSettingsPayload"),
    ("app.api.admin.system", "UpdateDashboardConfigPayload"),
    ("app.api.admin.system", "CreateTemplatePayload"),
    ("app.api.admin.system", "UpdateTemplatePayload"),
    ("app.api.admin.clients", "CreateClientPayload"),
    ("app.api.admin.clients", "UpdateClientPayload"),
    ("app.api.admin.clients", "MarkClientLostPayload"),
    ("app.api.admin.clients", "AddClientActivityPayload"),
    ("app.api.admin.clients", "CreateClientTaskPayload"),
    ("app.api.admin.clients", "AddClientDocumentPayload"),
    ("app.api.admin.estimates", "GenerateEstimatePdfPayload"),
    ("app.api.admin.estimates", "SendEstimateEmailPayload"),
    ("app.api.admin.estimates", "CalculateUniversalPricingPayload"),
    ("app.api.admin.estimates", "SendTwoOptionsEstimatePayload"),
    ("app.api.admin.jobs", "CompleteJobPayload"),
    ("app.api.admin.jobs", "CreateJobActivityPayload"),
    ("app.api.admin.calendar", "CreateTaskPayload"),
    ("app.api.admin.calendar", "UpdateTaskPayload"),
    ("app.api.admin.calendar_events", "UpdateCalendarEventPayload"),
    ("app.api.admin.marketing", "CreateReviewRequestPayload"),
    ("app.api.admin.marketing", "UpdateReviewPayload"),
])
def test_all_pydantic_models_are_importable(module_path, class_name):
    import importlib
    mod = importlib.import_module(module_path)
    cls = getattr(mod, class_name)
    assert cls is not None
    # Verify it's a Pydantic model
    from pydantic import BaseModel
    assert issubclass(cls, BaseModel)
