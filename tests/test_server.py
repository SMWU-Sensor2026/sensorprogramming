import unittest
from app import create_app


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.client = create_app().test_client()

    def test_page_and_assets(self):
        page = self.client.get('/')
        self.assertEqual(page.status_code, 200)
        for path in ('/static/css/style.css', '/static/js/script.js', '/static/js/weather.js'):
            self.assertIn(path.encode(), page.data)
            with self.client.get(path) as asset:
                self.assertEqual(asset.status_code, 200)

    def test_mock_contract(self):
        cabinet = self.client.get('/api/cabinets/1').json['data']
        self.assertEqual(cabinet['mode'], 'HOME')
        self.assertEqual(cabinet['hardware_mode'], 'MOCK')
        states = self.client.get('/api/compartments').json['data']
        self.assertEqual(len(states), 2)
        self.assertTrue(all(c['remaining_seconds'] is None for c in states))
        self.assertEqual(self.client.get('/api/compartments/1').json['data']['compartment_id'], 1)

    def test_unknown_compartment(self):
        response = self.client.get('/api/compartments/99')
        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.json['success'])
        self.assertIsNone(response.json['data'])

    def test_unimplemented_mutations_do_not_succeed(self):
        for path in ('/api/admin/cabinet/mode', '/api/storage-sessions'):
            self.assertEqual(self.client.post(path, json={}).status_code, 501)


if __name__ == '__main__':
    unittest.main()
