"""Credenciales SMTP privadas protegidas por Windows DPAPI para el usuario local."""
import base64
import ctypes
from ctypes import wintypes
import json
import os
import re
from . import context


class Blob(ctypes.Structure):
    _fields_=[('length',wintypes.DWORD),('data',ctypes.POINTER(ctypes.c_ubyte))]


def crypt(value,decrypt=False):
    if os.name!='nt':raise ValueError('En este sistema usa las variables privadas DELFINES_SMTP_USER y DELFINES_SMTP_PASSWORD.')
    buffer=ctypes.create_string_buffer(value);source=Blob(len(value),ctypes.cast(buffer,ctypes.POINTER(ctypes.c_ubyte)));result=Blob()
    if decrypt:
        ok=ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(source),None,None,None,None,1,ctypes.byref(result))
    else:
        ok=ctypes.windll.crypt32.CryptProtectData(ctypes.byref(source),None,None,None,None,1,ctypes.byref(result))
    if not ok:raise ValueError('No se pudo proteger o leer la configuración de correo en este equipo.')
    try:return ctypes.string_at(result.data,result.length)
    finally:
        ctypes.windll.kernel32.LocalFree.argtypes=[ctypes.c_void_p]
        ctypes.windll.kernel32.LocalFree(ctypes.cast(result.data,ctypes.c_void_p))


def load():
    path=context.STATE/'mail-settings.json'
    if path.exists():
        data=json.loads(path.read_text(encoding='utf-8'))
        if not data.get('enabled'):return '', ''
        return data['sender'],crypt(base64.b64decode(data['secret']),True).decode()
    return os.environ.get('DELFINES_SMTP_USER',''),os.environ.get('DELFINES_SMTP_PASSWORD','')


def save(data):
    sender=data.get('sender','');password=data.get('password','');enabled=data.get('enabled') is True
    if not isinstance(sender,str) or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',sender) or len(sender)>254:raise ValueError('Escribe la cuenta remitente de Gmail o Google Workspace.')
    if not isinstance(password,str) or len(password)>256:raise ValueError('Contraseña de aplicación inválida.')
    path=context.STATE/'mail-settings.json';prior=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    if password:secret=base64.b64encode(crypt(password.replace(' ', '').encode())).decode()
    elif prior.get('sender')==sender:secret=prior.get('secret','')
    else:secret=''
    if enabled and not secret:raise ValueError('Introduce una contraseña de aplicación para activar los envíos.')
    record={'sender':sender,'secret':secret,'enabled':enabled};temporary=path.with_suffix('.json.tmp');temporary.write_text(json.dumps(record),encoding='utf-8');temporary.replace(path)
    return {'ok':True}
