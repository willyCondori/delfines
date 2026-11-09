"""Cola de correo persistente. Gmail se configura solo mediante variables privadas."""
import os
import json
from . import context
import smtplib
import ssl
import threading
from email.message import EmailMessage
from .bookings import connection
from . import mail_settings


def status():
    if os.environ.get('DELFINES_DISABLE_EMAIL')=='1':
        return {'configured':False,'sender':'','message':'Envíos desactivados en este entorno de prueba.'}
    try:sender,password=mail_settings.load()
    except Exception:sender,password='',''
    configured=bool(sender and password)
    path=context.STATE/'mail-settings.json'
    if not sender and path.exists():
        try:sender=json.loads(path.read_text(encoding='utf-8')).get('sender','')
        except (OSError,ValueError):pass
    return {'configured':configured,'sender':sender,
            'message':'Gmail configurado; los envíos se procesan en segundo plano.' if configured else 'Configura la cuenta remitente y su contraseña de aplicación en Configuración de Gmail. Las reservas y los avisos pendientes se conservan en la base de datos.'}


def process():
    if not status()['configured']:return
    sender,password=mail_settings.load()
    with connection() as db:
        rows=db.execute("SELECT * FROM mail_outbox WHERE state='pending' AND attempts<5 ORDER BY id LIMIT 20").fetchall()
    for row in rows:
        message=EmailMessage();message['From']=sender;message['To']=row['recipient'];message['Subject']=row['subject'];message['Message-ID']='<delfines-'+str(row['id'])+'@'+sender.split('@')[-1]+'>';message.set_content(row['body'])
        try:
            with smtplib.SMTP('smtp.gmail.com',587,timeout=20) as smtp:
                smtp.starttls(context=ssl.create_default_context());smtp.login(sender,password);smtp.send_message(message)
            with connection() as db:db.execute("UPDATE mail_outbox SET state='sent',error='' WHERE id=?",(row['id'],))
        except Exception:
            # No guardar respuestas SMTP que puedan revelar credenciales ni datos privados.
            with connection() as db:db.execute("UPDATE mail_outbox SET attempts=attempts+1,error='No se pudo enviar. Revisa la configuración de Gmail.' WHERE id=?",(row['id'],))


def start_worker():
    def worker():
        event=threading.Event()
        while True:
            try:process()
            except Exception:pass
            event.wait(60)
    threading.Thread(target=worker,name='delfines-mail',daemon=True).start()
