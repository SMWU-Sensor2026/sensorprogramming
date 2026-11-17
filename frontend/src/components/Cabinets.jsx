import React from "react";

export function stateLabel(c) {
  return c.shoe_status === "UNKNOWN"
    ? "감지 불확실"
    : c.shoe_status !== "OCCUPIED"
      ? "비어 있음"
      : c.drying_status === "DRYING"
        ? "건조 중"
        : "보관 중";
}
export const dryingEstimate = (c) =>
  c?.shoe_status === "OCCUPIED" ? "데이터 수집 중" : "—";
export function CabinetCards({ slots, openCabinet }) {
  return slots.map((c) => (
    <button
      key={c.compartment_id}
      className="cabinet-card"
      onClick={() => openCabinet(c.compartment_id)}
    >
      <div className="row">
        <strong>{c.compartment_id}번 칸</strong>
        <span
          className={
            "badge " + (c.shoe_status === "OCCUPIED" ? "red" : "green")
          }
        >
          {c.shoe_status === "OCCUPIED" ? "사용 중" : "빈 칸"}
        </span>
      </div>
      <div className="art">{c.shoe_status === "OCCUPIED" ? "👟" : "🧺"}</div>
      <div className="state">
        {stateLabel(c)} · 습도 {c.humidity ?? "—"}%
      </div>
      <span className="estimate-line">
        ◷ 예상 건조시간: {dryingEstimate(c)}
      </span>
    </button>
  ));
}
export function CabinetList({ slots, openCabinet }) {
  return slots.map((c) => (
    <button
      key={c.compartment_id}
      className="list-item"
      onClick={() => openCabinet(c.compartment_id)}
    >
      <div>
        <strong>{c.compartment_id}번 신발장</strong>
        <p>
          {stateLabel(c)} · {c.humidity ?? "—"}% RH
        </p>
      </div>
      <span className="chev">›</span>
    </button>
  ));
}
export function PublicSlots({ slots, selected, select }) {
  const labels = {
    AVAILABLE: "이용 가능",
    RESERVED: "예약 중",
    IN_USE: "이용 중",
    UNAVAILABLE: "이용 불가",
  };
  return slots.map((c) => (
    <button
      key={c.compartment_id}
      type="button"
      className={
        "public-slot " + (selected === c.compartment_id ? "chosen" : "")
      }
      onClick={() => select(c.compartment_id)}
      aria-pressed={selected === c.compartment_id}
    >
      <span className="public-slot-icon">▦</span>
      <strong>{c.compartment_id}번 칸</strong>
      <span
        className={
          "badge " + (c.availability === "AVAILABLE" ? "green" : "red")
        }
      >
        {labels[c.availability] || "확인 중"}
      </span>
    </button>
  ));
}
export function AdminCabinets({
  slots,
  mock,
  open,
  door,
  fans,
  observe,
  busy,
}) {
  return slots.map((c) => {
    const id = c.compartment_id;
    return (
      <div key={id} className="card mt-14">
        <button className="admin-cabinet-btn" onClick={() => open(id)}>
          <strong>
            {id}번 칸 · {c.shoe_status || "—"} · {c.door_status || "—"}
          </strong>
          <span>›</span>
        </button>
        <div className="row">
          <button disabled={busy} onClick={() => door(id, "OPEN")}>
            문 열기
          </button>
          <button disabled={busy} onClick={() => door(id, "CLOSED")}>
            문 닫기
          </button>
          <button disabled={busy} onClick={() => fans(id, true)}>
            팬 시작
          </button>
          <button disabled={busy} onClick={() => fans(id, false)}>
            팬 정지
          </button>
        </div>
        {mock && (
          <>
            <p className="tiny-note">센서 상태 시연</p>
            <div className="row">
              <button disabled={busy} onClick={() => observe(id, "OCCUPIED")}>
                입고 감지
              </button>
              <button disabled={busy} onClick={() => observe(id, null, "OPEN")}>
                문 열림 확인
              </button>
              <button disabled={busy} onClick={() => observe(id, "EMPTY")}>
                반출 감지
              </button>
              <button
                disabled={busy}
                onClick={() => observe(id, null, "CLOSED")}
              >
                문 닫힘
              </button>
              <button
                disabled={busy}
                onClick={() => observe(id, null, "ERROR")}
              >
                문 오류
              </button>
            </div>
          </>
        )}
      </div>
    );
  });
}
