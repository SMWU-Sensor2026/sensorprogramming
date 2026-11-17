import React from "react";
import { stateLabel, dryingEstimate } from "../components/Cabinets.jsx";

export default function DetailPage({ s }) {
  const c = s.slots.find((x) => x.compartment_id === s.selected);
  if (!c) return null;
  return (
    <section
      id="page-detail"
      className={"page" + (s.page === "detail" ? " active" : "")}
    >
      <button
        className="back"
        id="detail-back"
        onClick={() => s.backFromDetail()}
        disabled={s.busy}
      >
        {s.adminDetail
          ? "← 관리자 페이지"
          : s.mode === "public"
            ? "← 칸 선택"
            : "← 신발장 목록"}
      </button>
      <div className="heading">
        <div>
          <div className="eyebrow">SHOE CARE</div>
          <h1 id="detail-title">{s.selected + "번 신발장"}</h1>
          <p className="subtitle" id="detail-subtitle">
            신발 보관 및 건조 상태
          </p>
        </div>
      </div>
      <div className="status-banner">
        <div className="row">
          <h3>현재 상태</h3>
          <span
            className={
              "badge " + (c.shoe_status === "OCCUPIED" ? "red" : "green")
            }
            id="detail-badge"
          >
            {stateLabel(c)}
          </span>
        </div>
        <div className="giant" id="detail-icon">
          {c.shoe_status === "OCCUPIED" ? "👟" : "🧺"}
        </div>
        <h2 id="detail-status">{stateLabel(c)}</h2>
        <div className="subtitle" id="detail-desc">
          {"문 상태: " + (c.door_status || "—")}
        </div>
      </div>
      <div className="metric-grid">
        <div className="metric">
          <div className="title">🌡 온도</div>
          <div className="value" id="detail-temp">
            {Number.isFinite(c.temperature)
              ? c.temperature.toFixed(1) + "°C"
              : "—"}
          </div>
          <div className="small muted sensor-source">
            {s.hardwareMode === "MOCK" ? "시연 센서값" : "센서 측정값"}
          </div>
        </div>
        <div className="metric">
          <div className="title">💧 습도</div>
          <div className="value" id="detail-humidity">
            {(c.humidity ?? "—") + "%"}
          </div>
          <div className="small muted sensor-source">
            {s.hardwareMode === "MOCK" ? "시연 센서값" : "센서 측정값"}
          </div>
        </div>
        <div className="metric">
          <div className="title">🌀 환기 팬</div>
          <div className="value" id="detail-fan">
            {c.fan_status || "—"}
          </div>
          <div className="small muted">독립 제어 상태</div>
        </div>
        <div className="metric">
          <div className="title">👟 신발 감지</div>
          <div className="value" id="detail-shoes">
            {c.shoe_status === "UNKNOWN"
              ? "불확실"
              : c.shoe_status === "OCCUPIED"
                ? "있음"
                : "없음"}
          </div>
          <div className="small muted">보관 감지 상태</div>
        </div>
      </div>
      <div className="drying-estimate" aria-live="polite">
        <div className="drying-estimate-icon" aria-hidden="true">
          ◷
        </div>
        <div className="drying-estimate-body">
          <div className="drying-estimate-label">
            예상 남은 건조시간{" "}
            <span className="estimate-demo-tag">데이터 수집 중</span>
          </div>
          <strong id="detail-estimate">{dryingEstimate(c)}</strong>
          <p id="detail-estimate-note">
            {"건조 이력이 부족해 예상 시간을 제공할 수 없습니다."}
          </p>
        </div>
      </div>
      <div className="control-actions">
        <button
          id="door-button"
          className="button"
          onClick={() => s.controlDoor("OPEN")}
          disabled={s.busy}
        >
          문 열기
        </button>
        <button
          id="close-door-button"
          className="button secondary"
          onClick={() => s.controlDoor("CLOSED")}
          disabled={s.busy}
        >
          문 닫기
        </button>
        <button
          id="fan-on-button"
          className="button secondary"
          onClick={() => s.controlFans(true)}
          disabled={s.busy}
        >
          팬 시작
        </button>
        <button
          id="fan-off-button"
          className="button secondary"
          onClick={() => s.controlFans(false)}
          disabled={s.busy}
        >
          팬 정지
        </button>
      </div>
      <div
        id="demo-detail-controls"
        className={"card mt-14" + (s.demoMode ? "" : " hidden")}
      >
        <h3>입출고 시연</h3>
        <p className="tiny-note">문을 연 뒤 신발을 넣거나 꺼내보세요.</p>
        <button
          id="demo-insert"
          className="button secondary"
          onClick={() => s.simulateShoe("OCCUPIED")}
          disabled={s.busy}
        >
          신발 넣기 (시연)
        </button>
        <button
          id="demo-remove"
          className="button secondary"
          onClick={() => s.simulateShoe("EMPTY")}
          disabled={s.busy}
        >
          신발 꺼내기 (시연)
        </button>
      </div>
      <button
        id="public-end-button"
        type="button"
        className={
          "button secondary" +
          (s.mode === "public" && !s.adminDetail ? "" : " hidden")
        }
        onClick={() => s.endPublicSession()}
        disabled={s.busy}
      >
        {s.access?.session?.session_status === "RESERVED"
          ? "입고 전 예약 취소"
          : "출고 요청"}
      </button>
      <button
        id="public-lock-button"
        type="button"
        className={
          "qr-home-link" +
          (s.mode === "public" && !s.adminDetail ? "" : " hidden")
        }
        onClick={() => s.navigate("public-start")}
        disabled={s.busy}
      >
        칸 선택 화면으로 돌아가기
      </button>
      <div className="tiny-note" id="detail-access-note">
        {(s.hardwareMode === "MOCK"
          ? "시연 모드 · 문과 팬 상태를 화면에서 확인할 수 있어요."
          : "장치 제어 모드 · 센서가 실제 상태를 확인합니다.") +
          (c.session?.session_status === "RESERVED"
            ? " 예약 완료 · 문을 열고 신발을 넣어주세요."
            : "")}
      </div>
    </section>
  );
}
