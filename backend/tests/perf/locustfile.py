"""
Locust Performance Load Testing Harness (WP-6.3)
================================================
Simulates concurrent staff users performing operational CRM workflows.

Workflows simulated:
- Authentication & session cookie establishment
- Pipeline Kanban board polling & deal transitions
- Lead search, filter, and pagination
- Client 360 profile inspection
- Executive reporting & KPIs
- Instant quote calculation

Usage:
    locust -f tests/perf/locustfile.py --headless -u 20 -r 5 --run-time 1m --host http://localhost:8000
"""

from locust import HttpUser, task, between
import random


class CrmStaffUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """Authenticates with credentials and receives HttpOnly session cookie."""
        res = self.client.post("/api/admin/auth/login", json={
            "email": "owner@riseuprac.com",
            "password": "TestPassword123!"
        })
        if res.status_code == 200:
            data = res.json()
            self.csrf_token = data.get("csrf_token", "")
        else:
            self.csrf_token = ""

    @task(5)
    def view_pipeline(self):
        """Kanban board inspection."""
        self.client.get("/api/admin/pipeline", name="[GET] /api/admin/pipeline")

    @task(4)
    def view_leads_list(self):
        """Leads list with paging."""
        page = random.randint(1, 3)
        self.client.get(f"/api/admin/leads?page={page}&limit=25", name="[GET] /api/admin/leads")

    @task(3)
    def view_clients_list(self):
        """Clients listing."""
        self.client.get("/api/admin/clients?limit=20", name="[GET] /api/admin/clients")

    @task(2)
    def view_reports(self):
        """Executive KPI & Analytics."""
        self.client.get("/api/admin/reports", name="[GET] /api/admin/reports")

    @task(2)
    def view_calendar(self):
        """Calendar events."""
        self.client.get("/api/admin/calendar", name="[GET] /api/admin/calendar")

    @task(1)
    def run_public_estimator(self):
        """Public estimator calculator load."""
        self.client.post("/api/estimator/calculate", json={
            "square_footage": random.randint(1500, 4500),
            "pitch": "medium",
            "material_type": "shingle"
        }, name="[POST] /api/estimator/calculate")
