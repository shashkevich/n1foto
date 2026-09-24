"""Seed missing editable pages and append explicitly allowed missing sections."""

import ftplib
import io
import json
import os
from pathlib import Path, PurePosixPath
import uuid


REMOTE_DIRECTORY = "/n1foto.com/public_html/db/pages"
PAGE_SEEDS = {
    "shary.json": ["shary"],
    "magnity.json": ["magnity"],
    "pechat-na-podushkah.json": ["podushki"],
    "pechat-na-sumkah.json": ["shoppery"],
    "pazly.json": ["puzzles"],
    "kovriki.json": ["kovriki"],
    "ocifrovka-videokasset.json": ["ocifrovka"],
    "vlagostoykie-ramki.json": ["vlagostoykie-ramki"],
    "tablichki.json": ["plastic-sign", "address-signs"],
    "printcanvas.json": ["canvas-standard", "canvas-styles"],
    "pechat-na-kruzhkah.json": ["kruzhki"],
    "butylki.json": ["butylki"],
    "bage.json": ["bages"],
    "insta-pechat.json": ["polaroid"],
    "bloknoty.json": ["bloknoty"],
    "sostavlenie-kollagey.json": ["kollagi", "restoration"],
}
# Existing calculator values and all other remote content remain authoritative.
SECTION_MERGES = {"tablichki.json": ["address-signs"], "sostavlenie-kollagey.json": ["restoration"]}


def read_seed(name):
    root = Path(__file__).resolve().parents[2]
    payload = (root / "db" / "pages" / name).read_bytes()
    data = json.loads(payload.decode("utf-8"))
    sections = data.get("sections", [])
    if not isinstance(sections, list) or set(PAGE_SEEDS[name]) - {item.get("id") for item in sections}:
        raise ValueError(f"{name}: required page sections are missing.")

    for section in sections:
        if not section.get("cards"):
            raise ValueError(f"{name}: the seed must contain working cards.")
        for card in section["cards"]:
            if not card.get("id") or not card.get("title"):
                raise ValueError(f"{name}: every card needs an ID and a title.")
            product = card.get("cardType") == "product" or name == "shary.json"
            if product and not card.get("img"):
                raise ValueError(f"{name}: product cards must have an image.")
            for image in card.get("img", []):
                image_path = (root / image).resolve()
                if not image_path.is_relative_to(root) or not image_path.is_file():
                    raise ValueError(f"{name}: a referenced image is missing: {image}")
            if card.get("cardType") == "restoration":
                if len(card.get("img", [])) != 2 or not card.get("price_title"):
                    raise ValueError(f"{name}: restoration needs before/after images and a price note.")
            elif product or not card.get("calculatorType"):
                rows = card.get("table", [])
                if not rows:
                    raise ValueError(f"{name}: prices must not be empty.")
                headers = list(rows[0])
                for row in rows:
                    if list(row) != headers or not all(str(value).strip() for value in row.values()):
                        raise ValueError(f"{name}: incomplete price row.")
                    if product and len(row) != 2:
                        raise ValueError(f"{name}: product prices need condition and price columns.")
    return payload


def remote_names(ftp):
    # A failed directory listing is an error, never evidence that JSON is missing.
    # NLST also works on FTP servers that do not implement MLSD.
    return {PurePosixPath(name.rstrip("/")).name for name in ftp.nlst()}


def read_remote(ftp, name):
    content = io.BytesIO()
    ftp.retrbinary(f"RETR {name}", content.write)
    return content.getvalue()


def merge_missing_sections(original, seed, section_ids):
    current = json.loads(original.decode("utf-8"))
    source = json.loads(seed.decode("utf-8"))
    sections = current.get("sections")
    if not isinstance(sections, list) or not all(isinstance(section, dict) and section.get("id") for section in sections):
        raise ValueError("Existing page sections could not be read safely.")
    existing_ids = {section["id"] for section in sections}
    if len(existing_ids) != len(sections):
        raise ValueError("Existing page has duplicate section IDs; initialization stopped.")
    missing = set(section_ids) - existing_ids
    if not missing:
        return None
    additions = [section for section in source["sections"] if section["id"] in missing]
    if {section["id"] for section in additions} != missing:
        raise ValueError("The seed is missing a required section.")
    sections.extend(additions)
    return (json.dumps(current, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def publish_seed(ftp, name, payload, expected=None):
    temporary_name = f".{name}-seed-{uuid.uuid4().hex}.tmp"
    temporary_exists = True
    try:
        ftp.storbinary(f"STOR {temporary_name}", io.BytesIO(payload))
        if ftp.size(temporary_name) != len(payload):
            raise RuntimeError(f"{name}: the uploaded seed could not be verified.")

        if expected is None:
            if name in remote_names(ftp):
                print(f"{name} appeared during initialization; preserving it.")
                return False
        elif read_remote(ftp, name) != expected:
            raise RuntimeError(f"{name} changed during initialization; admin edits are preserved. Retry deployment.")

        ftp.rename(temporary_name, name)
        temporary_exists = False
        print(f"{'Initialized' if expected is None else 'Added missing sections to'} {name}.")
        return True
    finally:
        if temporary_exists:
            try:
                ftp.delete(temporary_name)
            except ftplib.all_errors:
                # Only this run's temporary upload may be removed during cleanup.
                pass


def seed_page(ftp, name, payload):
    ftp.cwd(REMOTE_DIRECTORY)
    if name not in remote_names(ftp):
        return publish_seed(ftp, name, payload)
    if name not in SECTION_MERGES:
        print(f"{name} already exists; preserving the production data.")
        return False
    original = read_remote(ftp, name)
    merged = merge_missing_sections(original, payload, SECTION_MERGES[name])
    if merged is None:
        print(f"{name} already has the required sections; preserving the production data.")
        return False
    return publish_seed(ftp, name, merged, expected=original)


def main():
    seeds = {name: read_seed(name) for name in PAGE_SEEDS}
    with ftplib.FTP(timeout=30) as ftp:
        ftp.connect(os.environ["FTP_SERVER"])
        ftp.login(os.environ["FTP_USER"], os.environ["FTP_PASSWORD"])
        for name, payload in seeds.items():
            seed_page(ftp, name, payload)


if __name__ == "__main__":
    main()
