"""Persistencia privada de sesiones; almacena hashes, nunca tokens en claro."""
import hashlib
import json
import time
from . import context


def token_key(token):
    return hashlib.sha256(token.encode()).hexdigest()


def persist():
    if context.STATE is None:
        return
    path = context.STATE / 'sessions.json'
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(context.SESSIONS), encoding='utf-8')
    temporary.replace(path)


def restore():
    path = context.STATE / 'sessions.json'
    try:
        records = json.loads(path.read_text(encoding='utf-8'))
        now = time.time()
        context.SESSIONS.update({key: expiry for key, expiry in records.items()
                                 if isinstance(key, str) and len(key) == 64
                                 and isinstance(expiry, (int, float)) and expiry > now})
    except (OSError, ValueError, AttributeError):
        context.SESSIONS.clear()
