import { useState, useEffect, useCallback } from "react";
import { gamesAPI, playerRequest } from "./api";

export default function useArena(code, token, host) {
  const [game, setGame] = useState(null);
  const [connection, setConnection] = useState("connecting");
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  const refresh = useCallback(() => setGeneration((n) => n + 1), []);
  useEffect(() => {
    setGame(null);
    setError("");
    setConnection("connecting");
  }, [code, token, host]);
  useEffect(() => {
    if (!code || (!host && !token)) return;
    let stopped = false,
      timer,
      controller,
      failures = 0,
      inFlight = false;
    async function poll() {
      if (stopped || inFlight) return;
      if (document.hidden) {
        timer = setTimeout(poll, 2000);
        return;
      }
      inFlight = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const state = host
          ? await gamesAPI.state(code, controller.signal)
          : await playerRequest(
              code,
              token,
              "state",
              undefined,
              controller.signal,
            );
        if (stopped) return;
        setGame((previous) =>
          previous?.serverTime > state.serverTime
            ? previous
            : { ...state, receivedAt: Date.now() },
        );
        setConnection("online");
        setError("");
        failures = 0;
        if (state.status === "finished") return;
      } catch (e) {
        if (stopped) return;
        if ([401, 403, 404, 410].includes(e.status)) {
          setError(e.message);
          setConnection("closed");
          return;
        }
        failures++;
        setConnection("reconnecting");
      } finally {
        clearTimeout(timeout);
        inFlight = false;
      }
      if (!stopped)
        timer = setTimeout(
          poll,
          Math.min(20000, 2000 * 2 ** Math.min(failures, 3)) +
            Math.random() * 250,
        );
    }
    function wake() {
      if (!document.hidden && !inFlight) {
        clearTimeout(timer);
        poll();
      }
    }
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [code, token, host, generation]);
  return { game, connection, error, refresh };
}
