"""Exercise real multipart uploads in an isolated PHP server; no live site data."""
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--php', default='php')
args = parser.parse_args()
repo = Path(__file__).resolve().parents[2]
fixture = subprocess.check_output([args.php, '-r', '$im=imagecreatetruecolor(600,400); imagefill($im,0,0,imagecolorallocate($im,160,80,230)); imagepng($im);'])
large_fixture = subprocess.check_output([args.php, '-r', '$im=imagecreatetruecolor(1000,1000); mt_srand(1234); for($y=0;$y<1000;$y++) for($x=0;$x<1000;$x++) imagesetpixel($im,$x,$y,mt_rand(0,0xffffff)); imagepng($im);'])
assert 2500000 < len(large_fixture) < 10 * 1024 * 1024

with tempfile.TemporaryDirectory(prefix='n1foto-upload-api-') as temporary:
    site = Path(temporary)
    admin = site / 'admin-deploy'
    (admin / 'api').mkdir(parents=True)
    (admin / 'includes').mkdir()
    (site / 'db/pages').mkdir(parents=True)
    for name in ['page-image.php', 'poligrafy-image.php', 'site-image.php', 'page-json.php']:
        shutil.copyfile(repo / 'admin-deploy/api' / name, admin / 'api' / name)
    for name in ['site-storage.php', 'pages.php', 'image-upload.php']:
        shutil.copyfile(repo / 'admin-deploy/includes' / name, admin / 'includes' / name)
    # Authentication is outside this test; only the temporary server gets this stub.
    (admin / 'includes/auth.php').write_text('<?php function adminRequireLogin(): void {}', encoding='utf-8')
    page = site / 'db/pages/shary.json'
    page.write_text(json.dumps({'sections': [{'id': 'shary', 'cards': [{'id': 'test-card', 'title': 'Test', 'img': ['old.jpg']}]}]}), encoding='utf-8')
    collage = site / 'db/pages/sostavlenie-kollagey.json'
    shutil.copyfile(repo / 'db/pages/sostavlenie-kollagey.json', collage)
    home = site / 'db/main-page-cards.json'
    home.write_text(json.dumps({'main': [{'content': [{'title': 'Home', 'img': 'old-home.jpg'}]}]}), encoding='utf-8')
    poly = site / 'db/poligrafy.json'
    poly.write_text(json.dumps({'listovki': [{'productId': 'leaflet', 'img': ['old.jpg']}, {'productId': 'leaflet', 'img': ['old.jpg']}]}), encoding='utf-8')
    with socket.socket() as port_probe:
        port_probe.bind(('127.0.0.1', 0))
        port = port_probe.getsockname()[1]
    flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    with (site / 'server.log').open('wb') as log:
        server = subprocess.Popen([args.php, '-d', f'upload_tmp_dir={site.as_posix()}', '-S', f'127.0.0.1:{port}', '-t', str(admin)],
                                  stdout=log, stderr=log, creationflags=flags)
        base = f'http://127.0.0.1:{port}'
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        def upload(endpoint, fields, content=fixture):
            boundary = 'N1FotoUploadTestBoundary'
            body = b''
            for key, value in fields.items():
                body += f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode()
            body += f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n'.encode()
            body += content + f'\r\n--{boundary}--\r\n'.encode()
            request = urllib.request.Request(base + '/api/' + endpoint, data=body, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
            try:
                response = opener.open(request, timeout=20)
            except urllib.error.HTTPError as error:
                response = error
            return response.status, json.loads(response.read())

        try:
            for _ in range(50):
                try:
                    with opener.open(base + '/api/site-image.php', timeout=1):
                        break
                except urllib.error.HTTPError:
                    break
                except urllib.error.URLError:
                    time.sleep(.1)
            else:
                raise RuntimeError('Temporary PHP server did not start')
            fields = {'page': 'shary', 'sectionId': 'shary', 'cardId': 'test-card'}
            endpoint = base + '/api/page-json.php?page=sostavlenie-kollagey'
            with opener.open(endpoint) as response:
                collage_data = json.loads(response.read())
            for archived in [True, False]:
                collage_data['sections'][0]['cards'][0]['archived'] = archived
                request = urllib.request.Request(endpoint, data=json.dumps(collage_data).encode(), headers={'Content-Type': 'application/json'})
                with opener.open(request) as response:
                    assert json.loads(response.read())['ok']
                with opener.open(endpoint) as response:
                    assert json.loads(response.read()) == collage_data, 'Archive round trip must retain all data'
            status, uploaded = upload('page-image.php', {'page': 'sostavlenie-kollagey', 'sectionId': 'kollagi', 'cardId': 'kollagi-1'})
            assert status == 200 and uploaded['path'].startswith('img/collages/uploads/'), uploaded
            saved_collage = json.loads(collage.read_text(encoding='utf-8'))
            assert saved_collage['sections'][0]['cards'][0]['img'] == [uploaded['path']]
            assert saved_collage['sections'][0]['cards'][0]['table'] == collage_data['sections'][0]['cards'][0]['table']
            original_restoration = saved_collage['sections'][1]['cards'][0]
            pair = list(original_restoration['img'])
            for index in [1, 0]:
                status, uploaded = upload('page-image.php', {'page': 'sostavlenie-kollagey', 'sectionId': 'restoration', 'cardId': 'photo-restoration', 'imageIndex': str(index)})
                assert status == 200, uploaded
                pair[index] = uploaded['path']
                changed = json.loads(collage.read_text(encoding='utf-8'))['sections'][1]['cards'][0]
                assert changed == {**original_restoration, 'img': pair}, 'Upload must preserve the other photo and all text'
            for index in ['-1', '2', 'unexpected']:
                before = collage.read_bytes()
                status, rejected = upload('page-image.php', {'page': 'sostavlenie-kollagey', 'sectionId': 'restoration', 'cardId': 'photo-restoration', 'imageIndex': index})
                assert status == 400 and collage.read_bytes() == before
            status, rejected = upload('page-image.php', {'page': 'shary', 'sectionId': 'shary', 'cardId': 'test-card', 'imageIndex': '1'})
            assert status == 400
            status, result = upload('page-image.php', fields)
            assert status == 200 and result['ok'], result
            output = site / result['path']
            assert output.suffix == '.webp' and 0 < output.stat().st_size <= 100000
            assert output.read_bytes()[:4] == b'RIFF'
            assert json.loads(page.read_text(encoding='utf-8'))['sections'][0]['cards'][0]['img'] == [result['path']]
            with opener.open(base + '/api/site-image.php?path=' + result['path']) as preview:
                assert preview.headers['Content-Type'] == 'image/webp'
                assert preview.read() == output.read_bytes()
            status, second = upload('page-image.php', fields)
            assert status == 200 and second['path'] != result['path'], 'Upload filenames collide'
            assert output.exists(), 'Previous image was removed'
            status, large = upload('page-image.php', fields, large_fixture)
            assert status == 200 and large['ok'], large
            assert (site / large['path']).stat().st_size <= 100000
            before = page.read_bytes()
            files = sorted(site.rglob('*.webp'))
            for bad in [b'not an image', b'x' * (10 * 1024 * 1024 + 1)]:
                status, result = upload('page-image.php', fields, bad)
                assert status == 400 and not result['ok']
                assert page.read_bytes() == before, 'Failure changed the page JSON'
                assert sorted(site.rglob('*.webp')) == files, 'Failure left an image file'
            status, result = upload('page-image.php', {'page': 'home', 'sectionId': 'main', 'cardId': 'card-0-0'})
            assert status == 200 and result['ok']
            assert json.loads(home.read_text())['main'][0]['content'][0]['img'] == result['path']
            status, result = upload('poligrafy-image.php', {'section': 'listovki', 'productId': 'leaflet'})
            assert status == 200 and result['updatedCards'] == 2, result
            assert all(card['img'] == [result['path']] for card in json.loads(poly.read_text())['listovki'])
            assert (site / result['path']).stat().st_size <= 100000
            # Simulate JSON replacement failure: no orphan file or changed data.
            (page.parent / 'shary.json.tmp').mkdir()
            before = page.read_bytes()
            files = sorted(site.rglob('*.webp'))
            status, result = upload('page-image.php', fields)
            assert status == 500 and not result['ok']
            assert page.read_bytes() == before
            assert sorted(site.rglob('*.webp')) == files
            print(f'PASS: {len(large_fixture)} byte PNG accepted, WebP <= 100000 bytes; page/home/poligrafy uploads, preview, 10 MB input cap and failure cleanup.')
        finally:
            server.terminate()
            server.wait(timeout=10)
