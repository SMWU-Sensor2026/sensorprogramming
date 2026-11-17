export async function api(path, { method = "GET", data, token } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("/api" + path, {
      method,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      const error = new Error(
        result.error?.message || "서버 요청에 실패했습니다.",
      );
      error.code = result.error?.code;
      error.status = response.status;
      throw error;
    }
    return result.data;
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error("서버 응답 시간이 초과됐어요. 다시 시도해주세요.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
