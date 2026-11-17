import React, { useEffect, useRef } from "react";

export default function AdminLogin({ s }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (s.loginOpen && !dialog.current.open) dialog.current.showModal();
    if (!s.loginOpen && dialog.current.open) dialog.current.close();
  }, [s.loginOpen]);
  return (
    <dialog
      id="admin-login"
      ref={dialog}
      onCancel={() => s.setLoginOpen(false)}
    >
      <form
        onSubmit={s.loginAdmin}
        role="dialog"
        aria-modal="true"
        aria-label="관리자 인증"
      >
        <h2>관리자 인증</h2>
        <p className="tiny-note">
          서버에 설정한 관리자 비밀번호를 입력해주세요.
        </p>
        <label htmlFor="admin-password">비밀번호</label>
        <input
          id="admin-password"
          className="simple-input"
          type="password"
          required
          maxLength="128"
          autoComplete="current-password"
          name="password"
          autoFocus
        />
        <p id="admin-login-message" className="form-feedback" role="alert">
          {s.loginFeedback}
        </p>
        <button
          id="admin-login-submit"
          className="button"
          type="submit"
          disabled={s.busy}
        >
          로그인
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => s.setLoginOpen(false)}
          disabled={s.busy}
        >
          취소
        </button>
      </form>
    </dialog>
  );
}
