"""Initialize shary.json once; subsequent deployments preserve admin edits."""

import ftplib
import io
import json
import os
from pathlib import Path, PurePosixPath
import uuid


REMOTE_DIRECTORY = "/n1foto.com/public_html/db/pages"
REMOTE_NAME = "shary.json"


def read_seed():
    root = Path(__file__).resolve().parents[2]
    payload = (root / "db" / "pages" / REMOTE_NAME).read_bytes()
    data = json.loads(payload.decode("utf-8"))
    sections = data.get("sections", [])
    section = next((item for item in sections if item.get("id") == "shary"), None)
    if not section or not section.get("cards"):
        raise ValueError("The ornament seed must contain working product cards.")

    for card in section["cards"]:
        if not card.get("id") or not card.get("title") or not card.get("img") or not card.get("table"):
            raise ValueError("Every ornament card must contain a title, image and prices.")
        for image in card["img"]:
            image_path = (root / image).resolve()
            if not image_path.is_relative_to(root) or not image_path.is_file():
                raise ValueError("The ornament seed references a missing product image.")
        for row in card["table"]:
            if len(row) != 2 or not all(str(value).strip() for value in row.values()):
                raise ValueError("Every price row must contain a quantity and a price.")
    return payload


def remote_names(ftp):
    # A failed directory listing is an error, never evidence that JSON is missing.
    # NLST also works on FTP servers that do not implement MLSD.
    return {PurePosixPath(name.rstrip("/")).name for name in ftp.nlst()}


def seed_if_missing(ftp, payload):
    ftp.cwd(REMOTE_DIRECTORY)
    if REMOTE_NAME in remote_names(ftp):
        print("shary.json already exists; preserving the production data.")
        return False

    temporary_name = f".shary-seed-{uuid.uuid4().hex}.tmp"
    temporary_exists = True
    try:
        ftp.storbinary(f"STOR {temporary_name}", io.BytesIO(payload))
        if ftp.size(temporary_name) != len(payload):
            raise RuntimeError("The uploaded ornament seed could not be verified.")

        # Recheck before publishing, in case another process created the data.
        if REMOTE_NAME in remote_names(ftp):
            print("shary.json appeared during initialization; preserving it.")
            return False

        ftp.rename(temporary_name, REMOTE_NAME)
        temporary_exists = False
        print("Initialized shary.json with the product and its current prices.")
        return True
    finally:
        if temporary_exists:
            try:
                ftp.delete(temporary_name)
            except ftplib.all_errors:
                # Never remove or replace shary.json while cleaning up a failed seed.
                pass


def main():
    payload = read_seed()
    with ftplib.FTP(timeout=30) as ftp:
        ftp.connect(os.environ["FTP_SERVER"])
        ftp.login(os.environ["FTP_USER"], os.environ["FTP_PASSWORD"])
        seed_if_missing(ftp, payload)


if __name__ == "__main__":
    main()
