import importlib.util
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('backup_uploads', Path(__file__).with_name('backup-uploads.py'))
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


class BackupTests(unittest.TestCase):
    def test_verified_archive_and_retention_preserve_uploads(self):
        with tempfile.TemporaryDirectory() as root:
            source = Path(root) / 'uploads'
            destination = Path(root) / 'backups'
            (source / 'images').mkdir(parents=True)
            (source / 'pdfs').mkdir()
            (source / 'images' / 'test.png').write_bytes(b'image')
            (source / 'pdfs' / 'manual.pdf').write_bytes(b'document')
            for _ in range(3):
                result = backup.create_backup(source, destination, keep=2)
            self.assertTrue(result['verified'])
            self.assertEqual(len(list(destination.glob('uploads-*.tar.gz'))), 2)
            self.assertEqual((source / 'images' / 'test.png').read_bytes(), b'image')
            with tarfile.open(destination / result['archive']) as archive:
                self.assertEqual(archive.extractfile('uploads/pdfs/manual.pdf').read(), b'document')
                manifest = json.load(archive.extractfile('manifest.json'))
                self.assertEqual(len(manifest), 2)
            self.assertEqual(list(destination.glob('.pending-*')), [])

    def test_rejects_missing_storage_without_creating_backup(self):
        with tempfile.TemporaryDirectory() as root:
            destination = Path(root) / 'backups'
            with self.assertRaises(RuntimeError):
                backup.create_backup(root, destination)
            self.assertFalse(destination.exists())


if __name__ == '__main__':
    unittest.main()
