import { useEffect, useRef, useState } from "react";
import { api } from "./api/client";

const params = new URLSearchParams(location.search);
const qrCabinet = ["1", "2"].includes(params.get("cabinet"))
  ? Number(params.get("cabinet"))
  : null;
function savedAccess() {
  try {
    return JSON.parse(sessionStorage.getItem("bbosong_access") || "null");
  } catch {
    return null;
  }
}
export function useCabinet() {
  const [slots, setSlots] = useState([]),
    [mode, setMode] = useState("home");
  const [page, setPage] = useState("home"),
    [selected, setSelected] = useState(qrCabinet || 1);
  const [publicSelected, setPublicSelected] = useState(1),
    [adminDetail, setAdminDetail] = useState(false);
  const [adminToken, setAdminToken] = useState(null),
    [access, setAccess] = useState(savedAccess);
  const [demoMode, setDemoMode] = useState(false),
    [hardwareMode, setHardwareMode] = useState("MOCK");
  const [status, setStatus] = useState("서버에 연결 중…"),
    [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false),
    [loginOpen, setLoginOpen] = useState(false);
  const [feedback, setFeedback] = useState(""),
    [loginFeedback, setLoginFeedback] = useState("");
  const [modeChoice, setModeChoice] = useState("home"),
    [noQr, setNoQr] = useState(false);
  const [history, setHistory] = useState(null),
    [dryingHistory, setDryingHistory] = useState(null);
  const [qrAddress, setQrAddress] = useState("");
  const latest = useRef({}),
    refreshing = useRef(false),
    actionBusy = useRef(false);
  const refreshAgain = useRef(false),
    timer = useRef(null),
    mounted = useRef(true),
    generation = useRef(0);
  latest.current = { mode, page, adminToken, access, selected, adminDetail };
  function showToast(message) {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3000);
  }
  function storeAccess(value) {
    setAccess(value);
    latest.current.access = value;
    try {
      value
        ? sessionStorage.setItem("bbosong_access", JSON.stringify(value))
        : sessionStorage.removeItem("bbosong_access");
    } catch {
      /* storage may be disabled */
    }
  }
  function navigate(target) {
    const s = latest.current;
    if (target === "admin" && !s.adminToken) {
      openPrototypeAdmin();
      return;
    }
    if (
      s.mode === "public" &&
      !["admin", "public-start", "public-password", "detail"].includes(target)
    )
      target = "public-start";
    if (!["admin", "detail"].includes(target)) setAdminDetail(false);
    setFeedback("");
    setPage(target);
    latest.current.page = target;
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function refreshState(initial = false) {
    if (refreshing.current) {
      refreshAgain.current = true;
      return;
    }
    refreshing.current = true;
    const epoch = generation.current;
    try {
      const cabinet = await api("/cabinets/1");
      const nextMode = cabinet.mode === "PUBLIC" ? "public" : "home";
      let states = await api("/compartments");
      let s = latest.current;
      if (s.adminToken) {
        try {
          states = await api("/admin/compartments", { token: s.adminToken });
        } catch (error) {
          if (![401, 403].includes(error.status)) throw error;
          setAdminToken(null);
          latest.current.adminToken = null;
          setAdminDetail(false);
          setPage(nextMode === "public" ? "public-start" : "home");
        }
      }
      s = latest.current;
      if (nextMode === "public" && s.access) {
        try {
          const session = await api("/storage-sessions/me", {
            token: s.access.access_token,
          });
          if (epoch !== generation.current || !mounted.current) return;
          storeAccess({ ...s.access, session });
          if (s.page === "detail" && !s.adminDetail) {
            const c = await api("/compartments/" + s.selected, {
              token: s.access.access_token,
            });
            states = states.map((x) =>
              x.compartment_id === c.compartment_id ? c : x,
            );
          }
        } catch (error) {
          if (![401, 403].includes(error.status)) throw error;
          storeAccess(null);
          if (s.page === "detail" && !s.adminDetail) {
            setPage("public-start");
            showToast("접근 권한이 종료됐어요. 비밀번호로 다시 인증해주세요.");
          }
        }
      }
      if (epoch !== generation.current || !mounted.current) return;
      if (nextMode !== s.mode) {
        setModeChoice(nextMode);
        setAdminDetail(false);
        if (!initial && s.page !== "admin")
          setPage(nextMode === "public" ? "public-start" : "home");
      }
      setMode(nextMode);
      latest.current.mode = nextMode;
      setDemoMode(cabinet.demo_mode);
      setHardwareMode(cabinet.hardware_mode);
      setSlots(states);
      setStatus(
        cabinet.hardware_mode === "MOCK"
          ? "서버 연결됨 · 센서 시연 모드"
          : "서버 연결됨 · 장치 데이터",
      );
      if (initial) {
        if (params.get("admin") === "1" || location.pathname === "/admin")
          await openPrototypeAdmin();
        else
          setPage(
            nextMode === "public" ? "public-start" : qrCabinet ? "qr" : "home",
          );
      }
    } catch (error) {
      if (!mounted.current || epoch !== generation.current) return;
      setSlots([]);
      setStatus(
        "서버 연결 실패 · 상태를 불러오지 못했어요. 잠시 후 재시도합니다.",
      );
      if (latest.current.page === "detail") {
        setAdminDetail(false);
        setPage(latest.current.mode === "public" ? "public-start" : "home");
      }
      showToast(error.message);
    } finally {
      refreshing.current = false;
      if (refreshAgain.current && mounted.current) {
        refreshAgain.current = false;
        refreshState();
      }
    }
  }
  useEffect(() => {
    mounted.current = true;
    refreshState(true);
    const interval = setInterval(() => {
      if (!document.hidden && !actionBusy.current) refreshState();
    }, 5000);
    return () => {
      mounted.current = false;
      generation.current++;
      clearInterval(interval);
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    document.body.classList.toggle(
      "qr-entry-active",
      ["qr", "public-start", "public-password"].includes(page),
    );
    document.body.classList.toggle(
      "public-user-active",
      mode === "public" && page !== "admin" && !adminDetail,
    );
    document.body.classList.toggle(
      "admin-detail-active",
      page === "detail" && adminDetail,
    );
    return () => {
      ["qr-entry-active", "public-user-active", "admin-detail-active"].forEach(
        (c) => document.body.classList.remove(c),
      );
    };
  }, [page, mode, adminDetail]);
  async function perform(task, onError = showToast) {
    if (actionBusy.current) return;
    actionBusy.current = true;
    generation.current++;
    setBusy(true);
    try {
      await task();
    } catch (error) {
      onError(error.message);
    } finally {
      actionBusy.current = false;
      setBusy(false);
    }
  }
  async function openCabinet(id, token = latest.current.access?.access_token) {
    try {
      const c = await api("/compartments/" + id, {
        token: mode === "public" ? token : undefined,
      });
      setSlots((old) => old.map((x) => (x.compartment_id === id ? c : x)));
      setSelected(id);
      latest.current.selected = id;
      setAdminDetail(false);
      navigate("detail");
    } catch (error) {
      showToast(error.message);
    }
  }
  function continuePublicSlot(id = publicSelected) {
    const c = slots.find((x) => x.compartment_id === id);
    if (!c || c.availability === "UNAVAILABLE") {
      showToast("현재 이용할 수 없는 칸입니다.");
      return;
    }
    setPublicSelected(id);
    navigate("public-password");
  }
  const authBusy =
    slots.find((x) => x.compartment_id === publicSelected)?.availability !==
    "AVAILABLE";
  async function submitPublicPassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = form.elements.password.value;
    if (!authBusy && password !== form.elements.confirm.value) {
      setFeedback("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    await perform(async () => {
      const result = await api(
        authBusy ? "/storage-sessions/authenticate" : "/storage-sessions",
        { method: "POST", data: { compartment_id: publicSelected, password } },
      );
      storeAccess(result);
      await openCabinet(publicSelected, result.access_token);
    }, setFeedback);
    form.reset();
  }
  async function openPrototypeAdmin() {
    if (latest.current.adminToken) {
      navigate("admin");
      return;
    }
    await perform(async () => {
      const config = await api("/config");
      setDemoMode(config.demo_mode);
      setHardwareMode(config.hardware_mode);
      if (config.demo_mode) {
        const result = await api("/admin/login", { method: "POST", data: {} });
        setAdminToken(result.access_token);
        latest.current.adminToken = result.access_token;
        navigate("admin");
        await refreshState();
      } else {
        setLoginFeedback("");
        setLoginOpen(true);
      }
    });
  }
  async function loginAdmin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = form.elements.password.value;
    await perform(async () => {
      const result = await api("/admin/login", {
        method: "POST",
        data: { password },
      });
      setAdminToken(result.access_token);
      latest.current.adminToken = result.access_token;
      setLoginOpen(false);
      navigate("admin");
      await refreshState();
    }, setLoginFeedback);
    form.reset();
  }
  async function logoutAdmin() {
    await perform(async () => {
      await api("/admin/logout", { method: "POST", token: adminToken });
      setAdminToken(null);
      latest.current.adminToken = null;
      setAdminDetail(false);
      setHistory(null);
      setDryingHistory(null);
      navigate(mode === "public" ? "public-start" : "home");
      await refreshState();
    });
  }
  async function saveMode(target = modeChoice, preview = false) {
    await perform(async () => {
      await api("/admin/cabinet/mode", {
        method: "PATCH",
        data: { mode: target.toUpperCase() },
        token: adminToken,
      });
      storeAccess(null);
      await refreshState();
      if (preview) navigate("public-start");
      else showToast("운영 모드를 저장했어요.");
    });
  }
  function openAdminCabinet(id) {
    if (!adminToken) return;
    setSelected(id);
    setAdminDetail(true);
    latest.current.adminDetail = true;
    navigate("detail");
  }
  function runControl(path, data, token, message) {
    return perform(async () => {
      await api(path, { method: "POST", data, token });
      await refreshState();
      showToast(message);
    });
  }
  const detailToken = adminDetail ? adminToken : access?.access_token;
  function controlDoor(target) {
    return runControl(
      `/compartments/${selected}/door`,
      { door_status: target },
      detailToken,
      "문 명령을 전달했어요. 상태를 확인해주세요.",
    );
  }
  function controlFans(enabled) {
    return runControl(
      `/compartments/${selected}/fans`,
      { enabled },
      detailToken,
      enabled ? "팬 시작을 요청했어요." : "팬 정지를 요청했어요.",
    );
  }
  function simulateShoe(shoe) {
    return runControl(
      `/compartments/${selected}/simulate`,
      { shoe_status: shoe, humidity: shoe === "OCCUPIED" ? 65 : 44 },
      detailToken,
      "입출고 시연을 반영했어요.",
    );
  }
  function adminDoor(id, target) {
    return runControl(
      `/compartments/${id}/door`,
      { door_status: target },
      adminToken,
      "문 상태를 확인해주세요.",
    );
  }
  function adminFans(id, enabled) {
    return runControl(
      `/compartments/${id}/fans`,
      { enabled },
      adminToken,
      "팬 상태를 확인해주세요.",
    );
  }
  function mockObserve(id, shoe, door) {
    return runControl(
      `/admin/mock/compartments/${id}`,
      {
        ...(shoe
          ? { shoe_status: shoe, humidity: shoe === "OCCUPIED" ? 65 : 44 }
          : {}),
        ...(door ? { door_status: door } : {}),
      },
      adminToken,
      "Mock 센서 상태를 반영했어요.",
    );
  }
  async function endPublicSession() {
    if (!access) return;
    await perform(async () => {
      const session = await api("/storage-sessions/me", {
        token: access.access_token,
      });
      const action =
        session.session_status === "RESERVED" ? "cancel" : "checkout";
      await api(`/storage-sessions/${session.session_id}/${action}`, {
        method: "POST",
        token: access.access_token,
      });
      if (action === "cancel") {
        storeAccess(null);
        navigate("public-start");
        showToast("예약을 취소했어요.");
      } else
        showToast("출고 요청 완료 · 문 열림과 신발 반출 확인을 기다립니다.");
      await refreshState();
    });
  }
  async function resetDemo() {
    if (
      !confirm(
        "현재 시연 중인 보관 세션과 칸 상태를 초기화할까요? 기록은 유지됩니다.",
      )
    )
      return;
    await perform(async () => {
      await api("/admin/demo/reset", {
        method: "POST",
        data: {},
        token: adminToken,
      });
      storeAccess(null);
      await refreshState();
      showToast("시연 상태를 초기화했어요.");
    });
  }
  async function toggleAdminHistory() {
    if (history !== null) {
      setHistory(null);
      return;
    }
    await perform(async () => {
      const rows = await api("/admin/events", { token: adminToken });
      setHistory(
        rows.map(
          (e) =>
            `${e.occurred_at} · ${e.compartment_id}번 칸 · ${e.event_type}`,
        ),
      );
    });
  }
  async function loadDryingHistory() {
    await perform(async () => {
      const rows = await api("/admin/drying-sessions", { token: adminToken });
      setDryingHistory(
        rows.map(
          (r) =>
            `${r.compartment_id}번 칸 · ${r.started_at} · ${r.result} · ${r.duration_seconds === null ? "진행 중" : r.duration_seconds + "초"}`,
        ),
      );
    });
  }
  async function copyQrLinks() {
    try {
      await navigator.clipboard.writeText(location.origin + "/");
      showToast("공통 QR 주소가 복사됐어요.");
    } catch {
      setQrAddress(location.origin + "/");
      showToast("표시된 주소를 복사해주세요.");
    }
  }
  return {
    slots,
    mode,
    page,
    selected,
    publicSelected,
    setPublicSelected,
    adminDetail,
    adminToken,
    access,
    demoMode,
    hardwareMode,
    status,
    toast,
    busy,
    loginOpen,
    setLoginOpen,
    feedback,
    loginFeedback,
    modeChoice,
    setModeChoice,
    noQr,
    setNoQr,
    history,
    dryingHistory,
    qrAddress,
    authBusy,
    navigate,
    openCabinet,
    continuePublicSlot,
    submitPublicPassword,
    openPrototypeAdmin,
    loginAdmin,
    logoutAdmin,
    saveMode,
    openAdminCabinet,
    controlDoor,
    controlFans,
    simulateShoe,
    adminDoor,
    adminFans,
    mockObserve,
    endPublicSession,
    resetDemo,
    toggleAdminHistory,
    loadDryingHistory,
    copyQrLinks,
    backFromDetail: () => {
      if (adminDetail) {
        setAdminDetail(false);
        navigate("admin");
      } else navigate(mode === "public" ? "public-start" : "cabinets");
    },
    enterQrCabinet: () =>
      mode === "public" ? navigate("public-start") : openCabinet(selected),
  };
}
