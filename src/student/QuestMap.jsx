import { useEffect, useRef } from "react";

export function drawQuestMap(ctx, track, progress, heroX) {
  const colors = {
    math: ["#d9f0e5", "#afd5be", "#46886b"],
    logic: ["#f9e4dd", "#edbca8", "#b96757"],
    science: ["#dceefa", "#b3d3e7", "#4c87a3"],
  }[track] || ["#d9f0e5", "#afd5be", "#46886b"];
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, 384, 112);
  ctx.fillStyle = "#ffffff";
  for (const [x, y] of [
    [22, 18],
    [175, 10],
    [320, 23],
  ]) {
    ctx.fillRect(x, y, 26, 6);
    ctx.fillRect(x + 6, y - 4, 13, 4);
  }
  ctx.fillStyle = colors[1];
  for (let i = 0; i < 10; i++) {
    const h = 18 + ((i * 13) % 28);
    ctx.fillRect(i * 44, 76 - h, 32, h);
  }
  ctx.fillStyle = colors[2];
  ctx.fillRect(0, 78, 384, 34);
  ctx.fillStyle = "#c9b991";
  ctx.fillRect(0, 84, 384, 9);
  ctx.fillStyle = "#f4efd9";
  ctx.fillRect(0, 84, 384, 2);
  for (let i = 0; i < 4; i++) {
    const x = 50 + i * 90;
    ctx.fillStyle = i < progress ? "#f5cf68" : "#ffffff";
    ctx.fillRect(x - 5, 82, 12, 12);
    ctx.fillStyle = i < progress ? "#986c19" : colors[2];
    ctx.fillRect(x - 1, 86, 4, 4);
    ctx.fillStyle = "#f4f8f6";
    ctx.fillRect(x + 5, 41, 2, 37);
    ctx.fillStyle = i < progress ? "#14836b" : "#e76955";
    ctx.fillRect(x + 7, 41, 13, 9);
  }
  ctx.fillStyle = "#263c39";
  ctx.fillRect(heroX - 6, 55, 12, 7);
  ctx.fillStyle = "#f4ba89";
  ctx.fillRect(heroX - 5, 62, 10, 7);
  ctx.fillStyle = "#263c39";
  ctx.fillRect(heroX + 2, 64, 2, 2);
  ctx.fillStyle = "#f6be4b";
  ctx.fillRect(heroX - 6, 69, 12, 10);
  ctx.fillStyle = "#fff4ce";
  ctx.fillRect(heroX - 9, 70, 3, 7);
  ctx.fillRect(heroX + 6, 70, 3, 7);
  ctx.fillStyle = "#263c39";
  ctx.fillRect(heroX - 6, 79, 4, 5);
  ctx.fillRect(heroX + 2, 79, 4, 5);
}

export default function QuestMap({ track = "math", progress = 0, label }) {
  const ref = useRef(null),
    last = useRef(22);
  useEffect(() => {
    const ctx = ref.current.getContext("2d");
    const target = Math.min(352, 22 + progress * 90),
      from = last.current;
    const start = performance.now();
    let frame;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = (now) => {
      const t = reduced ? 1 : Math.min(1, (now - start) / 550);
      last.current = Math.round(from + (target - from) * (1 - (1 - t) ** 3));
      drawQuestMap(ctx, track, progress, last.current);
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [track, progress]);
  return (
    <canvas
      ref={ref}
      className="quest-map"
      width="384"
      height="112"
      role="img"
      aria-label={label || "Quest map"}
    />
  );
}
