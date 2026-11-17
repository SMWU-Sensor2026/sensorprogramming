import React from "react";

export default function PublicPasswordPage({ s }) {
  return (
    <section
      id="page-public-password"
      className={
        "page public-flow-page" +
        (s.page === "public-password" ? " active" : "")
      }
    >
      <button
        type="button"
        className="back"
        onClick={() => s.navigate("public-start")}
        disabled={s.busy}
      >
        ← 칸 선택으로 돌아가기
      </button>

      <div className="qr-entry public-password-intro">
        <div className="qr-hero-icon public-lock-icon" aria-hidden="true">
          🔐
        </div>

        <div className="qr-eyebrow">PRIVATE CABINET ACCESS</div>

        <h1 id="public-auth-title">{`${s.publicSelected}번 칸 비밀번호 ${s.authBusy ? "입력" : "설정"}`}</h1>

        <p className="qr-description" id="public-auth-description">
          {s.authBusy
            ? "보관할 때 설정한 비밀번호를 입력해주세요."
            : "이용할 비밀번호를 설정해주세요."}
        </p>

        <form
          id="public-password-form"
          className="qr-summary public-password-form"
          onSubmit={s.submitPublicPassword}
        >
          <label htmlFor="public-password" className="qr-summary-label">
            비밀번호
          </label>

          <input
            id="public-password"
            className="simple-input"
            type="password"
            minLength="4"
            maxLength="32"
            autoComplete="off"
            required
            placeholder="4자 이상 입력"
            name="password"
          />
          <div
            id="public-confirm-row"
            className={"password-confirm-row" + (!s.authBusy ? "" : " hidden")}
          >
            <label
              htmlFor="public-password-confirm"
              className="qr-summary-label"
            >
              비밀번호 확인
            </label>
            <input
              id="public-password-confirm"
              className="simple-input"
              type="password"
              minLength="4"
              maxLength="32"
              autoComplete="off"
              placeholder="비밀번호 다시 입력"
              name="confirm"
            />
          </div>

          <p
            id="public-password-message"
            className="form-feedback"
            role="alert"
          >
            {s.feedback}
          </p>

          <button
            type="submit"
            className="button"
            id="public-auth-button"
            disabled={s.busy}
          >
            {s.authBusy ? "인증하고 들어가기" : "예약하기"}
          </button>
        </form>

        <p id="public-auth-note" className="tiny-note public-prototype-warning">
          {s.hardwareMode === "MOCK"
            ? "비밀번호는 서버에서 관리합니다. 예약 후 문을 열고 입출고 시연 버튼을 사용하세요."
            : "비밀번호는 서버에서 관리합니다. 예약 후 문을 열고 신발을 넣어주세요."}
        </p>

        <button
          type="button"
          className="start-admin-link"
          onClick={() => s.openPrototypeAdmin()}
          disabled={s.busy}
        >
          관리자 모드로 접속
        </button>
      </div>
    </section>
  );
}
