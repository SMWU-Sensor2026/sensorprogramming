import React from "react";

export default function QrPage({ s }) {
  return (
    <section
      id="page-qr"
      className={"page qr-page" + (s.page === "qr" ? " active" : "")}
      aria-labelledby="qr-title"
    >
      <div className="qr-entry">
        <div className="qr-brand">
          <span className="qr-brand-mark">♧</span>
          <span>PPOSONG LAB</span>
        </div>

        <div className="qr-hero-icon" aria-hidden="true">
          👟
        </div>

        <div className="qr-eyebrow">SMART SHOE CABINET</div>

        <h1 id="qr-title">
          <span id="qr-cabinet-title">{s.selected + "번"}</span>
          신발장
        </h1>

        <p className="qr-description">
          QR코드로 연결된 신발장이에요.
          <br />
          아래 버튼을 눌러 상태를 확인해 보세요.
        </p>

        <div className="qr-summary">
          <div className="qr-summary-label">선택된 신발장</div>

          <div className="qr-summary-value">
            <span className="qr-location-icon">▦</span>
            <strong id="qr-selected-cabinet">
              {String(s.selected).padStart(2, "0") + "번 칸"}
            </strong>
            <span className="qr-selected-pill">연결 완료</span>
          </div>
        </div>

        <button
          type="button"
          className="button qr-primary"
          id="qr-enter"
          onClick={() => s.enterQrCabinet()}
          disabled={s.busy}
        >
          내 신발장 확인하기 <span aria-hidden="true">→</span>
        </button>

        <button
          type="button"
          className={"qr-home-link" + (s.mode !== "public" ? "" : " hidden")}
          id="qr-home-link"
          onClick={() => s.navigate("home")}
          disabled={s.busy}
        >
          전체 신발장 홈으로 이동
        </button>

        <button
          type="button"
          className={
            "start-admin-link" + (s.mode === "public" ? "" : " hidden")
          }
          id="qr-admin-link"
          onClick={() => s.openPrototypeAdmin()}
          disabled={s.busy}
        >
          관리자 모드로 접속
        </button>
      </div>

      <div className="qr-footnote">뽀송연구회 · 스마트 신발장</div>
    </section>
  );
}
