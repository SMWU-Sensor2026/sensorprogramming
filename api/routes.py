from flask import Blueprint, jsonify
from modules.mock_hardware import compartment_states

api = Blueprint('api', __name__)


def success(data):
    return jsonify(success=True, data=data, error=None)


def failure(code, message, status):
    return jsonify(success=False, data=None, error=dict(code=code, message=message)), status


@api.get('/cabinets/<int:cabinet_id>')
def cabinet(cabinet_id):
    if cabinet_id != 1:
        return failure('NOT_FOUND', '신발장을 찾을 수 없습니다.', 404)
    return success(dict(cabinet_id=1, mode='HOME', system_status='DEGRADED', hardware_mode='MOCK'))


@api.get('/compartments')
def compartments():
    return success(compartment_states())


@api.get('/compartments/<int:compartment_id>')
def compartment(compartment_id):
    for state in compartment_states():
        if state['compartment_id'] == compartment_id:
            return success(state)
    return failure('NOT_FOUND', '칸을 찾을 수 없습니다.', 404)


@api.get('/system/status')
def status():
    return success(dict(system_status='DEGRADED', hardware_mode='MOCK', gpio_connected=False))


@api.get('/environment/external')
def external_environment():
    return success(dict(cabinet_id=1, temperature=None, humidity=None, is_valid=False, measured_at=None))


@api.route('/<path:path>', methods=['GET', 'POST', 'PATCH', 'DELETE', 'PUT'])
def unsupported(path):
    return failure('NOT_IMPLEMENTED', '아직 구현되지 않은 API입니다.', 501)
