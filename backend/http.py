from pathlib import Path
from urllib.parse import urlsplit
import base64, hashlib, hmac, io, json, secrets, time, zipfile
from http.server import SimpleHTTPRequestHandler
from . import context
from .context import ROOT, LOCK, SESSIONS, ATTEMPTS, ALLOWED_EXT
from .storage import read_config, write_config, validate_config
from .sessions import token_key, persist
from .content import list_pages, list_media, create_page
from . import bookings, notifications
from . import mail_settings
from urllib.parse import parse_qs
import os, re
from http.cookies import SimpleCookie

class Handler(SimpleHTTPRequestHandler):
    server_version = 'DelfinesLocal/1.0'

    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        if args and str(args[1] if len(args) > 1 else '') not in ['200', '304']:
            super().log_message(fmt, *args)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self' https://www.google.com https://maps.google.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'")
        super().end_headers()

    def send_head(self):
        # GET y HEAD deben compartir la misma lista de archivos públicos.
        target = Path(self.translate_path(urlsplit(self.path).path))
        if target.is_dir():
            target = target / 'index.html'
        relative = target.relative_to(ROOT)
        public = (relative.as_posix() in ('index.html', 'admin.html', 'reservas-admin.html', 'reserva.html') or
                  relative.parts[0] in ('pages', 'css', 'scripts', 'assets') or
                  relative.as_posix() == 'data/site-settings.json')
        if (not public or any(part.startswith('.') for part in relative.parts) or
                any(part.is_symlink() for part in (target, *target.parents)) or
                not target.resolve().is_relative_to(ROOT.resolve()) or
                target.suffix.lower() not in ALLOWED_EXT or not target.is_file()):
            self.send_error(404)
            return None
        return super().send_head()

    def valid_origin(self):
        origin = self.headers.get('Origin')
        if (self.headers.get('Sec-Fetch-Site') == 'cross-site' or
                (origin and urlsplit(origin).netloc != self.headers.get('Host'))):
            self.json_response(403, {'error': 'Origen no permitido.'})
            return False
        return True

    def json_response(self, status, value):
        data = json.dumps(value, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def session_token(self):
        authorization = self.headers.get('Authorization', '')
        if authorization.startswith('Bearer '):
            return authorization.removeprefix('Bearer ')
        try:
            cookie = SimpleCookie(self.headers.get('Cookie', ''))
            return cookie['delfines_session'].value if 'delfines_session' in cookie else ''
        except Exception:
            return ''

    def set_session_cookie(self, token='', max_age=0):
        secure = self.headers.get('X-Forwarded-Proto', '').lower() == 'https'
        self.send_header('Set-Cookie', f'delfines_session={token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age={max_age}' + ('; Secure' if secure else ''))

    def authenticated(self):
        token = self.session_token()
        with LOCK:
            now = time.time()
            for expired in [key for key, expiry in SESSIONS.items() if expiry < now]:
                SESSIONS.pop(expired, None)
            expiry = SESSIONS.get(token_key(token), 0)
        if expiry < time.time():
            self.json_response(401, {'error': 'La sesión terminó. Vuelve a ingresar.'})
            return False
        return self.valid_origin()

    def read_body(self):
        if self.headers.get_content_type() != 'application/json' or self.headers.get('Transfer-Encoding'):
            raise ValueError('Usa una solicitud JSON válida.')
        size = int(self.headers.get('Content-Length', '0'))
        limit = 12000000 if urlsplit(self.path).path == '/api/admin/upload' else 2000000
        if size < 1 or size > limit:
            raise ValueError('El archivo o mensaje es demasiado grande.')
        data = json.loads(self.rfile.read(size))
        if not isinstance(data, dict):
            raise ValueError('El mensaje debe ser un objeto JSON.')
        return data

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/bookings/rooms':
            try:
                query=parse_qs(urlsplit(self.path).query)
                children=int(query.get('children',['0'])[0])
                if children not in (0,1,2):raise ValueError('Se admiten hasta dos niños.')
                self.json_response(200,bookings.catalog(query.get('checkin',[None])[0],query.get('checkout',[None])[0],children))
            except (ValueError,TypeError) as error:self.json_response(400,{'error':str(error)})
            return
        if path == '/api/admin/reservations':
            if self.authenticated():self.json_response(200,bookings.admin_list() | {'mail':notifications.status()})
            return
        if path in ('/api/admin/pages', '/api/admin/media'):
            if self.authenticated():
                self.json_response(200, list_pages() if path.endswith('/pages') else list_media())
            return
        if path == '/api/admin/config':
            if self.authenticated():
                self.json_response(200, read_config())
            return
        if path == '/api/admin/export':
            if not self.authenticated():
                return
            buffer = io.BytesIO()
            with LOCK, zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
                for file in ROOT.rglob('*'):
                    if (file.is_file() and file.suffix != '.tmp' and '__pycache__' not in file.parts
                            and not any(part.startswith('.') for part in file.relative_to(ROOT).parts)
                            and not any(part.is_symlink() for part in (file, *file.parents))
                            and file.resolve().is_relative_to(ROOT.resolve())):
                        archive.write(file, 'delfines/' + file.relative_to(ROOT).as_posix())
            data = buffer.getvalue()
            self.send_response(200)
            self.send_header('Content-Type', 'application/zip')
            self.send_header('Content-Disposition', 'attachment; filename="delfines-editado.zip"')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if path.startswith('/api/'):
            self.json_response(404, {'error': 'Ruta no disponible.'})
            return
        legacy = ROOT / 'pages' / path.lstrip('/')
        if path.count('/') == 1 and legacy.is_file() and (legacy.suffix == '.html'):
            self.send_response(302)
            self.send_header('Location', '/pages/' + legacy.name)
            self.end_headers()
            return
        target = Path(self.translate_path(path))
        if target.is_dir():
            target = target / 'index.html'
            if not target.is_file():
                self.send_error(404)
                return
        if target.suffix.lower() not in ALLOWED_EXT:
            self.send_error(404)
            return
        super().do_GET()

    def do_POST(self):
        path = urlsplit(self.path).path
        try:
            if not self.valid_origin():
                return
            if (path.startswith('/api/admin/') and path != '/api/admin/login' and not self.headers.get('Authorization')
                    and self.headers.get('X-Delfines-Admin') != '1'):
                self.json_response(403, {'error': 'Solicitud de administración inválida.'})
                return
            if path == '/api/admin/login':
                data = self.read_body()
                now = time.time()
                ip = self.client_address[0]
                with LOCK:
                    attempts = [t for t in ATTEMPTS.get(ip, []) if now - t < 60]
                    if len(attempts) >= 8:
                        self.json_response(429, {'error': 'Espera un minuto antes de volver a intentar.'})
                        return
                    ATTEMPTS[ip] = attempts + [now]
                supplied = str(data.get('password', ''))
                if len(supplied) > 256:
                    raise ValueError('Credenciales inválidas.')
                digest = hashlib.scrypt(supplied.encode(), salt=bytes.fromhex(context.CREDENTIALS['salt']), n=16384, r=8, p=1).hex()
                if not hmac.compare_digest(digest, context.CREDENTIALS['hash']):
                    self.json_response(401, {'error': 'La contraseña no es correcta.'})
                    return
                token = secrets.token_urlsafe(32)
                with LOCK:
                    if len(SESSIONS) >= 100:
                        SESSIONS.pop(next(iter(SESSIONS)))
                    SESSIONS[token_key(token)] = now + 2 * 3600
                    persist()
                self.send_response(200)
                self.set_session_cookie(token, 7200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'token': token}).encode())
                return
            if path in ('/api/bookings/create','/api/bookings/manage','/api/bookings/cancel'):
                key='public-bookings:'+self.client_address[0]
                with LOCK:
                    recent=[stamp for stamp in ATTEMPTS.get(key,[]) if time.time()-stamp<60]
                    if len(recent)>=30:
                        self.json_response(429,{'error':'Demasiadas solicitudes. Intenta nuevamente en un minuto.'});return
                    ATTEMPTS[key]=recent+[time.time()]
                data=self.read_body()
                if path.endswith('/create'):
                    host=self.headers.get('Host','')
                    origin=os.environ.get('DELFINES_PUBLIC_URL','').rstrip('/')
                    if not origin:
                        if not re.fullmatch(r'(localhost|127\.0\.0\.1)(:\d+)?|[a-z0-9-]+\.trycloudflare\.com|[a-z0-9.-]+\.ngrok-free\.dev',host):
                            raise ValueError('Configura DELFINES_PUBLIC_URL para este dominio.')
                        origin=('https://' if self.headers.get('X-Forwarded-Proto')=='https' else 'http://')+host
                    self.json_response(201,bookings.create(data,origin))
                elif path.endswith('/manage'):self.json_response(200,bookings.manage(data.get('token')))
                else:self.json_response(200,bookings.cancel(data.get('token')))
                return
            if not path.startswith('/api/admin/'):
                self.json_response(404, {'error': 'Ruta no disponible.'})
                return
            if not self.authenticated():
                return
            data = self.read_body()
            if path == '/api/admin/mail-settings':
                with LOCK:
                    result=mail_settings.save(data)
                self.json_response(200,result);return
            if path == '/api/admin/reservations':
                self.json_response(200,bookings.update(data));return
            if path == '/api/admin/inventory':
                self.json_response(200,bookings.inventory(data));return
            if path == '/api/admin/notifications/retry':
                with bookings.connection() as db:db.execute("UPDATE mail_outbox SET attempts=0 WHERE state='pending'")
                self.json_response(200,{'ok':True});return
            if path == '/api/admin/pages':
                with LOCK:
                    result = create_page(data)
                self.json_response(201, result)
                return
            if path == '/api/admin/password':
                current_password = data.get('currentPassword', '')
                new_password = data.get('newPassword', '')
                confirmation = data.get('confirmPassword', '')
                if not all(isinstance(value, str) for value in (current_password, new_password, confirmation)):
                    raise ValueError('Contraseñas inválidas.')
                if not 8 <= len(new_password) <= 20 or len(current_password) > 21:
                    raise ValueError('La nueva contraseña debe tener entre 8 y 20 caracteres.')
                if new_password != confirmation:
                    raise ValueError('La confirmación no coincide.')
                if new_password == current_password:
                    raise ValueError('Usa una contraseña diferente de la actual.')
                with LOCK:
                    now = time.time()
                    key = 'password:' + self.client_address[0]
                    attempts = [t for t in ATTEMPTS.get(key, []) if now - t < 60]
                    if len(attempts) >= 8:
                        self.json_response(429, {'error': 'Espera un minuto antes de volver a intentar.'})
                        return
                    ATTEMPTS[key] = attempts + [now]
                    digest = hashlib.scrypt(current_password.encode(), salt=bytes.fromhex(context.CREDENTIALS['salt']), n=16384, r=8, p=1).hex()
                    if not hmac.compare_digest(digest, context.CREDENTIALS['hash']):
                        self.json_response(401, {'error': 'La contraseña actual no es correcta.'})
                        return
                    salt = secrets.token_bytes(16)
                    record = {'salt': salt.hex(), 'hash': hashlib.scrypt(new_password.encode(), salt=salt, n=16384, r=8, p=1).hex()}
                    # Reemplazo atómico: no dejar un archivo de credenciales parcial.
                    temporary = context.STATE / 'credentials.json.tmp'
                    temporary.write_text(json.dumps(record), encoding='utf-8')
                    temporary.replace(context.STATE / 'credentials.json')
                    context.CREDENTIALS = record
                    SESSIONS.clear()
                    persist()
                    initial = context.STATE / 'initial-access.txt'
                    if initial.exists():
                        initial.unlink()
                self.json_response(200, {'ok': True})
                return
            if path == '/api/admin/logout':
                with LOCK:
                    SESSIONS.pop(token_key(self.session_token()), None)
                    persist()
                self.send_response(200)
                self.set_session_cookie()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
                return
            if path == '/api/admin/config':
                config = validate_config(data.get('config'))
                with LOCK:
                    current = read_config()
                    if data.get('revision') != current.get('revision', 0):
                        self.json_response(409, {'error': 'Hay cambios guardados desde otra sesión. Recarga antes de publicar.'})
                        return
                    history = context.STATE / 'history'
                    history.mkdir(parents=True, exist_ok=True)
                    (history / f"revision-{current.get('revision', 0):06d}.json").write_text(json.dumps(current, ensure_ascii=False), encoding='utf-8')
                    for old in sorted(history.glob('*.json'))[:-20]:
                        old.unlink()
                    config['revision'] = current.get('revision', 0) + 1
                    write_config(config)
                self.json_response(200, config)
                return
            if path == '/api/admin/upload':
                from PIL import Image, ImageOps
                raw = base64.b64decode(data.get('data', ''), validate=True)
                if len(raw) > 8000000:
                    raise ValueError('La imagen debe pesar menos de 8 MB.')
                Image.MAX_IMAGE_PIXELS = 24000000
                with Image.open(io.BytesIO(raw)) as photo:
                    if photo.format not in ['JPEG', 'PNG', 'WEBP']:
                        raise ValueError('Usa una imagen JPG, PNG o WebP.')
                    if photo.width * photo.height > 24000000:
                        raise ValueError('La imagen supera el límite de 24 megapíxeles.')
                    photo = ImageOps.exif_transpose(photo)
                    photo.thumbnail((2200, 2200))
                    photo = photo.convert('RGBA' if 'A' in photo.getbands() else 'RGB')
                    folder = ROOT / 'assets' / 'uploads'
                    folder.mkdir(exist_ok=True)
                    file = folder / (secrets.token_hex(12) + '.webp')
                    photo.save(file, 'WEBP', quality=90)
                self.json_response(200, {'src': 'assets/uploads/' + file.name})
                return
            self.json_response(404, {'error': 'Ruta no disponible.'})
        except (ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
            self.json_response(400, {'error': str(error)})
        except Exception:
            self.json_response(500, {'error': 'No se pudo completar la operación. Intenta de nuevo.'})
