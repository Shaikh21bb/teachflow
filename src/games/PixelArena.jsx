import { useEffect, useRef } from "react";

const C = {
  sky: "#b2d8ce",
  cloud: "#deece1",
  far: "#82b7aa",
  hill: "#447f79",
  forest: "#285a5a",
  ink: "#14383f",
  stone: "#58777b",
  pale: "#c4d7cf",
  cyan: "#34e6cd",
  coral: "#ff7b88",
};
function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function polygon(ctx, color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function background(ctx) {
  rect(ctx, C.sky, 0, 0, 320, 148);
  [
    [12, 16, 44],
    [126, 10, 25],
    [230, 23, 56],
  ].forEach(([x, y, w]) => {
    rect(ctx, C.cloud, x, y, w, 4);
    rect(ctx, C.cloud, x + 7, y - 3, w - 15, 10);
  });
  polygon(ctx, C.far, [
    [0, 79],
    [24, 37],
    [40, 53],
    [65, 23],
    [100, 78],
    [132, 46],
    [174, 81],
    [212, 30],
    [242, 56],
    [266, 32],
    [320, 83],
  ]);
  polygon(ctx, "#c5e0d4", [
    [52, 42],
    [65, 23],
    [77, 42],
    [68, 38],
    [63, 43],
    [59, 38],
  ]);
  polygon(ctx, C.hill, [
    [0, 86],
    [33, 65],
    [72, 88],
    [109, 54],
    [135, 72],
    [161, 63],
    [200, 88],
    [244, 60],
    [280, 81],
    [320, 63],
    [320, 111],
    [0, 111],
  ]);
  for (let x = 0; x < 320; x += 13) {
    const h = 14 + ((x * 7) % 17);
    rect(ctx, C.forest, x, 98 - h, 4, h + 10);
    polygon(ctx, C.forest, [
      [x - 8, 98 - h + 12],
      [x + 2, 98 - h - 3],
      [x + 12, 98 - h + 12],
    ]);
    polygon(ctx, C.forest, [
      [x - 10, 98 - h + 22],
      [x + 2, 98 - h + 5],
      [x + 15, 98 - h + 22],
    ]);
  }
  // The distant gate and two banners anchor the arena without external art or downloads.
  rect(ctx, "#244d52", 139, 59, 4, 49);
  rect(ctx, "#244d52", 178, 59, 4, 49);
  rect(ctx, "#315e60", 134, 56, 53, 6);
  rect(ctx, C.pale, 136, 54, 49, 2);
  polygon(ctx, C.ink, [
    [130, 55],
    [138, 48],
    [182, 48],
    [191, 55],
  ]);
  rect(ctx, "#527d78", 153, 64, 15, 20);
  rect(ctx, "#bad3b5", 157, 67, 7, 10);
  for (const [x, col] of [
    [22, C.cyan],
    [292, C.coral],
  ]) {
    rect(ctx, C.ink, x, 41, 3, 68);
    rect(ctx, "#b3c8b3", x - 3, 39, 9, 3);
    rect(ctx, col, x - 11, 46, 12, 28);
    polygon(ctx, col, [
      [x - 11, 74],
      [x + 1, 74],
      [x - 5, 80],
    ]);
    rect(ctx, C.ink, x - 7, 52, 4, 10);
    rect(ctx, col, x - 6, 54, 2, 6);
    rect(ctx, "#efdd9a", x - 5, 83, 11, 9);
    rect(ctx, "#53716c", x - 6, 81, 13, 2);
  }
  rect(ctx, "#314e56", 0, 109, 320, 39);
  rect(ctx, "#a8bbb2", 0, 108, 320, 3);
  rect(ctx, "#78958f", 0, 111, 320, 4);
  rect(ctx, "#426269", 0, 115, 320, 3);
  for (let y = 119; y < 148; y += 11)
    for (let x = -24; x < 320; x += 38) {
      const shift = y % 2 ? 16 : 0;
      rect(ctx, "#6c8986", x + shift, y, 36, 9);
      rect(ctx, "#789692", x + shift, y, 36, 1);
    }
  rect(ctx, "#2c4d52", 0, 145, 320, 3);
}

function fighter(ctx, x, facing, team, pose, time, hurt, won) {
  const main = team === 0 ? C.cyan : C.coral,
    shadow = team === 0 ? "#168b8f" : "#b94165";
  const idle = Math.sin(time / 260) * 0.7;
  ctx.save();
  ctx.translate(Math.round(x), 110);
  ctx.scale(facing, 1);
  rect(ctx, "#294c52", -17, 0, 35, 3);
  ctx.translate(hurt ? -3 : 0, Math.round(idle));
  // Pixel silhouettes use a small fixed skeleton for anticipation, strikes, kicks and recoil.
  const arm = pose === "strike" ? 13 : pose === "burst" ? 11 : 0;
  rect(ctx, C.ink, -10, -22, 9, 21);
  rect(ctx, shadow, -8, -19, 5, 15);
  rect(ctx, "#152d3d", -12, -4, 12, 4);
  if (pose !== "kick") {
    rect(ctx, C.ink, 2, -23, 9, 21);
    rect(ctx, shadow, 4, -19, 5, 16);
    rect(ctx, "#152d3d", 3, -3, 13, 4);
  }
  if (pose === "kick") {
    rect(ctx, C.ink, 4, -22, 24, 8);
    rect(ctx, main, 8, -21, 17, 5);
    rect(ctx, "#152d3d", 25, -24, 6, 10);
  }
  rect(ctx, C.ink, -12, -38, 24, 21);
  rect(ctx, main, -10, -36, 20, 17);
  rect(ctx, shadow, -9, -35, 5, 15);
  rect(ctx, "#f4e1ae", -10, -21, 22, 3);
  if (!won) {
    rect(ctx, "#f2d5bc", -11, -35, 6, 8);
    rect(ctx, shadow, -15, -33, 6, 12);
  }
  rect(ctx, C.ink, 7, -35, 10 + arm, 7);
  rect(ctx, main, 7, -34, 9 + arm, 5);
  rect(ctx, "#f2d5bc", 15 + arm, -35, 6, 6);
  rect(ctx, shadow, 14 + arm, -35, 3, 7);
  rect(ctx, C.ink, -8, -53, 16, 17);
  rect(ctx, "#f2d5bc", -6, -50, 12, 12);
  rect(ctx, "#dba68b", -6, -40, 12, 3);
  rect(ctx, "#122c38", -8, -53, 16, 6);
  rect(ctx, "#122c38", -9, -49, 4, 9);
  rect(ctx, main, -8, -47, 17, 3);
  rect(ctx, "#122c38", 3, -43, 2, 2);
  rect(ctx, "#fff4d7", 5, -42, 2, 2);
  rect(ctx, main, -14 - Math.sin(time / 200) * 2, -46, 8, 3);
  if (won) {
    rect(ctx, main, -19, -51, 5, 17);
    rect(ctx, "#f2d5bc", -20, -55, 7, 5);
  }
  if (hurt) {
    ctx.globalAlpha = 0.45;
    rect(ctx, "#fff8de", -11, -52, 23, 34);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function renderArena(
  ctx,
  time = 0,
  event = null,
  elapsed = 9999,
  winner = null,
  compact = false,
) {
  ctx.save();
  ctx.scale(3, 3);
  ctx.imageSmoothingEnabled = false;
  if (compact) ctx.translate(0, -30);
  background(ctx);
  const active = event && elapsed < 950;
  const progress = active ? Math.min(1, elapsed / 950) : 0;
  const lunge =
    active && event.kind !== "burst" ? Math.sin(progress * Math.PI) * 103 : 0;
  const hit = active && progress > 0.38 && progress < 0.75;
  const left = active && event.team === 0,
    right = active && event.team === 1;
  fighter(
    ctx,
    76 + (left ? lunge : 0),
    1,
    0,
    left ? event.kind : "idle",
    time,
    hit && right,
    winner === 0,
  );
  fighter(
    ctx,
    244 - (right ? lunge : 0),
    -1,
    1,
    right ? event.kind : "idle",
    time + 120,
    hit && left,
    winner === 1,
  );
  if (active) {
    const direction = event.team === 0 ? 1 : -1;
    const target = event.team === 0 ? 235 : 85;
    if (event.kind === "burst") {
      const x = event.team === 0 ? 100 + progress * 140 : 220 - progress * 140;
      rect(ctx, event.team === 0 ? C.cyan : C.coral, x - 8, 74, 15, 10);
      rect(ctx, "#f8f4cc", x - 4, 76, 8, 6);
      rect(ctx, "#e1f4db", x - 14 * direction, 78, 8, 3);
    }
    if (hit)
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6,
          radius = 8 + progress * 24;
        rect(
          ctx,
          i % 2 ? "#fff6c8" : event.team === 0 ? C.cyan : C.coral,
          target + Math.cos(a) * radius,
          80 + Math.sin(a) * radius,
          3,
          3,
        );
      }
  }
  ctx.restore();
}

export default function PixelArena({
  event,
  events,
  round = 0,
  winner = null,
  motion = true,
  className = "",
  responsive = false,
}) {
  const ref = useRef(null),
    latest = useRef({ event, winner }),
    eventStart = useRef(-9999),
    queue = useRef([]),
    active = useRef(null),
    seen = useRef(null),
    lastRound = useRef(round);
  useEffect(() => {
    const incoming = events || (event ? [event] : []);
    if (seen.current !== null) {
      if (lastRound.current !== round) {
        queue.current = [];
        active.current = null;
      }
      queue.current.push(
        ...incoming.filter(
          (e) =>
            e.id > seen.current &&
            e.round === round &&
            Date.now() - e.at < 20000,
        ),
      );
      queue.current = queue.current.slice(-40);
    } else {
      queue.current = [];
      active.current = null;
    }
    seen.current = incoming.at(-1)?.id ?? -1;
    lastRound.current = round;
    latest.current = { winner };
  }, [event, events, winner, round]);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas.getContext("2d", { alpha: false });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 768px)");
    let frame,
      last = -100,
      visible = true;
    function draw(now) {
      if (document.hidden || !visible) return;
      if (now - last >= 32) {
        if (!motion || media.matches) {
          queue.current = [];
          active.current = null;
        }
        if (active.current && now - eventStart.current >= 360)
          active.current = null;
        if (!active.current && queue.current.length) {
          active.current = queue.current.shift();
          eventStart.current = now;
        }
        renderArena(
          ctx,
          now,
          active.current,
          ((now - eventStart.current) * 950) / 360,
          latest.current.winner,
          responsive && wide.matches,
        );
        last = now;
      }
      if (motion && !media.matches) frame = requestAnimationFrame(draw);
    }
    function wake() {
      cancelAnimationFrame(frame);
      canvas.height = responsive && wide.matches ? 324 : 444;
      last = -100;
      draw(performance.now());
    }
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      wake();
    });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", wake);
    media.addEventListener("change", wake);
    wide.addEventListener("change", wake);
    wake();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", wake);
      media.removeEventListener("change", wake);
      wide.removeEventListener("change", wake);
    };
  }, [motion, event?.id, winner, responsive]);
  return (
    <canvas
      ref={ref}
      width="960"
      height="444"
      className={`pixel-arena ${className}`}
      role="img"
      aria-label="Білім Arena — Ayan & Aru"
    />
  );
}
