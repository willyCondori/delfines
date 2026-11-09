from pathlib import Path
import hashlib, json, secrets
import argparse
from http.server import ThreadingHTTPServer
from . import context
from .context import ROOT
from .storage import write_config
from .http import Handler
from .sessions import restore
from .bookings import initialize
from .notifications import start_worker

class DelfinesHTTPServer(ThreadingHTTPServer):
    # Una carga del navegador abre muchas conexiones a través del túnel.
    # La cola predeterminada puede rechazar conexiones durante esas ráfagas.
    request_queue_size = 128
    daemon_threads = True

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--state-dir', default=str(ROOT.parent.parent / 'work' / 'delfines-admin'))
    args = parser.parse_args()
    context.STATE = Path(args.state_dir).resolve()
    if context.STATE.is_relative_to(ROOT.resolve()):
        parser.error('La carpeta privada de estado debe estar fuera del sitio público.')
    context.STATE.mkdir(parents=True, exist_ok=True)
    path = context.STATE / 'credentials.json'
    if not path.exists():
        password = 'Delfines-' + secrets.token_urlsafe(10)
        salt = secrets.token_bytes(16)
        record = {'salt': salt.hex(), 'hash': hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1).hex()}
        path.write_text(json.dumps(record), encoding='utf-8')
        (context.STATE / 'initial-access.txt').write_text(password, encoding='utf-8')
    context.CREDENTIALS = json.loads(path.read_text(encoding='utf-8'))
    restore()
    initialize()
    start_worker()
    if not (ROOT / 'data' / 'site-settings.json').exists():
        write_config({'version': 1, 'revision': 0, 'pages': {}})
    print(f'Delfines listo en http://127.0.0.1:{args.port}', flush=True)
    print('Administración: /admin.html', flush=True)
    if (context.STATE / 'initial-access.txt').exists():
        print('Archivo de acceso inicial: ' + str(context.STATE / 'initial-access.txt'), flush=True)
    DelfinesHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
