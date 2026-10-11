"""Copy the reviewed mood bank to its existing Cloudflare R2 asset bucket."""
from pathlib import Path
import hashlib
import json
import mimetypes
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / 'lab/mood-bank/2026-10-11'
BUCKET = 'parallel-vision-visuals'
PUBLIC_BASE = 'https://pub-21c1e54026ca4574b09d269b385e2fca.r2.dev'
manifest = json.loads((BANK / 'manifest.json').read_text())
files = [ROOT / asset['path'] for asset in manifest['assets']] + [BANK / 'manifest.json']
for path in files:
    key = path.relative_to(ROOT).as_posix()
    content_type = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    subprocess.run([
        'npx', '--yes', 'wrangler@4', 'r2', 'object', 'put', f'{BUCKET}/{key}',
        '--file', str(path), '--remote', '--content-type', content_type,
        '--cache-control', 'public, max-age=31536000, immutable',
    ], cwd=ROOT / 'lab-worker', check=True)
    with urllib.request.urlopen(PUBLIC_BASE + '/' + key, timeout=60) as response:
        remote = response.read()
    if hashlib.sha256(remote).digest() != hashlib.sha256(path.read_bytes()).digest():
        raise RuntimeError(f'Cloudflare verification failed for {key}')
    print(f'Uploaded and verified: {key}', flush=True)
print(f'Uploaded and verified {len(files)} files in {BUCKET}.', flush=True)
