import os
import sys
import tempfile
import unittest
from io import BytesIO

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import server


class ServerUploadTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.upload_dir = os.path.join(self.temp_dir.name, 'uploads')
        self.state_file = os.path.join(self.temp_dir.name, 'data', 'state.json')
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
        server.UPLOAD_DIR = self.upload_dir
        server.STATE_FILE = self.state_file
        server.STATE = {'galleryState': {0: [], 1: [], 2: []}, 'heroImage': None}

    def test_state_file_uses_data_directory(self):
        self.assertTrue(server.STATE_FILE.endswith(os.path.join('data', 'state.json')))

    def test_hero_upload_updates_state_and_saves_file(self):
        client = server.app.test_client()
        image_bytes = b'fake-image-bytes'
        response = client.post('/api/upload/hero', data={
            'file': (BytesIO(image_bytes), 'hero.jpg')
        }, content_type='multipart/form-data')

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['ok'])
        self.assertTrue(data['url'].startswith('/uploads/'))

        saved_path = os.path.join(self.upload_dir, os.path.basename(data['url']))
        self.assertTrue(os.path.exists(saved_path))
        self.assertEqual(server.STATE['heroImage'], data['url'])

    def test_gallery_upload_updates_state_with_string_keys(self):
        client = server.app.test_client()
        image_bytes = b'fake-gallery-bytes'
        response = client.post('/api/upload', data={
            'file': (BytesIO(image_bytes), 'gallery.jpg'),
            'index': '1'
        }, content_type='multipart/form-data')

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['ok'])
        self.assertTrue(data['url'].startswith('/uploads/'))
        self.assertIn('1', server.STATE['galleryState'])
        self.assertEqual(server.STATE['galleryState']['1'], [data['url']])

    def test_remove_image_returns_ok_when_url_not_found(self):
        client = server.app.test_client()
        response = client.post('/api/remove-image', json={'url': '/uploads/nonexistent.jpg'})

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['ok'])
        self.assertFalse(data.get('removed', True))


if __name__ == '__main__':
    unittest.main()
