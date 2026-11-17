import React, { useEffect, useRef, useState } from "react";

export default function Weather() {
  const [weather, setWeather] = useState({}),
    [loading, setLoading] = useState(false);
  const reload = useRef(null);
  useEffect(() => {
    let requestNumber = 0,
      controller = null,
      active = true;
    const update = (key, value) => {
      if (active) setWeather((old) => ({ ...old, [key]: value }));
    };
    function describe(code, day) {
      if (code === 0) return ["맑음", day ? "☀️" : "🌙"];
      if (code === 1) return ["대체로 맑음", day ? "🌤️" : "🌙"];
      if (code === 2) return ["구름 조금", "⛅"];
      if (code === 3) return ["흐림", "☁️"];
      if ([45, 48].includes(code)) return ["안개", "🌫️"];
      if ([51, 53, 55, 56, 57].includes(code)) return ["이슬비", "🌦️"];
      if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ["비", "🌧️"];
      if ([71, 73, 75, 77, 85, 86].includes(code)) return ["눈", "❄️"];
      if ([95, 96, 99].includes(code)) return ["뇌우", "⛈️"];
      return ["날씨 정보", "☁️"];
    }
    function advice(code, chance, humidity) {
      if (
        [
          51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
        ].includes(code) ||
        (Number.isFinite(chance) && chance >= 60)
      ) {
        return "비에 젖은 신발은 물기를 닦은 뒤 보관하고, 내부 습도를 확인해 주세요.";
      }
      if ([71, 73, 75, 77, 85, 86].includes(code))
        return "눈에 젖은 신발의 물기를 제거한 뒤 충분히 환기해 주세요.";
      if (humidity >= 75)
        return "바깥 공기가 습한 편이에요. 신발장 내부 습도도 함께 확인해 주세요.";
      return "신발 보관 전 물기를 확인하고, 신발장 내부 상태를 주기적으로 점검해 주세요.";
    }
    function fail(reason) {
      update("weather-location", "현재 위치 날씨");
      update("weather-description", "날씨 데이터를 불러오지 못했습니다");
      update("weather-rain", "오늘 강수확률 —");
      update("weather-temp", "--°");
      update("weather-icon", "—");
      update(
        "weather-recommendation",
        "실제 날씨 정보를 표시할 수 없습니다. 위치 권한과 인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
      );
      update("weather-update", reason || "날씨 정보 연결 실패");
    }
    function position() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation || !window.isSecureContext) {
          reject(
            new Error(
              "위치 기능은 HTTPS 또는 localhost에서만 사용할 수 있습니다.",
            ),
          );
          return;
        }
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            const msg =
              error.code === 1
                ? "위치 접근이 거부되었습니다. 브라우저 권한을 확인해 주세요."
                : error.code === 2
                  ? "현재 위치를 확인할 수 없습니다."
                  : "위치 확인 시간이 초과되었습니다.";
            reject(new Error(msg));
          },
          {
            enableHighAccuracy: false,
            timeout: 12000,
            maximumAge: 5 * 60 * 1000,
          },
        );
      });
    }
    async function loadWeather() {
      const currentRequest = ++requestNumber;
      if (controller) controller.abort();
      controller = new AbortController();
      const requestController = controller;
      const signal = requestController.signal;
      setLoading(true);
      update("weather-location", "현재 위치 확인 중…");
      update("weather-description", "날씨 데이터를 불러오는 중…");
      update("weather-rain", "오늘 강수확률 —");
      update("weather-temp", "--°");
      update("weather-icon", "📍");
      update("weather-update", "위치 사용 권한을 허용해 주세요");
      try {
        const geo = await position();
        if (currentRequest !== requestNumber) return;
        const { latitude, longitude } = geo.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
          throw new Error("위치 좌표를 확인할 수 없습니다.");
        update("weather-location", "📍 현재 위치 기준");
        update("weather-update", "날씨 API 연결 중…");
        const query = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          current: "temperature_2m,relative_humidity_2m,weather_code,is_day",
          daily: "precipitation_probability_max",
          timezone: "auto",
          forecast_days: "1",
        });
        const timer = setTimeout(() => requestController.abort(), 12000);
        let response;
        try {
          response = await fetch(
            "https://api.open-meteo.com/v1/forecast?" + query,
            { signal, cache: "no-store" },
          );
        } finally {
          clearTimeout(timer);
        }
        if (!response.ok)
          throw new Error("날씨 API 응답 오류: " + response.status);
        const data = await response.json();
        if (currentRequest !== requestNumber) return;
        const now = data.current;
        if (
          !now ||
          !Number.isFinite(now.temperature_2m) ||
          !Number.isFinite(now.weather_code) ||
          !Number.isFinite(now.relative_humidity_2m)
        ) {
          throw new Error("날씨 데이터 형식이 올바르지 않습니다.");
        }
        const chance = data.daily?.precipitation_probability_max?.[0];
        const [label, icon] = describe(now.weather_code, Boolean(now.is_day));
        update(
          "weather-description",
          `${label} · 외부 습도 ${Math.round(now.relative_humidity_2m)}%`,
        );
        update(
          "weather-rain",
          Number.isFinite(chance)
            ? `오늘 최고 강수확률 ${Math.round(chance)}% (예보)`
            : "오늘 강수확률 정보 없음",
        );
        update("weather-temp", `${Math.round(now.temperature_2m)}°`);
        update("weather-icon", icon);
        update(
          "weather-recommendation",
          advice(now.weather_code, chance, now.relative_humidity_2m),
        );
        update(
          "weather-update",
          `날씨 기준 ${now.time?.replace("T", " ") || "시간 미제공"} · ${data.current_units?.temperature_2m || "°C"}`,
        );
      } catch (error) {
        if (currentRequest !== requestNumber) return;
        console.warn("날씨 또는 위치 조회 실패:", error);
        fail(error.message);
      } finally {
        if (currentRequest === requestNumber) setLoading(false);
      }
    }

    reload.current = loadWeather;
    loadWeather();
    const interval = setInterval(() => {
      if (!document.hidden) loadWeather();
    }, 600000);
    return () => {
      active = false;
      requestNumber++;
      controller?.abort();
      clearInterval(interval);
      reload.current = null;
    };
  }, []);
  return (
    <div className="card weather" aria-live="polite">
      <div className="weather-location-row">
        <h3>오늘의 환경</h3>
        <span className="weather-geolocation" id="weather-location">
          {weather["weather-location"] ?? "📍 현재 위치 확인 중…"}
        </span>
      </div>

      <div className="weather-head">
        <div>
          <div id="weather-description" className="small muted mt-6">
            {weather["weather-description"] ?? "날씨 데이터를 불러오는 중…"}
          </div>
          <div id="weather-rain" className="small muted mt-6">
            {weather["weather-rain"] ?? "오늘 강수확률 —"}
          </div>
        </div>
        <div>
          <span id="weather-temp" className="weather-temp">
            {weather["weather-temp"] ?? "--°"}
          </span>
          <span id="weather-icon" className="weather-emoji" aria-hidden="true">
            {weather["weather-icon"] ?? "🌤️"}
          </span>
        </div>
      </div>

      <div className="rule"></div>
      <h3>오늘의 추천</h3>
      <p className="recommend" id="weather-recommendation">
        {weather["weather-recommendation"] ??
          "현재 위치를 확인해 실제 날씨 정보를 불러오고 있어요."}
      </p>

      <div className="weather-footer">
        <span id="weather-update">
          {weather["weather-update"] ?? "데이터 연결 중"}
        </span>
        <button
          type="button"
          id="weather-refresh"
          onClick={() => reload.current?.()}
          className="weather-refresh"
          disabled={loading}
        >
          {weather["weather-refresh"] ?? "↻ 위치·날씨 새로고침"}
        </button>
      </div>

      <div className="tagline">
        날씨:{" "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open-Meteo
        </a>
        · 외부 날씨와 신발장 내부 센서는 별개예요.
      </div>
    </div>
  );
}
