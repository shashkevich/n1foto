"""Offline checks for the production-data preservation rules."""

import ftplib
import importlib.util
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location(
    "seed_shary_data", Path(__file__).with_name("seed-shary-data.py")
)
seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed)


class FakeFTP:
    def __init__(self, files=None, fail_listing=False, corrupt_upload=False, concurrent_data=None):
        self.files = dict(files or {})
        self.fail_listing = fail_listing
        self.corrupt_upload = corrupt_upload
        self.concurrent_data = concurrent_data
        self.uploads = []

    def cwd(self, path):
        self.directory = path

    def nlst(self):
        if self.fail_listing:
            raise ftplib.error_perm("550 Cannot read directory")
        return [f"{self.directory}/{name}" for name in self.files]

    def storbinary(self, command, stream):
        name = command.removeprefix("STOR ")
        self.uploads.append(name)
        self.files[name] = b"incomplete" if self.corrupt_upload else stream.read()
        if self.concurrent_data is not None:
            self.files[seed.REMOTE_NAME] = self.concurrent_data

    def size(self, name):
        return len(self.files[name])

    def rename(self, source, target):
        if target in self.files:
            raise AssertionError("Attempted to replace existing production data")
        self.files[target] = self.files.pop(source)

    def delete(self, name):
        del self.files[name]


class SeedPreservationTests(unittest.TestCase):
    def test_working_seed_is_valid_utf8(self):
        payload = seed.read_seed()
        self.assertGreater(len(payload), 0)
        self.assertIn("Пластиковый шар", payload.decode("utf-8"))

    def test_existing_admin_data_is_untouched(self):
        original = b'{"prices":"changed in admin"}'
        ftp = FakeFTP({seed.REMOTE_NAME: original})
        self.assertFalse(seed.seed_if_missing(ftp, b"seed"))
        self.assertEqual(ftp.files, {seed.REMOTE_NAME: original})
        self.assertEqual(ftp.uploads, [])

    def test_missing_data_is_initialized_and_second_run_preserves_it(self):
        ftp = FakeFTP({"other.json": b"other page"})
        self.assertTrue(seed.seed_if_missing(ftp, b"first seed"))
        self.assertFalse(seed.seed_if_missing(ftp, b"different seed"))
        self.assertEqual(ftp.files, {"other.json": b"other page", seed.REMOTE_NAME: b"first seed"})

    def test_failed_listing_never_triggers_an_upload(self):
        ftp = FakeFTP(fail_listing=True)
        with self.assertRaises(ftplib.error_perm):
            seed.seed_if_missing(ftp, b"seed")
        self.assertEqual(ftp.uploads, [])

    def test_file_created_during_upload_is_preserved(self):
        ftp = FakeFTP(concurrent_data=b"new admin data")
        self.assertFalse(seed.seed_if_missing(ftp, b"seed"))
        self.assertEqual(ftp.files, {seed.REMOTE_NAME: b"new admin data"})

    def test_incomplete_upload_is_not_published(self):
        ftp = FakeFTP(corrupt_upload=True)
        with self.assertRaises(RuntimeError):
            seed.seed_if_missing(ftp, b"seed")
        self.assertEqual(ftp.files, {})


if __name__ == "__main__":
    unittest.main()
