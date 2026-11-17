import React from "react";
import { CabinetCards } from "../components/Cabinets.jsx";
import Weather from "../components/Weather.jsx";

export default function HomePage({ s }) {
  return (
    <section
      id="page-home"
      className={"page" + (s.page === "home" ? " active" : "")}
    >
      <header className="home-title">
        <h1>뽀송연구회 스마트 신발장</h1>
      </header>

      <Weather />

      <div className="section-head">
        <h2>신발장 현황</h2>
        <span id="home-mode-label">
          {s.mode === "home" ? "가정용 모드" : "공공장소용 모드"}
        </span>
      </div>

      <p id="server-status" className="tiny-note" role="status">
        {s.status}
      </p>
      <div id="home-grid" className="cabinet-grid">
        {s.mode === "home" && (
          <CabinetCards slots={s.slots} openCabinet={s.openCabinet} />
        )}
      </div>

      <div className="mt-17 notice">
        📱 신발장 공통 QR코드를 스캔하면 메인 화면에 접속할 수 있어요.
      </div>
    </section>
  );
}
