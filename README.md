# 뽀송연구회 스마트 신발장

Flask + SQLite로 모바일 웹, 칸별 보관 세션, 비밀번호 인증을 연결했습니다. **같은 Wi-Fi에서 시연**하기 위한 개발 서버입니다. 실제 GPIO는 아직 연결하지 않았으며 온습도·팬·문은 Mock 데이터입니다.

## 실행

Python **3.11 이상**을 사용합니다.

### macOS / Linux / Raspberry Pi

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
read -s -p '시연용 관리자 비밀번호: ' ADMIN_PASSWORD; echo
export ADMIN_PASSWORD
python app.py
```

위 비밀번호 입력 명령은 Bash 기준입니다. macOS 기본 zsh에서는 `read -s 'ADMIN_PASSWORD?시연용 관리자 비밀번호: '`를 사용하고 `export ADMIN_PASSWORD`를 실행하세요.

### Windows PowerShell

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$credential = Read-Host '시연용 관리자 비밀번호' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $credential).Password
python app.py
```

관리자 비밀번호는 서버 실행 때마다 환경변수로 지정합니다. 관리자 인증 토큰은 30분 후 만료되며 다시 로그인할 수 있습니다. 비밀번호를 코드나 Git에 넣지 마세요. 환경변수가 없으면 관리자 로그인에 설정 안내를 반환합니다.

컴퓨터에서 http://localhost:5000 접속. 휴대폰은 같은 Wi-Fi에서 `http://컴퓨터또는라즈베리파이LAN_IP:5000`으로 접속합니다. 이 메인 주소를 통합 QR 1개에 넣으면 됩니다. 방화벽의 5000번 포트와 기기 간 통신이 허용되어야 합니다. HTML 파일을 직접 열지 말고 Flask 주소로 접속하세요.

위치 기반 날씨는 localhost 또는 HTTPS에서 동작하며, 휴대폰의 일반 HTTP LAN 접속에서는 위치 권한이 제한될 수 있습니다. 날씨 API와 내부 센서는 별개입니다.

## 시연 순서 (휴대폰 + 관리자 브라우저 두 개)

1. 관리자 브라우저에서 설정 → 관리자 페이지 → 위에서 지정한 비밀번호로 로그인합니다.
2. 모든 칸이 비어 있고 문이 닫힌 상태에서 PUBLIC 모드를 저장합니다.
3. 휴대폰에서 공통 주소 접속 → 1번 칸 선택 → 비밀번호 4~32자 설정 → 예약 완료.
4. 관리자 페이지의 1번 칸 **입고 감지** 버튼을 누릅니다. RESERVED → ACTIVE가 됩니다.
5. 휴대폰 화면이 갱신되면 **출고 요청**을 누릅니다. 아직 세션과 비밀번호는 유지됩니다.
6. 관리자에서 **문 열림 확인** → **반출 감지**를 차례로 누릅니다. COMPLETED 처리와 모든 해당 세션 토큰 무효화를 한 트랜잭션으로 수행합니다.
7. 휴대폰은 다음 갱신에서 칸 선택 화면으로 돌아갑니다. 관리자에서 **문 닫힘**을 누르면 다음 사용자가 예약할 수 있습니다.
8. 관리자 **이용 기록 보기**에서 SHOE_IN / SHOE_OUT을 확인합니다.

오류 시연: 입고 후 관리자에서 **문 오류**를 누르고 휴대폰에서 출고 요청하면 세션·비밀번호를 유지하고 오류를 표시합니다. **문 닫힘**으로 복구한 후 다시 출고 요청할 수 있습니다. 출고 요청 없이 반출을 감지하면 UNEXPECTED_REMOVAL을 기록하고 세션은 유지합니다.

입고 전에는 예약 취소가 가능합니다. 10분 동안 입고하지 않은 예약은 다음 API 조회에서 EXPIRED 처리됩니다. 접근 토큰은 30분 만료되지만 ACTIVE 보관 세션은 유지되어 비밀번호로 재인증할 수 있습니다.

## 구현 범위

- 기존 모바일 디자인 유지, 상태 5초 주기 조회 및 연결 실패 안내
- SQLite `instance/bbosong.db` 자동 생성, 서버 재시작 후 보관 상태·기록 유지
- 공통 Enum, 단일 활성 세션 고유 인덱스와 트랜잭션으로 동시 중복 예약 방지
- PUBLIC 목록은 칸 이용 가능 여부만 제공, 상세 조회·예약 취소·출고는 세션별 Bearer 토큰으로 검증
- 비밀번호는 Werkzeug scrypt 해시, 접근 토큰은 SHA-256 해시로 DB 저장
- 사용자 토큰은 해당 브라우저 탭 sessionStorage에만 저장, 비밀번호 원문 저장 없음
- 칸별·관리자별 5회 인증 실패 후 1분 제한, 관리자 모드 변경·기록·Mock 입력 보호
- HOME 보관 세션 생성은 비밀번호·토큰을 사용하지 않음
- 문 구동 명령과 실제 문 열림 확인 구분, 정상 출고 전 권한 유지
- 예상 건조시간은 데이터 부족으로 null, 외부 센서는 미연결 상태

아직 실제 센서·서보 드라이버와 자동 건조 기록은 구현하지 않았습니다. 관리자 Mock 입력은 실제 측정을 흉내 내는 시연 도구이며 실물 확인이 아닙니다. HOME 화면은 상태 조회를 제공하고, HOME 예약·취소·출고 API도 지원합니다. 자동 접근 감지 및 HOME 입고 시 자동 세션 생성은 하드웨어 연동 단계에서 연결합니다.

## API

응답은 `{success, data, error}` 형식입니다. 인증은 `Authorization: Bearer <access_token>`을 사용합니다.

| Method | 경로 | 기능 |
|---|---|---|
| GET | `/api/cabinets/1`, `/api/system/status` | 운영 모드 및 시스템 상태 |
| GET | `/api/compartments`, `/api/compartments/<id>` | 칸 목록·상세 |
| GET | `/api/environment/external` | 미연결 외부 센서 |
| POST | `/api/storage-sessions` | `{compartment_id, password}` 예약 (HOME은 password 불필요) |
| POST | `/api/storage-sessions/authenticate` | `{compartment_id, password}` 인증 |
| GET | `/api/storage-sessions/me` | 토큰에 연결된 보관 세션 |
| POST | `/api/storage-sessions/<id>/cancel`, `/checkout` | 예약 취소·출고 요청 |
| POST | `/api/admin/login`, `/logout` | `{password}` 관리자 로그인 및 토큰 로그아웃 |
| PATCH | `/api/admin/cabinet/mode` | `{mode: "HOME" 또는 "PUBLIC"}` |
| GET | `/api/admin/compartments`, `/api/admin/events` | 관리자 전체 상태·최근 100개 기록 |
| POST | `/api/admin/mock/compartments/<id>` | `{shoe_status?, door_status?}` Mock 측정 입력 |

운영 모드는 이용 중인 칸이 있으면 변경할 수 없습니다. 관리자 상세 조회는 관리자 전용 경로를 사용합니다. `GET /api/admin/drying-sessions`는 다음 단계이며 501을 반환합니다.

## 검증

```sh
python -m unittest discover -s tests -v
node --check static/js/script.js
```

테스트는 임시 DB에서 실행하며 시연 DB에 영향을 주지 않습니다. 중복 예약 동시 요청, 비밀번호 성공·실패, 다른 칸 접근 거부, 토큰 만료·재인증, 정상 출고 시 전체 권한 무효화, 출고 실패 시 세션 유지, 관리자 접근 제한, 예약 취소·만료 및 서버 재시작을 검증합니다.
