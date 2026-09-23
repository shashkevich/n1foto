"""Offline checks for preserving admin edits while seeding editable pages."""

from contextlib import redirect_stdout
import copy
import ftplib
import importlib.util
import io
import json
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location(
    "seed_page_data", Path(__file__).with_name("seed-page-data.py")
)
seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed)


def encode(data):
    return json.dumps(data, ensure_ascii=False).encode("utf-8")


class FakeFTP:
    def __init__(self, files=None, fail_listing=False, corrupt_upload=False,
                 concurrent_files=None, fail_read=False, fail_rename=False):
        self.files = dict(files or {})
        self.fail_listing = fail_listing
        self.corrupt_upload = corrupt_upload
        self.concurrent_files = concurrent_files or {}
        self.fail_read = fail_read
        self.fail_rename = fail_rename
        self.uploads = []
        self.renames = []

    def cwd(self, path):
        self.directory = path

    def nlst(self):
        if self.fail_listing:
            raise ftplib.error_perm("550 Cannot read directory")
        return [f"{self.directory}/{name}" for name in self.files]

    def retrbinary(self, command, callback):
        if self.fail_read:
            raise ftplib.error_perm("550 Cannot read file")
        callback(self.files[command.removeprefix("RETR ")])

    def storbinary(self, command, stream):
        name = command.removeprefix("STOR ")
        self.uploads.append(name)
        self.files[name] = b"incomplete" if self.corrupt_upload else stream.read()
        self.files.update(self.concurrent_files)

    def size(self, name):
        return len(self.files[name])

    def rename(self, source, target):
        if self.fail_rename:
            raise ftplib.error_perm("550 Cannot rename file")
        if target in self.files and target not in seed.SECTION_MERGES:
            raise AssertionError("Attempted to replace existing page data")
        self.renames.append(target)
        self.files[target] = self.files.pop(source)

    def delete(self, name):
        del self.files[name]


class SeedPreservationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.seeds = {name: seed.read_seed(name) for name in seed.PAGE_SEEDS}

    def setUp(self):
        quiet = redirect_stdout(io.StringIO())
        quiet.__enter__()
        self.addCleanup(quiet.__exit__, None, None, None)
        self.production = {
            "meta": {"updatedAt": "changed in admin", "custom": "keep this"},
            "sections": [
                {"id": "plastic-sign", "title": "Custom title", "cards": [{
                    "id": "plastic-sign-calculator", "calculatorType": "plastic-sign",
                    "img": ["img/tablichki/uploads/admin-image.jpg"],
                    "minimumOrder": 2468, "cutPrice": 321, "areaThreshold": 9,
                    "materials": [{"id": "custom-material", "priceUpToThreshold": 7777,
                                   "priceAboveThreshold": 6666}],
                    "footer": "Custom calculator note",
                }]},
                {"id": "future-section", "cards": [{"unknown": "preserve future data"}]},
            ],
            "futureSetting": {"value": 42},
        }

    def test_all_working_seeds_are_present(self):
        self.assertEqual(len(self.seeds), 15)  # Product pages, existing calculators and collages.
        for name, payload in self.seeds.items():
            with self.subTest(page=name):
                self.assertTrue(json.loads(payload)["sections"])

    def test_existing_pages_are_preserved_byte_for_byte(self):
        for name in self.seeds.keys() - seed.SECTION_MERGES.keys():
            with self.subTest(page=name):
                original = encode({"adminPrice": 12345, "img": "img/uploads/edited.jpg"})
                ftp = FakeFTP({name: original})
                self.assertFalse(seed.seed_page(ftp, name, self.seeds[name]))
                self.assertEqual(ftp.files, {name: original})
                self.assertEqual(ftp.uploads, [])

    def test_all_missing_pages_are_initialized_once(self):
        ftp = FakeFTP({"unrelated.json": b"unrelated data"})
        for name, payload in self.seeds.items():
            self.assertTrue(seed.seed_page(ftp, name, payload))
        expected = dict(ftp.files)
        for name, payload in self.seeds.items():
            self.assertFalse(seed.seed_page(ftp, name, payload))
        self.assertEqual(ftp.files, expected)
        self.assertEqual(ftp.files, {"unrelated.json": b"unrelated data", **self.seeds})

    def test_missing_address_section_preserves_all_existing_values(self):
        original = copy.deepcopy(self.production)
        ftp = FakeFTP({"tablichki.json": encode(original)})
        self.assertTrue(seed.seed_page(ftp, "tablichki.json", self.seeds["tablichki.json"]))
        merged = json.loads(ftp.files["tablichki.json"])
        addition = merged["sections"].pop()
        self.assertEqual(merged, original)
        self.assertEqual(addition["id"], "address-signs")
        local_addresses = next(section for section in json.loads(self.seeds["tablichki.json"])["sections"]
                               if section["id"] == "address-signs")
        self.assertEqual(addition, local_addresses)

    def test_existing_address_prices_and_images_are_never_reseeded(self):
        self.production["sections"].append({"id": "address-signs", "cards": [{
            "id": "address-signs-1", "img": ["img/tablichki/uploads/custom.jpg"],
            "table": [{"Условие": "70×40 см", "Цена": "9999 ₽"}],
        }]})
        original = encode(self.production)
        ftp = FakeFTP({"tablichki.json": original})
        self.assertFalse(seed.seed_page(ftp, "tablichki.json", self.seeds["tablichki.json"]))
        self.assertEqual(ftp.files, {"tablichki.json": original})
        self.assertEqual(ftp.uploads, [])

    def test_concurrent_admin_changes_abort_section_merge(self):
        changed = copy.deepcopy(self.production)
        changed["sections"][0]["cards"][0]["minimumOrder"] = 9876
        changed["sections"][0]["cards"][0]["img"] = ["img/tablichki/uploads/newer.jpg"]
        newest = encode(changed)
        ftp = FakeFTP({"tablichki.json": encode(self.production)},
                      concurrent_files={"tablichki.json": newest})
        with self.assertRaisesRegex(RuntimeError, "changed during initialization"):
            seed.seed_page(ftp, "tablichki.json", self.seeds["tablichki.json"])
        self.assertEqual(ftp.files, {"tablichki.json": newest})
        self.assertEqual(ftp.renames, [])

    def test_concurrent_creation_is_preserved(self):
        newest = b"data created by another process"
        ftp = FakeFTP(concurrent_files={"shary.json": newest})
        self.assertFalse(seed.seed_page(ftp, "shary.json", self.seeds["shary.json"]))
        self.assertEqual(ftp.files, {"shary.json": newest})

    def test_failed_listing_never_triggers_upload(self):
        ftp = FakeFTP(fail_listing=True)
        with self.assertRaises(ftplib.error_perm):
            seed.seed_page(ftp, "magnity.json", self.seeds["magnity.json"])
        self.assertEqual(ftp.uploads, [])

    def test_unreadable_remote_page_is_not_replaced(self):
        original = encode(self.production)
        ftp = FakeFTP({"tablichki.json": original}, fail_read=True)
        with self.assertRaises(ftplib.error_perm):
            seed.seed_page(ftp, "tablichki.json", self.seeds["tablichki.json"])
        self.assertEqual(ftp.files, {"tablichki.json": original})
        self.assertEqual(ftp.uploads, [])

    def test_invalid_remote_sections_fail_without_writes(self):
        for original in (b"invalid JSON", b'{"sections":{}}',
                         b'{"sections":[{"id":"same"},{"id":"same"}]}'):
            with self.subTest(data=original):
                ftp = FakeFTP({"tablichki.json": original})
                with self.assertRaises(ValueError):
                    seed.seed_page(ftp, "tablichki.json", self.seeds["tablichki.json"])
                self.assertEqual(ftp.files, {"tablichki.json": original})
                self.assertEqual(ftp.uploads, [])

    def test_incomplete_upload_preserves_existing_calculator(self):
        original = encode(self.production)
        ftp = FakeFTP({"tablichki.json": original}, corrupt_upload=True)
        with self.assertRaises(RuntimeError):
            seed.seed_page(ftp, "tablichki.json", self.seeds["tablichki.json"])
        self.assertEqual(ftp.files, {"tablichki.json": original})

    def test_failed_publish_preserves_existing_calculator(self):
        original = encode(self.production)
        ftp = FakeFTP({"tablichki.json": original}, fail_rename=True)
        with self.assertRaises(ftplib.error_perm):
            seed.seed_page(ftp, "tablichki.json", self.seeds["tablichki.json"])
        self.assertEqual(ftp.files, {"tablichki.json": original})


if __name__ == "__main__":
    unittest.main()
