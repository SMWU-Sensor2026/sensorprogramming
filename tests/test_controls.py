import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from werkzeug.security import generate_password_hash
from app import create_app
from hardware.backend import load_driver


class TeamTestDriver:
    is_mock = False

    def __init__(self):
        self.states = {i: {'shoe_status': 'EMPTY', 'door_status': 'CLOSED', 'temperature': 25.5, 'humidity': 45, 'circulation_fan_status': 'OFF', 'exhaust_fan_status': 'OFF'} for i in (1, 2)}
        self.calls = []
        self.reject = False

    def read_compartment(self, slot):
        return self.states[slot]

    def read_external_environment(self):
        return {'temperature': 20, 'humidity': 40, 'is_valid': True}

    def open_door(self, slot):
        self.calls.append(('open', slot))
        return not self.reject

    def close_door(self, slot):
        self.calls.append(('close', slot))
        return not self.reject

    def set_fans(self, slot, circulation, exhaust):
        self.calls.append(('fans', slot, circulation, exhaust))
        return not self.reject


class DemoControlsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.admin_hash = generate_password_hash('team-password')

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = str(Path(self.temp.name) / 'demo.db')
        self.app = create_app({'TESTING': True, 'DATABASE': self.path, 'DEMO_MODE': True, 'ADMIN_PASSWORD_HASH': None})
        self.client = self.app.test_client()
        response = self.client.post('/api/admin/login', json={})
        self.assertEqual(response.status_code, 200)
        self.admin = {'Authorization': 'Bearer '+response.json['data']['access_token']}

    def post(self, path, data, headers=None):
        response = self.client.post('/api'+path, json=data, headers=headers)
        self.assertLess(response.status_code, 300, response.json)
        return response.json['data']

    def state(self):
        return self.client.get('/api/compartments/1').json['data']

    def test_demo_admin_opens_without_password(self):
        dist = Path(self.temp.name) / 'dist'
        dist.mkdir()
        (dist / 'index.html').write_text('<div id="root"></div>')
        self.app.config['FRONTEND_DIST'] = str(dist)
        with self.client.get('/admin') as response:
            self.assertEqual(response.status_code, 200)
        self.assertTrue(self.client.get('/api/config').json['data']['demo_mode'])
        self.assertEqual(self.client.get('/api/admin/events').status_code, 401)
        self.assertEqual(self.client.get('/api/admin/events', headers=self.admin).status_code, 200)

    def test_home_buttons_and_auto_session_and_drying_records(self):
        self.post('/compartments/1/door', {'door_status': 'OPEN'})
        self.assertEqual(self.state()['door_status'], 'OPEN')
        self.post('/compartments/1/simulate', {'shoe_status': 'OCCUPIED', 'humidity': 65})
        state = self.state()
        self.assertEqual(state['session']['session_status'], 'ACTIVE')
        self.assertIsNone(state['session']['auth_type'])
        self.assertEqual(state['fan_status'], 'ON')
        self.post('/compartments/1/fans', {'enabled': False})
        rows = self.client.get('/api/admin/drying-sessions', headers=self.admin).json['data']
        self.assertEqual(rows[0]['result'], 'IDLE')  # manual stop is not proof of dry shoes
        self.post('/compartments/1/fans', {'enabled': True})
        self.post('/compartments/1/simulate', {'humidity': 45})
        self.assertEqual(self.state()['fan_status'], 'OFF')
        self.post('/compartments/1/simulate', {'shoe_status': 'EMPTY'})
        self.post('/compartments/1/door', {'door_status': 'CLOSED'})
        self.assertEqual(self.state()['availability'], 'AVAILABLE')
        self.assertIsNone(self.state()['session'])
        rows = self.client.get('/api/admin/drying-sessions', headers=self.admin).json['data']
        self.assertEqual(rows[0]['result'], 'COMPLETED')
        self.assertIsNotNone(rows[0]['duration_seconds'])

    def test_public_buttons_scope_and_checkout(self):
        self.assertEqual(self.client.patch('/api/admin/cabinet/mode', json={'mode': 'PUBLIC'}, headers=self.admin).status_code, 200)
        access = self.post('/storage-sessions', {'compartment_id': 1, 'password': 'shoe-pass'})
        user = {'Authorization': 'Bearer '+access['access_token']}
        self.assertEqual(self.client.post('/api/compartments/1/door', json={'door_status': 'OPEN'}).status_code, 401)
        self.assertEqual(self.client.post('/api/compartments/2/door', json={'door_status': 'OPEN'}, headers=user).status_code, 403)
        self.post('/compartments/1/door', {'door_status': 'OPEN'}, user)
        self.post('/compartments/1/simulate', {'shoe_status': 'OCCUPIED', 'humidity': 65}, user)
        self.post('/compartments/1/door', {'door_status': 'CLOSED'}, user)
        self.post('/compartments/1/door', {'door_status': 'OPEN'}, user)
        self.assertEqual(self.client.get('/api/storage-sessions/me', headers=user).json['data']['session_status'], 'ACTIVE')
        self.post('/compartments/1/simulate', {'shoe_status': 'EMPTY'}, user)
        self.assertEqual(self.client.get('/api/storage-sessions/me', headers=user).status_code, 401)
        self.post('/compartments/1/door', {'door_status': 'CLOSED'}, self.admin)
        self.assertEqual(self.client.get('/api/compartments').json['data'][0]['availability'], 'AVAILABLE')

    def test_admin_can_command_public_occupied_slot(self):
        self.client.patch('/api/admin/cabinet/mode', json={'mode': 'PUBLIC'}, headers=self.admin)
        self.post('/storage-sessions', {'compartment_id': 1, 'password': 'shoe-pass'})
        self.post('/admin/mock/compartments/1', {'shoe_status': 'OCCUPIED'}, self.admin)
        self.post('/compartments/1/door', {'door_status': 'OPEN'}, self.admin)
        states = self.client.get('/api/admin/compartments', headers=self.admin).json['data']
        self.assertEqual(states[0]['door_status'], 'OPEN')

    def test_reset_clears_sessions_but_preserves_records(self):
        self.post('/compartments/1/simulate', {'shoe_status': 'OCCUPIED', 'humidity': 65})
        self.post('/admin/demo/reset', {}, self.admin)
        self.assertEqual(self.state()['availability'], 'AVAILABLE')
        self.assertEqual(self.state()['fan_status'], 'OFF')
        self.assertTrue(self.client.get('/api/admin/events', headers=self.admin).json['data'])

    def test_invalid_controls_and_sensor_input_rollback(self):
        for path, data in [('/compartments/1/door', {'door_status': 'INVALID'}), ('/compartments/1/fans', {'enabled': 'yes'}), ('/compartments/1/simulate', {'humidity': 101}), ('/compartments/1/simulate', {'session_status': 'COMPLETED'})]:
            self.assertEqual(self.client.post('/api'+path, json=data).status_code, 400)
        self.assertEqual(self.state()['availability'], 'AVAILABLE')

    def test_secure_mode_does_not_bypass_login(self):
        self.app.config.update(DEMO_MODE=False, ADMIN_PASSWORD_HASH=self.admin_hash)
        self.assertEqual(self.client.post('/api/admin/login', json={}).status_code, 401)
        self.assertEqual(self.client.post('/api/admin/login', json={'password': 'team-password'}).status_code, 200)
        self.assertEqual(self.client.post('/api/compartments/1/simulate', json={'shoe_status': 'EMPTY'}).status_code, 403)

    def test_real_driver_contract_and_physical_confirmation(self):
        driver = TeamTestDriver()
        app = create_app({'TESTING': True, 'DATABASE': str(Path(self.temp.name) / 'real.db'), 'HARDWARE_DRIVER': driver, 'DEMO_MODE': True, 'ADMIN_PASSWORD_HASH': self.admin_hash})
        client = app.test_client()
        self.assertFalse(client.get('/api/config').json['data']['demo_mode'])
        self.assertEqual(client.post('/api/admin/login', json={}).status_code, 401)
        admin = {'Authorization': 'Bearer '+client.post('/api/admin/login', json={'password': 'team-password'}).json['data']['access_token']}
        self.assertEqual(client.post('/api/admin/mock/compartments/1', json={'shoe_status': 'EMPTY'}, headers=admin).status_code, 403)
        client.post('/api/compartments/1/door', json={'door_status': 'OPEN'})
        self.assertIn(('open', 1), driver.calls)
        state = client.get('/api/compartments/1').json['data']
        self.assertEqual(state['door_status'], 'CLOSED')  # servo command is not a sensor confirmation
        self.assertEqual(state['temperature'], 25.5)
        client.post('/api/compartments/1/fans', json={'enabled': True})
        self.assertIn(('fans', 1, True, True), driver.calls)
        driver.states[1].update(shoe_status='OCCUPIED', humidity=65)
        state = client.get('/api/compartments/1').json['data']
        self.assertEqual(state['session']['session_status'], 'ACTIVE')
        driver.reject = True
        response = client.post('/api/compartments/1/door', json={'door_status': 'OPEN'})
        self.assertEqual(response.status_code, 503)
        with sqlite3.connect(app.config['DATABASE']) as db:
            self.assertEqual(db.execute('SELECT session_status FROM storage_session').fetchone()[0], 'ACTIVE')

    def test_team_driver_file_is_loaded(self):
        path = Path(self.temp.name)
        (path / 'team_driver.py').write_text('''class Driver:
 is_mock = False
 def read_compartment(self, i): return {}
 def read_external_environment(self): return {}
 def open_door(self, i): return True
 def close_door(self, i): return True
 def set_fans(self, i, a, b): return True

def create_driver(): return Driver()
''')
        with patch('hardware.backend.__file__', str(path / 'backend.py')):
            self.assertFalse(load_driver().is_mock)
        (path / 'team_driver.py').write_text('def create_driver(): return object()')
        with patch('hardware.backend.__file__', str(path / 'backend.py')):
            with self.assertRaises(TypeError):
                load_driver()
