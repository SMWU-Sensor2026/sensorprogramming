import json
from flask import Blueprint, jsonify, request, current_app
from werkzeug.security import check_password_hash
from database.repository import get_db, now
from modules.storage import service as storage
from modules import controls

api = Blueprint('api', __name__)


def success(data, status=200):
    return jsonify(success=True, data=data, error=None), status


@api.errorhandler(storage.APIError)
def handle_error(error):
    return jsonify(success=False, data=None, error={'code': error.code, 'message': error.message}), error.status


def body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        storage.fail('INVALID_REQUEST', 'JSON 객체를 보내주세요.')
    return data


@api.before_request
def validate_origin():
    if request.method != 'GET' and request.headers.get('Origin'):
        if request.headers['Origin'].rstrip('/') != request.host_url.rstrip('/'):
            storage.fail('FORBIDDEN', '다른 출처의 요청은 허용하지 않습니다.', 403)


def state(slot_id, detail=True):
    controls.sync(slot_id)
    row = storage.slot(slot_id)
    session = storage.live(slot_id)
    availability = ('RESERVED' if session['session_status'] == 'RESERVED' else 'IN_USE') if session else ('AVAILABLE' if row['shoe_status'] == 'EMPTY' and row['door_status'] == 'CLOSED' else 'UNAVAILABLE')
    result = dict(compartment_id=slot_id, compartment_number=slot_id, availability=availability)
    if detail:
        occupied = row['shoe_status'] == 'OCCUPIED'
        fans_on = row['circulation_fan_status'] == 'ON' or row['exhaust_fan_status'] == 'ON'
        result.update(shoe_status=row['shoe_status'], temperature=row['temperature'], humidity=row['humidity'],
                      drying_status='DRYING' if fans_on else 'IDLE', fan_status='ON' if fans_on else 'OFF',
                      circulation_fan_status=row['circulation_fan_status'], exhaust_fan_status=row['exhaust_fan_status'],
                      door_status=row['door_status'], remaining_seconds=None, updated_at=row['updated_at'], session=storage.public_session(session) if session else None)
    return result


@api.get('/cabinets/<int:cabinet_id>')
def cabinet(cabinet_id):
    if cabinet_id != 1:
        storage.fail('NOT_FOUND', '신발장을 찾을 수 없습니다.', 404)
    return success(dict(cabinet_id=1, mode=storage.mode(), system_status='DEGRADED' if controls.driver().is_mock else 'NORMAL', hardware_mode='MOCK' if controls.driver().is_mock else 'GPIO', demo_mode=current_app.config['DEMO_MODE']))


@api.get('/compartments')
def compartments():
    storage.expire()
    return success([state(i, storage.mode() == 'HOME') for i in (1, 2)])


@api.get('/compartments/<int:slot_id>')
def compartment(slot_id):
    storage.slot(slot_id)
    if storage.mode() == 'PUBLIC':
        storage.authorize(slot_id=slot_id)
    return success(state(slot_id))


@api.post('/storage-sessions')
def create_session():
    return success(storage.create_session(body()), 201)


@api.post('/storage-sessions/authenticate')
def authenticate():
    return success(storage.authenticate(body()))


@api.get('/storage-sessions/me')
def me():
    return success(storage.public_session(storage.authorize()))


@api.post('/storage-sessions/<int:session_id>/checkout')
def checkout(session_id):
    return success(storage.checkout(session_id))


@api.post('/storage-sessions/<int:session_id>/cancel')
def cancel(session_id):
    return success(storage.cancel(session_id))


@api.post('/admin/login')
def admin_login():
    data = body()
    if current_app.config['DEMO_MODE'] and controls.driver().is_mock:
        return success(storage.issue_token('ADMIN') | {'demo_mode': True})
    storage.check_limit('admin')
    password = data.get('password')
    admin_hash = current_app.config.get('ADMIN_PASSWORD_HASH')
    if not admin_hash:
        storage.fail('ADMIN_NOT_CONFIGURED', '서버 실행 전 ADMIN_PASSWORD를 설정해주세요.', 503)
    storage.verify('admin', isinstance(password, str) and len(password) <= 128 and check_password_hash(admin_hash, password))
    return success(storage.issue_token('ADMIN'))


@api.post('/admin/logout')
def admin_logout():
    token = storage.authorize(admin=True)
    get_db().execute('DELETE FROM access_token WHERE token_hash=?', (token['token_hash'],))
    return success({})


@api.patch('/admin/cabinet/mode')
def set_mode():
    storage.authorize(admin=True)
    target = body().get('mode')
    if target not in ('HOME', 'PUBLIC'):
        storage.fail('INVALID_REQUEST', 'HOME 또는 PUBLIC을 지정해주세요.')
    if target != storage.mode():
        if get_db().execute("SELECT 1 FROM storage_session WHERE session_status IN ('ACTIVE','RESERVED')").fetchone() or get_db().execute("SELECT 1 FROM compartment WHERE shoe_status!='EMPTY' OR door_status!='CLOSED'").fetchone():
            storage.fail('CONFLICT', '모든 칸을 비우고 문을 닫은 후 모드를 변경해주세요.', 409)
        get_db().execute('UPDATE cabinet SET mode=? WHERE cabinet_id=1', (target,))
    return success({'mode': target})


@api.get('/admin/compartments')
def admin_compartments():
    storage.authorize(admin=True)
    return success([state(i) for i in (1, 2)])


@api.get('/admin/events')
def events():
    storage.authorize(admin=True)
    rows = get_db().execute('SELECT * FROM shoe_event ORDER BY occurred_at DESC LIMIT 100').fetchall()
    return success([dict(row) | {'details': json.loads(row['details'])} for row in rows])


@api.post('/admin/mock/compartments/<int:slot_id>')
def mock_sensor(slot_id):
    storage.authorize(admin=True)
    if not controls.driver().is_mock:
        storage.fail('FORBIDDEN', '시연 모드에서만 센서를 수동 입력할 수 있습니다.', 403)
    result = controls.observe(slot_id, body())
    controls.auto_dry(slot_id)
    return success(result)


@api.get('/system/status')
def status():
    return success(dict(system_status='DEGRADED' if controls.driver().is_mock else 'NORMAL', hardware_mode='MOCK' if controls.driver().is_mock else 'GPIO', gpio_connected=not controls.driver().is_mock, demo_mode=current_app.config['DEMO_MODE']))


@api.get('/environment/external')
def external():
    try:
        measurement = controls.driver().read_external_environment()
    except Exception:
        storage.fail('SENSOR_ERROR', '외부 센서 조회에 실패했습니다.', 503)
    return success(dict(cabinet_id=1, measured_at=now(), **measurement))


@api.get('/config')
def config():
    return success({'demo_mode': current_app.config['DEMO_MODE'], 'hardware_mode': 'MOCK' if controls.driver().is_mock else 'GPIO'})


def authorize_control(slot_id):
    storage.slot(slot_id)
    if storage.mode() == 'PUBLIC':
        try:
            storage.authorize(admin=True)
            return True
        except storage.APIError:
            storage.authorize(slot_id=slot_id)
    return False


@api.post('/compartments/<int:slot_id>/door')
def door(slot_id):
    is_admin = authorize_control(slot_id)
    target = body().get('door_status')
    if target not in ('OPEN', 'CLOSED'):
        storage.fail('INVALID_REQUEST', 'OPEN 또는 CLOSED를 지정해주세요.')
    session = storage.live(slot_id)
    if target == 'OPEN' and session and session['session_status'] == 'ACTIVE':
        # Authorize the same session, even when an admin opens an occupied PUBLIC slot.
        return success(storage.checkout(session['session_id'], as_admin=is_admin))
    return success(controls.command_door(slot_id, target))


@api.post('/compartments/<int:slot_id>/fans')
def fans(slot_id):
    authorize_control(slot_id)
    enabled = body().get('enabled')
    if type(enabled) is not bool:
        storage.fail('INVALID_REQUEST', 'enabled는 true 또는 false여야 합니다.')
    return success(controls.set_fans(slot_id, enabled))


@api.post('/compartments/<int:slot_id>/simulate')
def simulate(slot_id):
    if not current_app.config['DEMO_MODE'] or not controls.driver().is_mock:
        storage.fail('FORBIDDEN', '시연 모드에서만 사용할 수 있습니다.', 403)
    authorize_control(slot_id)
    data = body()
    if set(data) - {'shoe_status', 'humidity', 'temperature'}:
        storage.fail('INVALID_REQUEST', '시연 입력 필드를 확인해주세요.')
    result = controls.observe(slot_id, data)
    controls.auto_dry(slot_id)
    return success(result)


@api.get('/admin/drying-sessions')
def drying_sessions():
    storage.authorize(admin=True)
    return success([dict(row) for row in get_db().execute('SELECT * FROM drying_session ORDER BY drying_id DESC LIMIT 100')])


@api.post('/admin/demo/reset')
def demo_reset():
    storage.authorize(admin=True)
    if not current_app.config['DEMO_MODE'] or not controls.driver().is_mock:
        storage.fail('FORBIDDEN', '시연 모드에서만 초기화할 수 있습니다.', 403)
    for row in get_db().execute("SELECT session_id FROM storage_session WHERE session_status IN ('ACTIVE','RESERVED')").fetchall():
        get_db().execute("UPDATE storage_session SET session_status='CANCELLED',ended_at=? WHERE session_id=?", (now(), row['session_id']))
        storage.revoke(row['session_id'])
    for slot_id in (1, 2):
        controls.observe(slot_id, {'shoe_status': 'EMPTY', 'door_status': 'CLOSED', 'temperature': 24, 'humidity': 44, 'circulation_fan_status': 'OFF', 'exhaust_fan_status': 'OFF'})
    return success({'reset': True})


@api.route('/<path:path>', methods=['GET', 'POST', 'PATCH', 'DELETE', 'PUT'])
def unsupported(path):
    storage.fail('NOT_IMPLEMENTED', '아직 구현되지 않은 API입니다.', 501)
