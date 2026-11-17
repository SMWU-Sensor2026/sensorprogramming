import sqlite3
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from werkzeug.security import generate_password_hash
from app import create_app


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.admin_hash = generate_password_hash('admin-test-password')

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db_path = str(Path(self.temp.name) / 'test.db')
        self.app = create_app({'TESTING': True, 'DATABASE': self.db_path, 'ADMIN_PASSWORD_HASH': self.admin_hash})
        self.client = self.app.test_client()
        self.admin = self.client.post('/api/admin/login', json={'password': 'admin-test-password'}).json['data']['access_token']

    def headers(self, token):
        return {'Authorization': 'Bearer '+token}

    def public_mode(self):
        response = self.client.patch('/api/admin/cabinet/mode', json={'mode': 'PUBLIC'}, headers=self.headers(self.admin))
        self.assertEqual(response.status_code, 200)

    def reserve(self, slot=1):
        response = self.client.post('/api/storage-sessions', json={'compartment_id': slot, 'password': 'shoe-pass'})
        self.assertEqual(response.status_code, 201, response.json)
        return response.json['data']

    def observe(self, slot=1, **state):
        response = self.client.post(f'/api/admin/mock/compartments/{slot}', json=state, headers=self.headers(self.admin))
        self.assertEqual(response.status_code, 200, response.json)

    def sql(self, query, args=()):
        with sqlite3.connect(self.db_path) as db:
            db.row_factory = sqlite3.Row
            result = db.execute(query, args)
            return result.fetchall()

    def test_page_and_assets(self):
        page = self.client.get('/')
        self.assertEqual(page.status_code, 200)
        for path in ('/static/css/style.css', '/static/js/script.js', '/static/js/weather.js'):
            self.assertIn(path.encode(), page.data)
            with self.client.get(path) as response:
                self.assertEqual(response.status_code, 200)

    def test_public_summary_hides_sensor_details(self):
        self.public_mode()
        summary = self.client.get('/api/compartments').json['data']
        self.assertEqual(len(summary), 2)
        self.assertNotIn('temperature', summary[0])
        self.assertEqual(self.client.get('/api/compartments/1').status_code, 401)

    def test_reservation_password_and_no_secret_response(self):
        self.public_mode()
        access = self.reserve()
        self.assertEqual(access['session']['session_status'], 'RESERVED')
        self.assertNotIn('password_hash', access['session'])
        self.assertNotIn('token_hash', access['session'])
        row = self.sql('SELECT * FROM storage_session')[0]
        self.assertNotEqual(row['password_hash'], 'shoe-pass')
        self.assertNotEqual(row['token_hash'], access['access_token'])
        response = self.client.post('/api/storage-sessions/authenticate', json={'compartment_id': 1, 'password': 'shoe-pass'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.post('/api/storage-sessions/authenticate', json={'compartment_id': 1, 'password': 'wrong'}).status_code, 401)
        self.assertEqual(self.client.post('/api/storage-sessions', json={'compartment_id': 1, 'password': 'other'}).status_code, 409)

    def test_concurrent_duplicate_reservation(self):
        self.public_mode()
        def reserve(_):
            with self.app.test_client() as client:
                return client.post('/api/storage-sessions', json={'compartment_id': 1, 'password': 'shoe-pass'}).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(reserve, range(2))), [201, 409])

    def test_cross_slot_and_session_access(self):
        self.public_mode()
        first, second = self.reserve(1), self.reserve(2)
        headers = self.headers(first['access_token'])
        self.assertEqual(self.client.get('/api/compartments/2', headers=headers).status_code, 403)
        self.assertEqual(self.client.post(f"/api/storage-sessions/{second['session']['session_id']}/cancel", headers=headers).status_code, 403)
        self.assertEqual(self.client.get('/api/compartments/1', headers=headers).status_code, 200)

    def test_expired_token_can_reauthenticate(self):
        self.public_mode()
        access = self.reserve()
        self.sql("UPDATE access_token SET expires_at='2000-01-01T00:00:00+00:00' WHERE role='USER'")
        self.assertEqual(self.client.get('/api/storage-sessions/me', headers=self.headers(access['access_token'])).status_code, 401)
        self.assertEqual(self.client.post('/api/storage-sessions/authenticate', json={'compartment_id': 1, 'password': 'shoe-pass'}).status_code, 200)
        self.assertEqual(self.sql('SELECT session_status FROM storage_session')[0][0], 'RESERVED')

    def test_checkout_requires_physical_confirmation_revokes_all_tokens(self):
        self.public_mode()
        access = self.reserve()
        other = self.client.post('/api/storage-sessions/authenticate', json={'compartment_id': 1, 'password': 'shoe-pass'}).json['data']
        headers = self.headers(access['access_token'])
        checkout = f"/api/storage-sessions/{access['session']['session_id']}/checkout"
        self.assertEqual(self.client.post(checkout, headers=headers).status_code, 409)
        self.observe(shoe_status='OCCUPIED')
        self.assertEqual(self.client.post(checkout, headers=headers).status_code, 200)
        self.assertEqual(self.sql('SELECT session_status FROM storage_session')[0][0], 'ACTIVE')
        self.observe(door_status='OPEN')
        self.assertEqual(self.sql('SELECT session_status FROM storage_session')[0][0], 'ACTIVE')
        self.observe(shoe_status='EMPTY')
        row = self.sql('SELECT * FROM storage_session')[0]
        self.assertEqual(row['session_status'], 'COMPLETED')
        self.assertIsNone(row['password_hash'])
        self.assertIsNone(row['token_hash'])
        for token in (access['access_token'], other['access_token']):
            self.assertEqual(self.client.get('/api/storage-sessions/me', headers=self.headers(token)).status_code, 401)
        self.assertEqual(self.client.post('/api/storage-sessions/authenticate', json={'compartment_id': 1, 'password': 'shoe-pass'}).status_code, 401)

    def test_checkout_failure_preserves_session(self):
        self.public_mode()
        access = self.reserve()
        self.observe(shoe_status='OCCUPIED', door_status='ERROR')
        response = self.client.post(f"/api/storage-sessions/{access['session']['session_id']}/checkout", headers=self.headers(access['access_token']))
        self.assertEqual(response.status_code, 409)
        row = self.sql('SELECT * FROM storage_session')[0]
        self.assertEqual(row['session_status'], 'ACTIVE')
        self.assertIsNotNone(row['password_hash'])
        self.assertEqual(self.client.get('/api/storage-sessions/me', headers=self.headers(access['access_token'])).status_code, 200)

    def test_unexpected_removal_does_not_complete(self):
        self.public_mode()
        access = self.reserve()
        self.observe(shoe_status='OCCUPIED')
        self.observe(shoe_status='EMPTY')
        self.assertEqual(self.sql('SELECT session_status FROM storage_session')[0][0], 'ACTIVE')
        self.assertEqual(self.sql("SELECT event_type FROM shoe_event WHERE event_type='UNEXPECTED_REMOVAL'")[0][0], 'UNEXPECTED_REMOVAL')
        self.assertEqual(self.client.get('/api/storage-sessions/me', headers=self.headers(access['access_token'])).status_code, 200)

    def test_cancel_and_expire_reservations(self):
        self.public_mode()
        access = self.reserve()
        self.assertEqual(self.client.post(f"/api/storage-sessions/{access['session']['session_id']}/cancel", headers=self.headers(access['access_token'])).status_code, 200)
        self.assertIsNone(self.sql('SELECT password_hash FROM storage_session')[0][0])
        access = self.reserve()
        self.sql("UPDATE storage_session SET reservation_expires_at='2000-01-01T00:00:00+00:00' WHERE session_status='RESERVED'")
        self.assertEqual(self.client.get('/api/compartments').json['data'][0]['availability'], 'AVAILABLE')
        self.assertEqual(self.client.get('/api/storage-sessions/me', headers=self.headers(access['access_token'])).status_code, 401)

    def test_rate_limit_and_input_validation(self):
        self.public_mode()
        self.reserve()
        for _ in range(5):
            self.assertEqual(self.client.post('/api/storage-sessions/authenticate', json={'compartment_id': 1, 'password': 'wrong'}).status_code, 401)
        self.assertEqual(self.client.post('/api/storage-sessions/authenticate', json={'compartment_id': 1, 'password': 'shoe-pass'}).status_code, 429)
        self.assertEqual(self.client.post('/api/storage-sessions', json=[]).status_code, 400)
        self.assertEqual(self.client.post('/api/storage-sessions', json={'compartment_id': True, 'password': 'test'}).status_code, 400)

    def test_admin_boundaries_and_mode_change_guard(self):
        self.public_mode()
        access = self.reserve()
        for path in ('/api/admin/events', '/api/admin/compartments'):
            self.assertEqual(self.client.get(path).status_code, 401)
            self.assertEqual(self.client.get(path, headers=self.headers(access['access_token'])).status_code, 403)
        self.assertEqual(self.client.post('/api/admin/mock/compartments/1', json={'shoe_status': 'EMPTY'}).status_code, 401)
        self.assertEqual(self.client.patch('/api/admin/cabinet/mode', json={'mode': 'HOME'}, headers=self.headers(self.admin)).status_code, 409)
        self.client.post('/api/admin/logout', headers=self.headers(self.admin))
        self.assertEqual(self.client.get('/api/admin/events', headers=self.headers(self.admin)).status_code, 401)

    def test_home_session_does_not_use_password_or_token(self):
        access = self.reserve()
        self.assertNotIn('access_token', access)
        row = self.sql('SELECT * FROM storage_session')[0]
        self.assertIsNone(row['auth_type'])
        self.assertIsNone(row['password_hash'])
        self.assertIsNone(row['token_hash'])

    def test_restart_persists_data_and_rejects_cross_origin(self):
        self.public_mode()
        self.reserve()
        app = create_app({'TESTING': True, 'DATABASE': self.db_path})
        self.assertEqual(app.test_client().get('/api/compartments').json['data'][0]['availability'], 'RESERVED')
        self.assertEqual(self.client.post('/api/storage-sessions', json={}, headers={'Origin': 'https://other.example'}).status_code, 403)

    def test_motor_command_without_open_confirmation_keeps_access(self):
        self.public_mode()
        access = self.reserve()
        self.observe(shoe_status='OCCUPIED')
        self.client.post(f"/api/storage-sessions/{access['session']['session_id']}/checkout", headers=self.headers(access['access_token']))
        self.observe(shoe_status='EMPTY')
        self.assertEqual(self.sql('SELECT session_status FROM storage_session')[0][0], 'ACTIVE')
        self.assertEqual(self.client.get('/api/storage-sessions/me', headers=self.headers(access['access_token'])).status_code, 200)
        self.assertEqual(self.client.post('/api/admin/mock/compartments/1', json={'door_status': 'OPEN'}, headers=self.headers(access['access_token'])).status_code, 403)

    def test_invalid_requests_have_consistent_errors(self):
        for path in ('/api/compartments/99', '/api/cabinets/99'):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 404)
            self.assertFalse(response.json['success'])
            self.assertIsNone(response.json['data'])
        response = self.client.post('/api/storage-sessions', data='{}', content_type='text/plain')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json['error']['code'], 'INVALID_REQUEST')
