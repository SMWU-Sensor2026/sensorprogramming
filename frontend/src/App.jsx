import React from "react";
import { useCabinet } from "./useCabinet";
import QrPage from "./pages/QrPage.jsx";
import PublicStartPage from "./pages/PublicStartPage.jsx";
import PublicPasswordPage from "./pages/PublicPasswordPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import CabinetsPage from "./pages/CabinetsPage.jsx";
import DetailPage from "./pages/DetailPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AdminLogin from "./components/AdminLogin.jsx";

const pages = {
  qr: QrPage,
  "public-start": PublicStartPage,
  "public-password": PublicPasswordPage,
  home: HomePage,
  cabinets: CabinetsPage,
  detail: DetailPage,
  settings: SettingsPage,
  admin: AdminPage,
};
export default function App() {
  const s = useCabinet();
  const Page = pages[s.page] || HomePage;
  const nav =
    s.page === "detail" ? "cabinets" : s.page === "admin" ? "settings" : s.page;
  return (
    <>
      <div className="app">
        {s.demoMode && (
          <p id="demo-banner" className="demo-banner" role="status">
            시연 모드 · 장치 없이 버튼을 조작할 수 있어요
          </p>
        )}
        <Page s={s} />
        <nav className="bottom-nav" aria-label="하단 메뉴">
          {[
            ["home", "⌂", "홈"],
            ["cabinets", "▦", "신발장"],
            ["settings", "⚙", "설정"],
          ].map(([page, icon, label]) => (
            <button
              key={page}
              data-nav={page}
              className={"nav-btn" + (nav === page ? " active" : "")}
              onClick={() => s.navigate(page)}
            >
              <span className="ico">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      <AdminLogin s={s} />
      <div
        className={"toast" + (s.toast ? " show" : "")}
        id="toast"
        role="status"
        aria-live="polite"
      >
        {s.toast}
      </div>
    </>
  );
}
