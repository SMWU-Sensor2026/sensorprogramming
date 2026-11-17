import hashlib
import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from flask import current_app, request
from werkzeug.security import generate_password_hash, check_password_hash
from common.enums import CabinetMode, SessionStatus, ShoeStatus, DoorStatus
from database.repository import get_db, now


class APIError(Exception):
    def __init__(self, code, message, status=400):
        self.code, self.message, self.status = code, message, status


def fail(code, message, status=400):
    raise APIError(code, message, status)


def later(seconds):
    return (datetime.now(timezone.utc) + timedelta(seconds=seconds)).isoformat()


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def event(kind, slot, session_id=None, details=None):
    get_db().execute('INSERT INTO shoe_event VALUES (?,?,?,?,?,?,?)',
                     (str(uuid.uuid4()), kind, 1, slot, session_id, now(), json.dumps(details or {})))


def revoke(session_id):
    get_db().execute('DELETE FROM access_token WHERE session_id=?', (session_id,))
    get_db().execute('UPDATE storage_session SET password_hash=NULL,token_hash=NULL,token_expires_at=NULL WHERE session_id=?', (session_id,))


def expire():
    db = get_db()
    for row in db.execute("SELECT * FROM storage_session WHERE session_status='RESERVED' AND reservation_expires_at<=?", (now(),)).fetchall():
        # A sensor-confirmed insertion already transitions to ACTIVE.
        db.execute("UPDATE storage_session SET session_status='EXPIRED',ended_at=? WHERE session_id=?", (now(), row['session_id']))
        revoke(row['session_id'])
    db.execute('DELETE FROM access_token WHERE expires_at<=?', (now(),))


def mode():
    return get_db().execute('SELECT mode FROM cabinet WHERE cabinet_id=1').fetchone()['mode']


def slot(slot_id):
    row = get_db().execute('SELECT * FROM compartment WHERE compartment_id=?', (slot_id,)).fetchone()
    if not row:
        fail('NOT_FOUND', '칸을 찾을 수 없습니다.', 404)
    return row


def live(slot_id):
    return get_db().execute("SELECT * FROM storage_session WHERE compartment_id=? AND session_status IN ('RESERVED','ACTIVE')", (slot_id,)).fetchone()


def public_session(row):
    return {key: row[key] for key in ('session_id', 'cabinet_id', 'compartment_id', 'user_id', 'auth_type', 'session_status', 'reserved_at', 'started_at', 'ended_at', 'checkout_requested_at')}


def issue_token(role, session_id=None):
    token = secrets.token_urlsafe(32)
    expiry = later(current_app.config['TOKEN_TTL_SECONDS'])
    get_db().execute('INSERT INTO access_token VALUES (?,?,?,?)', (digest(token), session_id, role, expiry))
    if session_id:
        get_db().execute('UPDATE storage_session SET token_hash=?,token_expires_at=? WHERE session_id=?', (digest(token), expiry, session_id))
    return dict(access_token=token, token_expires_at=expiry)


def authorize(admin=False, session_id=None, slot_id=None):
    expire()
    header = request.headers.get('Authorization', '')
    token = header[7:] if header.startswith('Bearer ') else ''
    row = get_db().execute('SELECT * FROM access_token WHERE token_hash=? AND expires_at>?', (digest(token), now())).fetchone()
    if not row:
        fail('UNAUTHORIZED', '인증이 필요하거나 접근 권한이 만료되었습니다.', 401)
    if admin:
        if row['role'] != 'ADMIN':
            fail('FORBIDDEN', '관리자 인증이 필요합니다.', 403)
        return row
    if row['role'] == 'ADMIN':
        fail('FORBIDDEN', '해당 보관 세션의 사용자 인증이 필요합니다.', 403)
    session = get_db().execute("SELECT * FROM storage_session WHERE session_id=? AND session_status IN ('RESERVED','ACTIVE')", (row['session_id'],)).fetchone()
    if not session:
        fail('UNAUTHORIZED', '종료된 보관 세션입니다.', 401)
    if (session_id is not None and session['session_id'] != session_id) or (slot_id is not None and session['compartment_id'] != slot_id):
        fail('FORBIDDEN', '다른 칸에 접근할 수 없습니다.', 403)
    return session


def password_value(data):
    value = data.get('password')
    if not isinstance(value, str) or not 4 <= len(value) <= 32:
        fail('INVALID_PASSWORD', '비밀번호는 4~32자로 입력해주세요.')
    return value


def check_limit(scope):
    row = get_db().execute('SELECT * FROM auth_attempt WHERE scope=?', (scope,)).fetchone()
    if row and row['locked_until'] and row['locked_until'] > now():
        fail('RATE_LIMITED', '입력 횟수를 초과했습니다. 1분 후 다시 시도해주세요.', 429)
    if row and row['locked_until']:
        get_db().execute('DELETE FROM auth_attempt WHERE scope=?', (scope,))


def verify(scope, valid):
    db = get_db()
    if valid:
        db.execute('DELETE FROM auth_attempt WHERE scope=?', (scope,))
        return
    row = db.execute('SELECT failures FROM auth_attempt WHERE scope=?', (scope,)).fetchone()
    attempts = (row['failures'] if row else 0) + 1
    db.execute('INSERT OR REPLACE INTO auth_attempt VALUES (?,?,?)', (scope, attempts, later(60) if attempts >= 5 else None))
    # Failed authentication counters must survive the error response rollback.
    db.commit()
    fail('INVALID_CREDENTIALS', '비밀번호가 일치하지 않습니다.', 401)


def create_session(data):
    expire()
    slot_id = data.get('compartment_id')
    if type(slot_id) is not int:
        fail('INVALID_REQUEST', '칸 번호를 입력해주세요.')
    state = slot(slot_id)
    if live(slot_id) or state['shoe_status'] != ShoeStatus.EMPTY or state['door_status'] != DoorStatus.CLOSED:
        fail('CONFLICT', '현재 이용할 수 없는 칸입니다.', 409)
    is_public = mode() == CabinetMode.PUBLIC
    password_hash = generate_password_hash(password_value(data)) if is_public else None
    db = get_db()
    cursor = db.execute('''INSERT INTO storage_session
       (cabinet_id,compartment_id,auth_type,session_status,reserved_at,password_hash,reservation_expires_at)
       VALUES (1,?,?,?,?,?,?)''', (slot_id, 'GUEST_TOKEN' if is_public else None, SessionStatus.RESERVED, now(), password_hash, later(current_app.config['RESERVATION_TTL_SECONDS'])))
    session_id = cursor.lastrowid
    result = issue_token('USER', session_id) if is_public else {}
    result['session'] = public_session(db.execute('SELECT * FROM storage_session WHERE session_id=?', (session_id,)).fetchone())
    return result


def authenticate(data):
    expire()
    slot_id = data.get('compartment_id')
    if type(slot_id) is not int:
        fail('INVALID_REQUEST', '칸 번호를 입력해주세요.')
    slot(slot_id)
    scope = f'slot:{slot_id}'
    check_limit(scope)
    password = password_value(data)
    row = live(slot_id)
    verify(scope, bool(mode() == CabinetMode.PUBLIC and row and row['password_hash'] and check_password_hash(row['password_hash'], password)))
    return issue_token('USER', row['session_id']) | {'session': public_session(row)}


def get_session(session_id):
    expire()
    row = get_db().execute('SELECT * FROM storage_session WHERE session_id=?', (session_id,)).fetchone()
    if not row:
        fail('NOT_FOUND', '보관 세션을 찾을 수 없습니다.', 404)
    if mode() == CabinetMode.PUBLIC:
        authorize(session_id=session_id)
    if row['session_status'] not in (SessionStatus.ACTIVE, SessionStatus.RESERVED):
        fail('CONFLICT', '이미 종료된 세션입니다.', 409)
    return row


def checkout(session_id):
    row = get_session(session_id)
    if row['session_status'] != SessionStatus.ACTIVE:
        fail('CONFLICT', '입고 확인 후 출고할 수 있습니다.', 409)
    if slot(row['compartment_id'])['door_status'] == DoorStatus.ERROR:
        fail('DOOR_ERROR', '문 제어 오류입니다. 세션을 유지합니다.', 409)
    if not row['checkout_requested_at']:
        get_db().execute('UPDATE storage_session SET checkout_requested_at=?,checkout_open_confirmed=0 WHERE session_id=?', (now(), session_id))
        get_db().execute("UPDATE compartment SET door_status='MOVING',updated_at=? WHERE compartment_id=?", (now(), row['compartment_id']))
    # A command is never treated as physical door-open/removal confirmation.
    return public_session(get_db().execute('SELECT * FROM storage_session WHERE session_id=?', (session_id,)).fetchone())


def cancel(session_id):
    row = get_session(session_id)
    if row['session_status'] != SessionStatus.RESERVED or slot(row['compartment_id'])['shoe_status'] != ShoeStatus.EMPTY:
        fail('CONFLICT', '입고 전 예약만 취소할 수 있습니다.', 409)
    get_db().execute("UPDATE storage_session SET session_status='CANCELLED',ended_at=? WHERE session_id=?", (now(), session_id))
    revoke(session_id)
    return {'session_status': SessionStatus.CANCELLED}


def mock_observation(slot_id, data):
    if not current_app.config['MOCK_MODE']:
        fail('FORBIDDEN', 'Mock 모드에서만 사용할 수 있습니다.', 403)
    expire()
    old = slot(slot_id)
    shoe = data.get('shoe_status', old['shoe_status'])
    door = data.get('door_status', old['door_status'])
    if shoe not in list(ShoeStatus) or door not in list(DoorStatus):
        fail('INVALID_REQUEST', '잘못된 센서 상태입니다.')
    row = live(slot_id)
    # Confirmations must be observed in order: requested -> OPEN -> EMPTY.
    if shoe != old['shoe_status'] and shoe == ShoeStatus.OCCUPIED:
        event('SHOE_IN', slot_id, row['session_id'] if row else None)
        if row and row['session_status'] == SessionStatus.RESERVED:
            get_db().execute("UPDATE storage_session SET session_status='ACTIVE',started_at=? WHERE session_id=?", (now(), row['session_id']))
    if row and row['checkout_requested_at'] and door == DoorStatus.OPEN:
        get_db().execute('UPDATE storage_session SET checkout_open_confirmed=1 WHERE session_id=?', (row['session_id'],))
    if shoe != old['shoe_status'] and shoe == ShoeStatus.EMPTY:
        normal = row and row['checkout_requested_at'] and door != DoorStatus.ERROR and (row['checkout_open_confirmed'] or door == DoorStatus.OPEN)
        event('SHOE_OUT' if normal or mode() == CabinetMode.HOME else 'UNEXPECTED_REMOVAL', slot_id, row['session_id'] if row else None)
        if normal:
            get_db().execute("UPDATE storage_session SET session_status='COMPLETED',ended_at=? WHERE session_id=?", (now(), row['session_id']))
            revoke(row['session_id'])
    get_db().execute('UPDATE compartment SET shoe_status=?,door_status=?,updated_at=? WHERE compartment_id=?', (shoe, door, now(), slot_id))
    return {'mock': True, 'compartment_id': slot_id}
