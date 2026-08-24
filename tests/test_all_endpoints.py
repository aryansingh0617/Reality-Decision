"""
tests/test_all_endpoints.py
===========================
End-to-End API Integration Suite verifying all PRAVAH Core Endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200


def test_state_endpoint():
    response = client.get("/api/state")
    assert response.status_code == 200
    data = response.json()
    assert "world_state_version" in data
    assert "routes" in data


def test_alerts_endpoint():
    response = client.get("/api/alerts")
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert len(data["alerts"]) > 0


def test_districts_endpoint():
    response = client.get("/api/districts")
    assert response.status_code == 200
    data = response.json()
    assert "districts" in data
    assert len(data["districts"]) > 0


def test_bottlenecks_endpoint():
    response = client.get("/api/bottlenecks")
    assert response.status_code == 200
    data = response.json()
    assert "bottlenecks" in data
    assert len(data["bottlenecks"]) > 0


def test_missions_endpoint():
    response = client.get("/api/missions")
    assert response.status_code == 200
    data = response.json()
    assert "missions" in data
    assert len(data["missions"]) > 0


def test_connectors_endpoint():
    response = client.get("/api/connectors")
    assert response.status_code == 200
    data = response.json()
    assert "connectors" in data
    assert len(data["connectors"]) >= 7


def test_field_reports_endpoint():
    response = client.get("/api/field-reports")
    assert response.status_code == 200
    data = response.json()
    assert "reports" in data


def test_dispatch_order_endpoint():
    response = client.get("/api/dispatch/order")
    assert response.status_code == 200
    data = response.json()
    assert "dispatch_id" in data
    assert "cryptographic_verification" in data
    assert data["cryptographic_verification"]["algorithm"] == "SHA-256"


def test_send_sms_endpoint():
    response = client.post("/api/send-sms", json={"to": "+919876543210", "message": "Test SMS"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["sid"].startswith("SM")
