import hashlib
import importlib
import json
import os
import sys
import unittest
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace
from unittest.mock import patch

class AuditRestorationTimezoneTests(unittest.TestCase):
    def test_audit_bytes_survive_database_session_timezones(self):
        for hours in [-8, 0, 2, 5.5, 12]:
            with self.subTest(session_offset_hours=hours):
                original = {
                    'id': 'synthetic-audit-1',
                    'timestamp': '2026-11-10T06:00:00.123456+00:00',
                    'actor': 'synthetic-controller',
                    'tenant': 'synthetic-tenant',
                    'incident_id': 'synthetic-case',
                    'action': 'SYNTHETIC_TEST',
                    'details': {'test': True},
                    'previous_hash': 'GENESIS',
                }
                digest = hashlib.sha256(json.dumps(original, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
                instant = datetime.fromisoformat(original['timestamp']).astimezone(timezone(timedelta(hours=hours)))
                row = (original['id'], instant, original['actor'], original['tenant'], original['incident_id'], original['action'], original['details'], original['previous_hash'], digest)
                class Cursor:
                    def __enter__(self): return self
                    def __exit__(self, *args): pass
                    def execute(self, *args): pass
                    def fetchall(self): return [row]
                class Connection:
                    def __enter__(self): return self
                    def __exit__(self, *args): pass
                    def cursor(self): return Cursor()
                    def commit(self): pass
                ops = SimpleNamespace(_AUDIT=[], _record_audit=lambda *args: {})
                psycopg = SimpleNamespace(connect=lambda *args, **kwargs: Connection())
                with patch.dict(sys.modules, {'operations': ops, 'psycopg': psycopg}), patch.dict(os.environ, {'DATABASE_URL': 'postgresql://synthetic.invalid/test', 'RAILWATCH_REQUIRE_AUDIT': 'true'}):
                    adapter = importlib.import_module('audit_persistence')
                    adapter.install()
                restored = ops._AUDIT[0]
                body = {k: v for k, v in restored.items() if k != 'event_hash'}
                self.assertEqual(body, original)
                self.assertEqual(hashlib.sha256(json.dumps(body, sort_keys=True, separators=(',', ':')).encode()).hexdigest(), digest)

if __name__ == '__main__': unittest.main()
