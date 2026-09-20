import hashlib
import hmac
import json
import os
import unittest

from fastapi.testclient import TestClient

from main import app

_ENV_OVERRIDES = {
    "RAILWATCH_DEMO_MODE": "true",
    "RAILWATCH_WHATSAPP_ENABLED": "true",
    "WHATSAPP_WEBHOOK_SECRET": "test-whatsapp-secret",
    "RAILWATCH_DEFAULT_TENANT": "NahaLabs-Demo",
    "RAILWATCH_ALLOWED_ORIGINS": "http://testserver",
    "RAILWATCH_OPERATOR_SECRET": "test-operator-secret",
    "RAILWATCH_INGEST_KEY": "test-ingest",
}
_previous_values: dict[str, str | None] = {}


def setUpModule():
    # unittest discover imports every test file (running its top-level code)
    # during collection, before any test method anywhere runs. Setting these
    # unconditionally at module top level meant this file's values leaked into
    # every other file's tests for the whole process. setUpModule instead
    # runs immediately before *this module's* tests specifically -- by which
    # point every earlier-sorted module has already finished running.
    for key, value in _ENV_OVERRIDES.items():
        _previous_values[key] = os.environ.get(key)
        os.environ[key] = value


def tearDownModule():
    for key, previous in _previous_values.items():
        if previous is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = previous


class WhatsAppIntegrationTests(unittest.TestCase):
    def test_demo_session_is_only_available_in_demo_mode(self):
        with TestClient(app) as client:
            response = client.get("/api/v1/whatsapp/session")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["token"].startswith("RW1."))

    def test_status_uses_operator_token_tenant_scope(self):
        with TestClient(app) as client:
            token = client.get("/api/v1/whatsapp/session").json()["token"]
            response = client.get("/api/v1/whatsapp/status", headers={"authorization": f"Bearer {token}"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["tenant"], "NahaLabs-Demo")
            self.assertTrue(response.json()["enabled"])

    def test_webhook_signature_and_idempotency(self):
        with TestClient(app) as client:
            body = {
                "schemaVersion": 1,
                "waAccountId": "demo-wa-account",
                "appId": "railwatch",
                "tenantId": "NahaLabs-Demo",
                "event": "message",
                "data": {
                    "messageId": "WA-QA-001",
                    "senderId": "27821234567",
                    "chatId": "27821234567@s.whatsapp.net",
                    "messageType": "conversation",
                    "text": "HELP",
                },
                "deliveredAt": "2026-09-12T00:00:00+00:00",
            }
            raw = json.dumps(body, separators=(",", ":")).encode()
            signature = hmac.new(b"test-whatsapp-secret", raw, hashlib.sha256).hexdigest()
            first = client.post("/api/v1/webhooks/whatsapp", headers={"x-webhook-signature": signature}, content=raw)
            second = client.post("/api/v1/webhooks/whatsapp", headers={"x-webhook-signature": signature}, content=raw)
            rejected = client.post("/api/v1/webhooks/whatsapp", headers={"x-webhook-signature": "bad"}, content=raw)

            self.assertEqual(first.status_code, 200)
            self.assertFalse(first.json()["duplicate"])
            self.assertEqual(second.status_code, 200)
            self.assertTrue(second.json()["duplicate"])
            self.assertEqual(rejected.status_code, 401)


if __name__ == "__main__":
    unittest.main()
