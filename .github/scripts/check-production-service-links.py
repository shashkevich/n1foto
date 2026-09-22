"""Read the authoritative production catalogue and validate before any upload."""
import ftplib
import io
import os
from pathlib import Path
import subprocess


def main():
    payload = io.BytesIO()
    with ftplib.FTP(timeout=30) as ftp:
        ftp.connect(os.environ["FTP_SERVER"])
        ftp.login(os.environ["FTP_USER"], os.environ["FTP_PASSWORD"])
        ftp.retrbinary("RETR /n1foto.com/public_html/db/main-page-cards.json", payload.write)
    subprocess.run(
        ["php", str(Path(__file__).with_name("check-service-links.php")), "--stdin"],
        input=payload.getvalue(), check=True,
    )


if __name__ == "__main__":
    main()
