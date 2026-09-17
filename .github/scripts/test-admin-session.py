"""Test login/session persistence with temporary credentials and isolated storage."""
import argparse
import http.cookiejar
import os
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--php', default='php')
args = parser.parse_args()
repo = Path(__file__).resolve().parents[2]
auth = (repo / 'admin-deploy/includes/auth.php').read_text(encoding='utf-8')
password_hash = subprocess.check_output([args.php, '-r', "echo password_hash('fixture-password', PASSWORD_DEFAULT);"], text=True)
auth = re.sub(r"const ADMIN_PASSWORD_HASH = '[^']+';", lambda _: f"const ADMIN_PASSWORD_HASH = '{password_hash}';", auth)

with tempfile.TemporaryDirectory(prefix='n1foto-session-test-') as directory:
    root = Path(directory)
    (root / 'includes').mkdir()
    (root / 'storage/sessions').mkdir(parents=True)
    (root / 'includes/auth.php').write_text(auth, encoding='utf-8')
    (root / 'index.php').write_text('''<?php
if (isset($_GET['secure'])) $_SERVER['HTTPS'] = 'on';
require __DIR__ . '/includes/auth.php';
if (isset($_GET['logout'])) { adminLogout(); header('Location: /', true, 303); exit; }
if (isset($_GET['private'])) adminRequireLogin();
$error = adminHandleLogin();
echo adminIsAuthorized() ? 'AUTHORIZED' : ($error !== '' ? 'BAD_LOGIN' : 'LOGIN');
''', encoding='utf-8')
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0))
        port = probe.getsockname()[1]
    with (root / 'server.log').open('wb') as log:
        server = subprocess.Popen([args.php, '-S', f'127.0.0.1:{port}', '-t', directory], stdout=log, stderr=log,
                                  creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        try:
            base = f'http://127.0.0.1:{port}'
            jar = http.cookiejar.CookieJar()
            client = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPCookieProcessor(jar))
            for _ in range(50):
                try:
                    with client.open(base, timeout=1) as response:
                        assert response.read() == b'LOGIN'
                    break
                except urllib.error.URLError:
                    time.sleep(.1)
            else:
                raise RuntimeError('Temporary PHP server did not start')
            assert [cookie.name for cookie in jar] == ['N1FOTOADMINHTTP']
            old_id = next(iter(jar)).value
            bad = urllib.parse.urlencode({'login': 'admin', 'password': 'wrong'}).encode()
            assert client.open(base, bad).read() == b'BAD_LOGIN'
            good = urllib.parse.urlencode({'login': 'admin', 'password': 'fixture-password'}).encode()
            assert client.open(base, good).read() == b'AUTHORIZED'
            assert next(iter(jar)).value != old_id, 'Login must regenerate the session ID'
            assert client.open(base + '/?private').read() == b'AUTHORIZED'
            plain = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            with plain.open(base + '/?secure') as response:
                cookie = response.headers['Set-Cookie']
                assert cookie.startswith('N1FOTOADMINHTTPS=') and '; secure' in cookie.lower()
            assert client.open(base + '/?private').read() == b'AUTHORIZED', 'HTTPS session must not replace HTTP session'
            with plain.open(urllib.request.Request(base + '/?secure', headers={'Host': 'admin.n1foto.com'})) as response:
                cookie = response.headers['Set-Cookie']
                assert cookie.startswith('PHPSESSID=') and '; secure' in cookie.lower(), 'Production cookie settings changed'
            assert client.open(base + '/?logout').read() == b'LOGIN'
            assert client.open(base + '/?private').read() == b'LOGIN'
            print('PASS: login, rejection, ID regeneration, session persistence, HTTP/HTTPS separation, production settings and logout.')
        finally:
            server.terminate()
            server.wait(timeout=10)
