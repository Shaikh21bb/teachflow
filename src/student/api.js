import { API_BASE, readResponse } from "../lib/http";
export async function studentAPI(path, options = {}) {
  const token = localStorage.getItem("studentToken") || "";
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (
    response.status === 401 &&
    (localStorage.getItem("studentToken") || "") === token
  ) {
    localStorage.removeItem("studentToken");
    window.dispatchEvent(new Event("student:expired"));
  }
  return readResponse(response);
}
export const localized = (value, language) =>
  value?.[language === "kk" ? "kk" : "ru"] || "";
