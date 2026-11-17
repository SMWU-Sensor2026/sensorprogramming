# 뽀송연구회 스마트 신발장

기존 모바일 화면을 Flask 서버에 연결한 첫 단계입니다. 센서는 **Mock**이며 실제 GPIO 제어는 하지 않습니다.

## 실행 (macOS / Linux / Raspberry Pi)

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Windows PowerShell에서는 `python -m venv .venv` 후 `.venv\Scripts\Activate.ps1`로 활성화합니다.

컴퓨터에서 http://localhost:5000 접속. 같은 Wi-Fi의 휴대폰에서는 `http://컴퓨터의LAN_IP:5000`에 접속합니다. 방화벽의 5000번 포트 허용이 필요할 수 있습니다. 이 메인 주소가 통합 QR에 들어갈 주소입니다. 서버가 실행 중이어야 접속됩니다.

HTML 파일을 직접 열지 말고 Flask 주소로 접속하세요. 위치 기반 날씨는 localhost 또는 HTTPS에서 동작하며, 일반 HTTP LAN 주소에서는 브라우저가 위치 접근을 제한합니다.

## 현재 동작

- 기존 디자인, HTML/CSS/JS 분리 유지
- HOME 모드 칸 목록 및 상세 화면: API를 5초 간격으로 조회
- `GET /api/cabinets/1`, `/api/compartments`, `/api/compartments/1`, `/api/system/status`, `/api/environment/external`
- 공통 `{success, data, error}` 응답, 미연결 외부 센서값과 예상 건조시간은 null
- 서버 연결 실패 안내, 실제 센서와 구분되는 Mock 표시

관리자 인증, PUBLIC 모드, SQLite 보관 세션, 비밀번호/토큰 인증, 출고 및 GPIO 연결은 다음 단계입니다. 기존 브라우저 비밀번호 저장과 모드 변경은 비활성화했습니다. 미구현 API는 501을 반환합니다. 현재 서버는 개발·로컬 시연용이며 외부 공개 배포는 포함하지 않습니다.

## 검증

```sh
python -m unittest discover -s tests -v
node --check static/js/script.js
```
