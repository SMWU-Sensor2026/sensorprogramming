import React from "react";
import { AdminCabinets } from "../components/Cabinets.jsx";

export default function AdminPage({ s }) {
  return (
    <section
      id="page-admin"
      className={"page" + (s.page === "admin" ? " active" : "")}
    >
      <button
        className="back"
        onClick={() =>
          s.navigate(s.mode === "public" ? "public-start" : "home")
        }
        disabled={s.busy}
      >
        ← 이전 화면으로 돌아가기
      </button>
      <div className="heading">
        <div>
          <div className="eyebrow">ADMIN CONSOLE</div>
          <h1>관리자 페이지</h1>
          <p className="subtitle">신발장의 사용 환경을 지정하세요.</p>
        </div>
        <div className="brand-symbol">⚙</div>
      </div>
      <div className="card">
        <h2>운영 모드</h2>
        <p className="small muted mt-7">
          설정한 모드에 따라 사용자 화면 안내와 이용 방식이 변경됩니다.
        </p>
        <label
          className={
            "setting-card" + (s.modeChoice === "home" ? " selected" : "")
          }
          id="home-choice"
        >
          <input
            type="radio"
            name="mode"
            value="home"
            checked={s.modeChoice === "home"}
            onChange={(event) => s.setModeChoice(event.target.value)}
          />
          <span>🏠</span>
          <span>
            <strong>가정용 모드</strong>
            <small>로그인 없이 전체 신발장 상태 확인</small>
          </span>
        </label>
        <label
          className={
            "setting-card" + (s.modeChoice === "public" ? " selected" : "")
          }
          id="public-choice"
        >
          <input
            type="radio"
            name="mode"
            value="public"
            checked={s.modeChoice === "public"}
            onChange={(event) => s.setModeChoice(event.target.value)}
          />
          <span>🏢</span>
          <span>
            <strong>공공장소용 모드</strong>
            <small>공통 QR → 칸 선택 → 비밀번호 인증</small>
          </span>
        </label>
        <button
          className="button"
          onClick={() => s.saveMode()}
          disabled={s.busy}
        >
          변경 사항 저장
        </button>
      </div>
      <div className="card mt-14">
        <h3>공공장소용 공통 QR 주소</h3>
        <p className="small muted mt-7">
          QR 1개를 사용하고, 접속 후 1번·2번 칸을 선택합니다.
        </p>
        <button
          type="button"
          className="button secondary"
          onClick={() => s.copyQrLinks()}
          disabled={s.busy}
        >
          공통 QR 주소 복사
        </button>
        <p id="qr-address" className="tiny-note">
          {s.qrAddress}
        </p>
        <div className="row mt-12">
          <button
            type="button"
            className="button secondary admin-test-btn"
            onClick={() => s.saveMode("public", true)}
            disabled={s.busy}
          >
            공공장소 사용자 화면 미리보기
          </button>
        </div>
        <p className="tiny-note">
          모든 칸이 비어 있고 문이 닫혀 있어야 운영 모드를 변경할 수 있습니다.
        </p>
      </div>
      <div className="card mt-14">
        <h3>▦ 신발장 상태 관리</h3>

        <p className="small muted mt-7">
          관리자는 비밀번호를 입력하지 않고 각 칸의 상태를 확인할 수 있어요.
        </p>

        <div id="admin-cabinet-grid" className="admin-cabinet-grid">
          {s.adminToken && (
            <AdminCabinets
              slots={s.slots}
              mock={s.hardwareMode === "MOCK"}
              open={s.openAdminCabinet}
              door={s.adminDoor}
              fans={s.adminFans}
              observe={s.mockObserve}
              busy={s.busy}
            />
          )}
        </div>
      </div>

      <div
        id="demo-reset-card"
        className={"card mt-14" + (s.demoMode ? "" : " hidden")}
      >
        <h3>시연 초기화</h3>
        <p className="tiny-note">
          보관 세션을 종료하고 칸과 문·팬 상태를 초기화합니다. 기존 기록은
          유지합니다.
        </p>
        <button
          className="button secondary"
          onClick={() => s.resetDemo()}
          disabled={s.busy}
        >
          시연 초기화
        </button>
      </div>
      <div className="card mt-14 admin-history-card">
        <div className="row">
          <div>
            <h3>◷ 이용 기록 관리</h3>
            <p className="small muted mt-7">
              관리자 화면에서만 이용 기록을 확인합니다.
            </p>
          </div>
        </div>
        <button
          className="button secondary"
          onClick={() => s.loadDryingHistory()}
          disabled={s.busy}
        >
          건조 기록 보기
        </button>
        <div
          id="drying-history-content"
          className={"" + (s.dryingHistory !== null ? "" : " hidden")}
          role="region"
          aria-label="건조 기록"
        >
          {s.dryingHistory?.length
            ? s.dryingHistory.map((line, i) => <p key={i}>{line}</p>)
            : "아직 건조 기록이 없어요. 팬을 시작해보세요."}
        </div>
        <button
          id="admin-history-toggle"
          className="button secondary"
          type="button"
          aria-expanded={s.history !== null}
          aria-controls="admin-history-panel"
          onClick={() => s.toggleAdminHistory()}
          disabled={s.busy}
        >
          {s.history === null ? "이용 기록 보기" : "이용 기록 접기"}
        </button>
        <div
          id="admin-history-panel"
          className={"" + (s.history !== null ? "" : " hidden")}
          role="region"
          aria-label="이용 기록"
        >
          <div className="divider"></div>
          <div id="history-content">
            {s.history?.length
              ? s.history.map((line, i) => <p key={i}>{line}</p>)
              : "아직 이용 기록이 없어요."}
          </div>
        </div>
      </div>
      <footer className="admin-page-footer">
      <button
        id="admin-logout-button"
        className="button secondary"
        onClick={() => s.logoutAdmin()}
        disabled={s.busy}
      >
        관리자 로그아웃
      </button>
      </footer>
    </section>
  );
}
