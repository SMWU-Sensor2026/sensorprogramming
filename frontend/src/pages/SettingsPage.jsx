import React from "react";

export default function SettingsPage({ s }) {
  return (
    <section
      id="page-settings"
      className={"page" + (s.page === "settings" ? " active" : "")}
    >
      <div className="heading">
        <div>
          <div className="eyebrow">PREFERENCES</div>
          <h1>설정</h1>
          <p className="subtitle">신발장 운영 정보를 확인하세요.</p>
        </div>
        <div className="brand-symbol">⚙</div>
      </div>
      <div className="card">
        <div className="row">
          <h3>현재 운영 모드</h3>
          <span className="badge" id="current-mode-badge">
            {s.mode === "home" ? "가정용" : "공공장소용"}
          </span>
        </div>
        <p className="small muted mt-12" id="mode-description">
          {s.mode === "home"
            ? "로그인 없이 상태를 확인할 수 있어요."
            : "비밀번호로 해당 칸만 이용할 수 있어요."}
        </p>
        <div className="divider"></div>
        <div className="row">
          <h3>신발장 수</h3>
          <strong>2칸</strong>
        </div>
        <div className="divider"></div>
        <div className="row">
          <h3>라즈베리파이 연결</h3>
          <span id="hardware-badge" className="badge red">
            {s.hardwareMode === "MOCK" ? "장치 없이 시연 중" : "장치 연결 모드"}
          </span>
        </div>
        <div id="hardware-note" className="tiny-note">
          {s.hardwareMode === "MOCK"
            ? "실제 장치 없이 문과 팬 상태를 시연합니다."
            : "연결된 장치의 센서 상태를 확인합니다."}
        </div>
      </div>
      <button
        className="button secondary"
        onClick={() => s.navigate("admin")}
        disabled={s.busy}
      >
        ⚙ 관리자 페이지 열기
      </button>
      <p className="tiny-note">
        <span id="admin-access-note">
          {s.demoMode
            ? "시연 모드에서는 비밀번호 없이 관리자 화면을 열 수 있어요."
            : "관리자 비밀번호로 인증 후 접속할 수 있어요."}
        </span>
      </p>
    </section>
  );
}
