import React from "react";
import { PublicSlots } from "../components/Cabinets.jsx";

export default function PublicStartPage({ s }) {
  return (
    <section
      id="page-public-start"
      className={
        "page public-flow-page" + (s.page === "public-start" ? " active" : "")
      }
    >
      <div className="qr-entry">
        <div className="qr-brand">PPOSONG LAB</div>

        <div className="qr-hero-icon" aria-hidden="true">
          👟
        </div>

        <div className="qr-eyebrow">SMART SHOE CABINET</div>

        <h1>뽀송연구회 스마트 신발장</h1>

        <p className="qr-description">
          이용할 신발장 칸을 선택하고
          <br />
          비밀번호로 이용을 시작하거나 다시 접속하세요.
        </p>

        <div className="qr-summary public-flow-card">
          <div className="qr-summary-label">이용할 칸 선택</div>

          <p id="public-server-status" className="tiny-note" role="status">
            {s.status}
          </p>
          <div id="public-slot-grid" className="public-slot-grid">
            <PublicSlots
              slots={s.slots}
              selected={s.publicSelected}
              select={s.setPublicSelected}
            />
          </div>

          <button
            type="button"
            className="button"
            onClick={() => s.continuePublicSlot()}
            disabled={s.busy}
          >
            선택한 칸으로 계속하기 →
          </button>
        </div>
      </div>

      <div className="prototype-access">
        <button
          type="button"
          className="start-admin-link"
          onClick={() => s.openPrototypeAdmin()}
          disabled={s.busy}
        >
          관리자 모드로 접속
        </button>

        <button
          type="button"
          className="prototype-access-link"
          id="no-qr-button"
          aria-expanded={s.noQr}
          aria-controls="no-qr-choices"
          onClick={() => s.setNoQr(!s.noQr)}
          disabled={s.busy}
        >
          QR 없이 접속 <span aria-hidden="true">›</span>
        </button>

        <div
          id="no-qr-choices"
          className={"no-qr-choices" + (s.noQr ? "" : " hidden")}
        >
          <p>시연용 바로가기</p>
          <div className="no-qr-button-row">
            <button onClick={() => s.continuePublicSlot(1)} disabled={s.busy}>
              1번 신발장
            </button>
            <button onClick={() => s.continuePublicSlot(2)} disabled={s.busy}>
              2번 신발장
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
