import React from "react";
import { CabinetList } from "../components/Cabinets.jsx";

export default function CabinetsPage({ s }) {
  return (
    <section
      id="page-cabinets"
      className={"page" + (s.page === "cabinets" ? " active" : "")}
    >
      <div className="heading">
        <div>
          <div className="eyebrow">MY CABINET</div>
          <h1>신발장</h1>
          <p className="subtitle">칸별 보관 및 건조 상태를 확인하세요.</p>
        </div>
        <div className="brand-symbol">▦</div>
      </div>
      <div id="cabinet-list" className="list">
        {s.mode === "home" && (
          <CabinetList slots={s.slots} openCabinet={s.openCabinet} />
        )}
      </div>
      <div className="tiny-note" id="cabinet-list-note">
        {s.mode === "home" ? "가정용: 두 칸의 상태를 확인할 수 있어요." : ""}
      </div>
    </section>
  );
}
