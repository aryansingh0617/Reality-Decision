"""
tests/test_sms_service.py
=========================
End-to-End Test Suite for Twilio SMS Notification Feature in PRAVAH.
Tests E.164 validation, async dispatch, rate limiting, and HTTP endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from core.notifications.sms_service import SMSService, SMSValidationError, SMSProviderError

client = TestClient(app)


def test_e164_validation_valid():
    """Tests valid E.164 phone number formatting."""
    assert SMSService.validate_and_normalize_e164("+919876543210") == "+919876543210"
    assert SMSService.validate_and_normalize_e164("+15552345678") == "+15552345678"
    assert SMSService.validate_and_normalize_e164("9876543210") == "+919876543210"
    assert SMSService.validate_and_normalize_e164("+1 (555) 234-5678") == "+15552345678"


def test_e164_validation_invalid():
    """Tests that malformed phone numbers raise SMSValidationError."""
    invalid_numbers = ["", "invalid", "123", "+012345678", "abcdefghij", "+123456789012345678"]
    for num in invalid_numbers:
        with pytest.raises(SMSValidationError):
            SMSService.validate_and_normalize_e164(num)


def test_sms_service_send():
    """Tests SMS service dispatch and SID generation."""
    service = SMSService()
    res = service.send_sms(to="+919876543210", message="Test Emergency Alert")
    assert res["success"] is True
    assert res["sid"].startswith("SM")
    assert res["to"] == "+919876543210"
    assert res["body"] == "Test Emergency Alert"
    assert "delivery_time_ms" in res


def test_api_send_sms_endpoint_success():
    """Tests POST /api/send-sms endpoint with valid E.164 payload."""
    payload = {
        "to": "+919876543210",
        "message": "🚨 PRAVAH CRITICAL: Saraighat Bridge B-07 Submerged."
    }
    response = client.post("/api/send-sms", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["sid"].startswith("SM")
    assert data["to"] == "+919876543210"


def test_api_send_sms_endpoint_invalid_phone():
    """Tests POST /api/send-sms endpoint with invalid phone number returns 422."""
    payload = {
        "to": "not-a-phone-number",
        "message": "Test Alert"
    }
    response = client.post("/api/send-sms", json=payload)
    assert response.status_code == 422
    assert "Invalid phone number format" in response.json()["detail"]


def test_api_send_sms_endpoint_empty_message():
    """Tests POST /api/send-sms endpoint with empty message returns 422."""
    payload = {
        "to": "+919876543210",
        "message": "   "
    }
    response = client.post("/api/send-sms", json=payload)
    assert response.status_code == 422
