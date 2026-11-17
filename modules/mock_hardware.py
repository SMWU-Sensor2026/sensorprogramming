"""GPIO 연결 전 읽기 전용 Mock. 실제 측정값이 아닙니다."""
from datetime import datetime, timezone


def compartment_states():
    now = datetime.now(timezone.utc).isoformat()
    return [dict(
        compartment_id=i, compartment_number=i,
        availability='IN_USE' if i == 1 else 'AVAILABLE',
        shoe_status='OCCUPIED' if i == 1 else 'EMPTY',
        temperature=24.0 if i == 1 else 23.1,
        humidity=65 if i == 1 else 44,
        drying_status='DRYING' if i == 1 else 'IDLE',
        fan_status='ON' if i == 1 else 'OFF',
        circulation_fan_status='ON' if i == 1 else 'OFF',
        exhaust_fan_status='ON' if i == 1 else 'OFF',
        door_status='CLOSED', remaining_seconds=None, updated_at=now,
    ) for i in (1, 2)]
