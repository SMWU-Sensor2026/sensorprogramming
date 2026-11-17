# 팀원 코드 연결 규격

`team_driver.example.py`를 `team_driver.py`로 복사하고, 기존 팀원 모듈을 import하여 함수 안에서 호출하세요. Flask 재시작 시 `create_driver()`를 자동 호출합니다. 파일이 없으면 MockDriver로 시연합니다. 파일이 있는데 import/초기화에 실패하면 시작 오류를 표시하며 Mock으로 조용히 대체하지 않습니다.

드라이버에는 `is_mock = False`와 다음 다섯 함수가 필요합니다.

| 함수 | 입력 | 반환 |
|---|---|---|
| `read_compartment(compartment_id)` | 1 또는 2 | 아래 센서 상태 dict |
| `read_external_environment()` | 없음 | `{temperature, humidity, is_valid}` |
| `open_door(compartment_id)` | 1 또는 2 | 명령 수락 시 정확히 `True`, 실패 시 `False` 또는 예외 |
| `close_door(compartment_id)` | 1 또는 2 | 명령 수락 시 정확히 `True`, 실패 시 `False` 또는 예외 |
| `set_fans(compartment_id, circulation_on, exhaust_on)` | 칸 ID와 bool 두 개 | 명령 수락 시 정확히 `True`, 실패 시 `False` 또는 예외 |

`read_compartment()`는 아래 여섯 필드를 모두 반환해야 합니다.

```python
{
    'shoe_status': 'OCCUPIED',       # EMPTY / OCCUPIED / UNKNOWN
    'door_status': 'CLOSED',         # OPEN / CLOSED / MOVING / ERROR
    'temperature': 24.0,            # 섭씨, 측정 불가 시 None
    'humidity': 65.0,               # 상대습도 0~100, 측정 불가 시 None
    'circulation_fan_status': 'ON', # ON / OFF
    'exhaust_fan_status': 'ON',      # ON / OFF
}
```

웹은 약 5초마다 읽습니다. 읽기 함수는 빠르게 반환하도록 하고 긴 측정·GPIO 루프는 팀 모듈에서 따로 관리하세요. 한 칸에 대해 중복 호출되어도 같은 최신 상태를 반환하도록 구현합니다. 실제 장치 초기화는 `create_driver()`에서 합니다. GPIO 라이브러리는 Raspberry Pi 환경에 별도로 설치하세요.

**서보 명령 전송을 문 열림으로 반환하면 안 됩니다.** 실제 문 감지 입력이 없으면 OPEN을 임의 생성하지 말고 MOVING/ERROR를 반환하세요. PUBLIC 출고 완료는 출고 요청 이후 문 열림과 신발 반출이 확인돼야 처리됩니다. 팬 명령도 실제 작동 상태는 다음 읽기에서 보고하세요.

웹 버튼 → Flask 권한 확인 → 드라이버 명령 → 실제 센서 읽기 → DB/세션/이벤트 갱신 → 웹 표시 순서로 연결됩니다. 실제 드라이버에서는 관리자 시연 입력과 무비밀번호 로그인이 꺼지므로 `ADMIN_PASSWORD`를 지정하고 실행하세요.
