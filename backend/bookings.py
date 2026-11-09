"""Reservas con inventario transaccional y cancelaciones por enlace privado."""
import hashlib
import json
import re
import secrets
import sqlite3
from datetime import date, datetime, time, timedelta, timezone
from . import context
from contextlib import contextmanager

LOCAL = timezone(timedelta(hours=-4))
HOTEL_EMAIL = 'reservas@losdelfines.com.bo'


@contextmanager
def connection():
    db = sqlite3.connect(context.STATE / 'reservations.sqlite3', timeout=15)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    try:
        with db:
            yield db
    finally:
        db.close()


def initialize():
    with connection() as db:
        db.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS room_types (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL,
          adults INTEGER NOT NULL, children INTEGER NOT NULL DEFAULT 0,
          quantity INTEGER NOT NULL DEFAULT 3 CHECK(quantity>=0));
        CREATE TABLE IF NOT EXISTS reservations (
          id TEXT PRIMARY KEY, reference TEXT UNIQUE NOT NULL, token_hash TEXT UNIQUE NOT NULL,
          request_id TEXT UNIQUE NOT NULL, room_type TEXT NOT NULL REFERENCES room_types(id),
          checkin TEXT NOT NULL, checkout TEXT NOT NULL, adults INTEGER NOT NULL, children INTEGER NOT NULL,
          first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL,
          country TEXT NOT NULL, phone TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
          nightly_rate INTEGER NOT NULL, total INTEGER NOT NULL,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL, admin_notes TEXT NOT NULL DEFAULT '');
        CREATE INDEX IF NOT EXISTS reservation_dates ON reservations(room_type,status,checkin,checkout);
        CREATE TABLE IF NOT EXISTS reservation_events (
          id INTEGER PRIMARY KEY, reservation_id TEXT NOT NULL, event TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS mail_outbox (
          id INTEGER PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
          state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
          error TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
        ''')
        source = (context.ROOT / 'scripts/site/plans.js').read_text(encoding='utf-8')
        plans = json.loads(source[source.index('['):].rstrip().rstrip(';'))
        for plan in plans:
            db.execute('INSERT OR IGNORE INTO room_types(id,name,price,adults,children) VALUES(?,?,?,?,?)',
                       (plan['id'], plan['name'], plan['price'], plan['capacity'], 2 if plan['id']=='apartamento-doble' else 0))


def now():
    return datetime.now(LOCAL)


def clean(value, label, maximum=120):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum or any(ord(c)<32 for c in value):
        raise ValueError('Revisa el campo '+label+'.')
    return value.strip()


def dates(start, end):
    try:
        checkin, checkout = date.fromisoformat(start), date.fromisoformat(end)
    except (ValueError, TypeError):
        raise ValueError('Selecciona fechas válidas.') from None
    if checkin < now().date() or checkout <= checkin or (checkout-checkin).days > 90 or checkin > now().date()+timedelta(days=730):
        raise ValueError('Elige fechas futuras y una estadía de 1 a 90 noches, dentro de los próximos dos años.')
    return checkin, checkout


def used(db, room, start, end, exclude=''):
    # El máximo por noche evita descontar dos reservas que no coinciden entre sí.
    nights = (date.fromisoformat(end)-date.fromisoformat(start)).days
    maximum = 0
    for index in range(nights):
        day = (date.fromisoformat(start)+timedelta(days=index)).isoformat()
        count = db.execute("SELECT COUNT(*) FROM reservations WHERE room_type=? AND status IN ('pending','confirmed') AND checkin<=? AND checkout>? AND id!=?", (room,day,day,exclude)).fetchone()[0]
        maximum = max(maximum,count)
    return maximum


def catalog(start=None,end=None,children=0):
    if start or end:
        dates(start,end)
    with connection() as db:
        result=[]
        for row in db.execute('SELECT * FROM room_types ORDER BY rowid'):
            item=dict(row)
            if children and item['children']<children:
                continue
            item['available']=max(0,item['quantity']-used(db,item['id'],start,end)) if start and end else item['quantity']
            result.append(item)
        return result


def enqueue(db,recipient,subject,body):
    db.execute('INSERT INTO mail_outbox(recipient,subject,body,created_at) VALUES(?,?,?,?)',(recipient,subject,body,now().isoformat()))


def public_record(row):
    item=dict(row)
    deadline=datetime.combine(date.fromisoformat(item['checkin']),time(14),LOCAL)-timedelta(days=1)
    return {key:item[key] for key in ('reference','room_type','checkin','checkout','adults','children','first_name','last_name','email','country','phone','status','nightly_rate','total','created_at')} | {
        'canCancel':item['status'] in ('pending','confirmed') and now()<=deadline,
        'cancelDeadline':deadline.isoformat()}


def create(data, origin):
    start,end=dates(data.get('checkin'),data.get('checkout'))
    first=clean(data.get('firstName'),'nombres',80);last=clean(data.get('lastName'),'apellidos',100)
    email=clean(data.get('email'),'correo',254)
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email):
        raise ValueError('Escribe un correo válido.')
    country=clean(data.get('country'),'país',80);phone=clean(data.get('phone'),'teléfono',40)
    if not re.fullmatch(r'[+() 0-9.-]{6,40}',phone):raise ValueError('Escribe un teléfono válido.')
    adults=data.get('adults');children=data.get('children')
    if type(adults) is not int or type(children) is not int or adults<1 or children not in (0,1,2):
        raise ValueError('Selecciona adultos y hasta dos niños.')
    request=clean(data.get('requestId'),'identificador',100)
    token=secrets.token_urlsafe(32);identifier=secrets.token_hex(16);reference='DEL-'+secrets.token_hex(4).upper()
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        if db.execute('SELECT 1 FROM reservations WHERE request_id=?',(request,)).fetchone():
            raise ValueError('La reserva ya fue registrada. Revisa la confirmación anterior para evitar duplicados.')
        room=db.execute('SELECT * FROM room_types WHERE id=?',(data.get('roomType'),)).fetchone()
        if not room or adults>room['adults'] or children>room['children']:
            raise ValueError('La ocupación no corresponde al tipo de habitación. Con niños, selecciona Apartamento Doble.')
        if used(db,room['id'],start.isoformat(),end.isoformat())>=room['quantity']:
            raise ValueError('No quedan habitaciones de este tipo en esas fechas. Elige otras fechas u otro tipo.')
        timestamp=now().isoformat();total=room['price']*(end-start).days
        db.execute('''INSERT INTO reservations(id,reference,token_hash,request_id,room_type,checkin,checkout,adults,children,first_name,last_name,email,country,phone,nightly_rate,total,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''', (identifier,reference,hashlib.sha256(token.encode()).hexdigest(),request,room['id'],start.isoformat(),end.isoformat(),adults,children,first,last,email,country,phone,room['price'],total,timestamp,timestamp))
        db.execute('INSERT INTO reservation_events(reservation_id,event,created_at) VALUES(?,?,?)',(identifier,'created',timestamp))
        link=origin+'/reserva.html#token='+token
        summary=f'Reserva {reference}\n{first} {last}\n{room["name"]}\nEntrada: {start} (14:00)\nSalida: {end} (12:00)\nAdultos: {adults} · Niños: {children}\nCorreo: {email}\nPaís: {country}\nTeléfono: {phone}\nEstimación: USD {total}\nEstado: pendiente de verificación.'
        enqueue(db,HOTEL_EMAIL,'Nueva reserva '+reference,summary)
        enqueue(db,email,'Recibimos tu reserva '+reference,summary+'\n\nConsulta o cancela tu reserva desde tu enlace privado:\n'+link+'\n\nLa cancelación del cliente se permite hasta 24 horas antes de la entrada. Conserva este enlace y no lo compartas.')
        row=db.execute('SELECT * FROM reservations WHERE id=?',(identifier,)).fetchone()
        result=public_record(row)
        return {'reservation':result,'manageUrl':link,'token':token,'notification':'queued'}


def by_token(db,token):
    if not isinstance(token,str) or not 20<=len(token)<=100:raise ValueError('Enlace de reserva inválido.')
    row=db.execute('SELECT * FROM reservations WHERE token_hash=?',(hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
    if not row:raise ValueError('No se encontró esa reserva. Revisa tu enlace privado.')
    return row


def manage(token):
    with connection() as db:return public_record(by_token(db,token))


def cancel(token):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');row=by_token(db,token)
        if not public_record(row)['canCancel']:raise ValueError('La reserva no se puede cancelar: debe estar activa y faltar al menos 24 horas para la entrada de las 14:00.')
        timestamp=now().isoformat();db.execute("UPDATE reservations SET status='cancelled',updated_at=? WHERE id=?",(timestamp,row['id']))
        db.execute('INSERT INTO reservation_events(reservation_id,event,created_at) VALUES(?,?,?)',(row['id'],'customer_cancelled',timestamp))
        for recipient in (row['email'],HOTEL_EMAIL):enqueue(db,recipient,'Reserva cancelada '+row['reference'],'Se canceló la reserva '+row['reference']+'. La habitación vuelve a estar disponible.')
        return public_record(db.execute('SELECT * FROM reservations WHERE id=?',(row['id'],)).fetchone())


def admin_list():
    with connection() as db:
        items=[]
        for row in db.execute('SELECT r.*,t.name AS room_name FROM reservations r JOIN room_types t ON t.id=r.room_type ORDER BY r.created_at DESC LIMIT 500'):
            item=dict(row);item.pop('token_hash');item.pop('request_id');items.append(item)
        return {'reservations':items,'rooms':[dict(row) for row in db.execute('SELECT * FROM room_types ORDER BY rowid')],
                'notifications':dict(db.execute("SELECT COUNT(CASE WHEN state='pending' THEN 1 END) AS pending,COUNT(CASE WHEN state='sent' THEN 1 END) AS sent,COUNT(CASE WHEN state='pending' AND attempts>=5 THEN 1 END) AS failed FROM mail_outbox").fetchone())}


def update(data):
    status=data.get('status');identifier=data.get('id');notes=str(data.get('notes',''))[:2000]
    if status not in ('pending','confirmed','rejected','cancelled'):raise ValueError('Estado inválido.')
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');row=db.execute('SELECT * FROM reservations WHERE id=?',(identifier,)).fetchone()
        if not row:raise ValueError('Reserva no encontrada.')
        if row['status'] in ('rejected','cancelled') and status!=row['status']:raise ValueError('Una reserva cerrada no se puede reactivar. Crea una reserva nueva.')
        db.execute('UPDATE reservations SET status=?,admin_notes=?,updated_at=? WHERE id=?',(status,notes,now().isoformat(),identifier))
        db.execute('INSERT INTO reservation_events(reservation_id,event,created_at) VALUES(?,?,?)',(identifier,'admin_'+status,now().isoformat()))
        if status!=row['status']:
            description={'pending':'pendiente de verificación','confirmed':'confirmada','rejected':'rechazada','cancelled':'cancelada'}[status]
            for recipient in (row['email'],HOTEL_EMAIL):enqueue(db,recipient,'Actualización de reserva '+row['reference'],'La reserva '+row['reference']+' está '+description+'.\nEntrada: '+row['checkin']+'\nSalida: '+row['checkout'])
    return {'ok':True}


def inventory(data):
    room=data.get('id');quantity=data.get('quantity');price=data.get('price')
    if type(quantity) is not int or not 0<=quantity<=100 or type(price) is not int or not 0<price<=10000:raise ValueError('Usa de 0 a 100 habitaciones y una tarifa de 1 a 10000 USD.')
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        if not db.execute('SELECT 1 FROM room_types WHERE id=?',(room,)).fetchone():raise ValueError('Tipo no encontrado.')
        maximum=db.execute("SELECT MAX((SELECT COUNT(*) FROM reservations b WHERE b.room_type=a.room_type AND b.status IN ('pending','confirmed') AND b.checkin<=a.checkin AND b.checkout>a.checkin)) FROM reservations a WHERE a.room_type=? AND a.status IN ('pending','confirmed') AND a.checkout>?",(room,now().date().isoformat())).fetchone()[0] or 0
        if quantity<maximum:raise ValueError('No puedes reducir el inventario por debajo de las reservas activas coincidentes: '+str(maximum)+'.')
        db.execute('UPDATE room_types SET quantity=?,price=? WHERE id=?',(quantity,price,room))
    return {'ok':True}
