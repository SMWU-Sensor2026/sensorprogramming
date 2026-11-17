"""Commands and observed sensor states share one path for Mock and team drivers."""
import math
from datetime import datetime
from flask import current_app
from database.repository import get_db, now
from modules.storage import service as storage


def driver():
    return current_app.extensions['hardware']


def command_door(slot_id, target):
    storage.slot(slot_id)
    function = driver().open_door if target == 'OPEN' else driver().close_door
    try:
        accepted = function(slot_id)
    except Exception:
        accepted = False
    if accepted is not True:
        # Keep the active session and credentials; never claim an opening succeeded.
        get_db().execute("UPDATE compartment SET door_status='ERROR',updated_at=? WHERE compartment_id=?", (now(), slot_id))
        storage.event('DOOR_ERROR', slot_id, details={'target': target})
        get_db().commit()
        storage.fail('DOOR_ERROR', '문 명령을 전달하지 못했습니다. 보관 세션은 유지됩니다.', 503)
    get_db().execute("UPDATE compartment SET door_status='MOVING',updated_at=? WHERE compartment_id=?", (now(), slot_id))
    if driver().is_mock and current_app.config.get('MOCK_AUTO_CONFIRM', True):
        storage.observe(slot_id, {'door_status': target})
    return {'accepted': True, 'target': target, 'mock': driver().is_mock}


def set_fans(slot_id, enabled):
    old = storage.slot(slot_id)
    try:
        accepted = driver().set_fans(slot_id, enabled, enabled)
    except Exception:
        accepted = False
    if accepted is not True:
        storage.event('DRY_ERROR', slot_id)
        get_db().commit()
        storage.fail('CONTROL_ERROR', '팬 명령을 전달하지 못했습니다.', 503)
    if driver().is_mock:
        observe(slot_id, {'circulation_fan_status': 'ON' if enabled else 'OFF', 'exhaust_fan_status': 'ON' if enabled else 'OFF'})
    return {'accepted': True, 'mock': driver().is_mock}


def observe(slot_id, data):
    old = storage.slot(slot_id)
    temperature, humidity = data.get('temperature', old['temperature']), data.get('humidity', old['humidity'])
    for name, value, minimum, maximum in [('temperature', temperature, -40, 80), ('humidity', humidity, 0, 100)]:
        if value is not None and (type(value) not in (int, float) or not math.isfinite(value) or not minimum <= value <= maximum):
            storage.fail('INVALID_REQUEST', f'{name} 측정값이 올바르지 않습니다.')
    circulation = data.get('circulation_fan_status', old['circulation_fan_status'])
    exhaust = data.get('exhaust_fan_status', old['exhaust_fan_status'])
    if circulation not in ('ON', 'OFF') or exhaust not in ('ON', 'OFF'):
        storage.fail('INVALID_REQUEST', '잘못된 팬 상태입니다.')
    storage.observe(slot_id, data)
    get_db().execute('UPDATE compartment SET temperature=?,humidity=?,circulation_fan_status=?,exhaust_fan_status=? WHERE compartment_id=?', (temperature, humidity, circulation, exhaust, slot_id))
    was_on = old['circulation_fan_status'] == 'ON' or old['exhaust_fan_status'] == 'ON'
    is_on = circulation == 'ON' or exhaust == 'ON'
    if not was_on and is_on:
        session = storage.live(slot_id)
        get_db().execute("INSERT INTO drying_session(compartment_id,session_id,started_at,initial_temperature,initial_humidity,result) VALUES (?,?,?,?,?,'DRYING')", (slot_id, session['session_id'] if session else None, now(), temperature, humidity))
        storage.event('DRY_START', slot_id, session['session_id'] if session else None)
    if was_on and not is_on:
        row = get_db().execute('SELECT * FROM drying_session WHERE compartment_id=? AND ended_at IS NULL ORDER BY drying_id DESC LIMIT 1', (slot_id,)).fetchone()
        if row:
            duration = max(0, int((datetime.fromisoformat(now()) - datetime.fromisoformat(row['started_at'])).total_seconds()))
            result = 'COMPLETED' if humidity is not None and humidity <= 50 else 'IDLE'
            get_db().execute("UPDATE drying_session SET ended_at=?,final_humidity=?,duration_seconds=?,result=? WHERE drying_id=?", (now(), humidity, duration, result, row['drying_id']))
            storage.event('DRY_COMPLETE' if result == 'COMPLETED' else 'DRY_STOP', slot_id, row['session_id'])
    return {'mock': driver().is_mock, 'compartment_id': slot_id}


def sync(slot_id):
    if driver().is_mock:
        return
    try:
        observation = driver().read_compartment(slot_id)
        required = {'shoe_status', 'door_status', 'temperature', 'humidity', 'circulation_fan_status', 'exhaust_fan_status'}
        if not isinstance(observation, dict) or not required <= observation.keys():
            raise ValueError('read_compartment must return all required sensor fields')
        observe(slot_id, observation)
        auto_dry(slot_id)
    except storage.APIError:
        raise
    except Exception:
        storage.fail('SENSOR_ERROR', '센서 조회에 실패했습니다. 연결 파일을 확인해주세요.', 503)


def auto_dry(slot_id):
    row = storage.slot(slot_id)
    humidity = row['humidity']
    if row['shoe_status'] == 'UNKNOWN' or humidity is None:
        return
    on = row['circulation_fan_status'] == 'ON' or row['exhaust_fan_status'] == 'ON'
    if not on and row['shoe_status'] == 'OCCUPIED' and humidity >= 60:
        set_fans(slot_id, True)
    elif on and (row['shoe_status'] == 'EMPTY' or humidity <= 50):
        set_fans(slot_id, False)
