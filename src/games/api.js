import { API_BASE, requestAPI, readResponse } from "../lib/http";

const storageKey = (code) => `urpaq-arena:${code}`;
async function bounded(work) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await work(controller.signal);
  } catch (e) {
    if (e.name === "AbortError")
      throw new Error(
        "Сервер не ответил. Повторите запрос / Сұрауды қайталаңыз",
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
const teacherRequest = (path, options = {}) =>
  bounded((signal) =>
    requestAPI(path, { ...options, signal: options.signal || signal }),
  );
export function savedPlayer(code) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(code)) || "null");
  } catch {
    return null;
  }
}
export function forgetPlayer(code) {
  try {
    localStorage.removeItem(storageKey(code));
  } catch {}
}
export async function joinGame(code, name) {
  const saved = savedPlayer(code);
  const clientKey = saved?.clientKey || crypto.randomUUID();
  localStorage.setItem(
    storageKey(code),
    JSON.stringify({ ...saved, clientKey, name }),
  );
  const data = await bounded(async (signal) =>
    readResponse(
      await fetch(`${API_BASE}/games/${code}/join`, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clientKey }),
      }),
    ),
  );
  const player = { ...data, clientKey, name };
  localStorage.setItem(storageKey(code), JSON.stringify(player));
  return player;
}
export const gamesAPI = {
  list: () => teacherRequest("/games"),
  create: (values) =>
    teacherRequest("/games", { method: "POST", body: JSON.stringify(values) }),
  state: (code, signal) => teacherRequest(`/games/${code}/state`, { signal }),
  control: (code, action, playerId, roundIndex) =>
    teacherRequest(`/games/${code}/control`, {
      method: "POST",
      body: JSON.stringify({ action, playerId, roundIndex }),
    }),
  boardAnswer: (code, team, roundIndex, answerIndex) =>
    teacherRequest(`/games/${code}/board-answer`, {
      method: "POST",
      body: JSON.stringify({ team, roundIndex, answerIndex }),
    }),
  boardAction: (code, team, roundIndex, kind) =>
    teacherRequest(`/games/${code}/board-action`, {
      method: "POST",
      body: JSON.stringify({ team, roundIndex, kind }),
    }),
  report: (code) => teacherRequest(`/games/${code}/report`),
};
export async function playerRequest(code, token, path = "state", body, signal) {
  return bounded(async (timeoutSignal) =>
    readResponse(
      await fetch(`${API_BASE}/games/${code}/${path}`, {
        method: body ? "POST" : "GET",
        signal: signal || timeoutSignal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    ),
  );
}

export const teamNames = ["Бірлік", "Жалын"];
export const text = (language) => (ru, kk) => (language === "kk" ? kk : ru);
