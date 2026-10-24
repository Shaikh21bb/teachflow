import { useEffect, useRef } from "react";

const C = {
  night: "#071019",
  sky: "#0c1a28",
  horizon: "#18324a",
  stone: "#192633",
  stoneLight: "#2a3b49",
  ink: "#071017",
  pale: "#d9e4df",
  cyan: "#33f0d2",
  cyanDark: "#087d83",
  ember: "#ff6b52",
  emberDark: "#a72c3c",
  gold: "#f0c96a",
};

function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function polygon(ctx, color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], index) =>
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
  );
  ctx.closePath();
  ctx.fill();
}

function line(ctx, color, width, points) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(([x, y], index) =>
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
  );
  ctx.stroke();
}

function background(ctx, time) {
  rect(ctx, C.night, 0, 0, 320, 148);
  rect(ctx, C.sky, 0, 0, 320, 93);

  // A restrained star field gives the forge depth without loading external art.
  for (let i = 0; i < 34; i += 1) {
    const x = (i * 47 + 13) % 320;
    const y = 7 + ((i * 29) % 55);
    const pulse = 0.35 + Math.sin(time / 620 + i) * 0.18;
    ctx.globalAlpha = pulse;
    rect(ctx, i % 5 ? "#9fc3ce" : C.gold, x, y, i % 7 ? 1 : 2, 1);
  }
  ctx.globalAlpha = 1;

  // Geometric steppe ridges and an original knowledge citadel.
  polygon(ctx, "#12283a", [
    [0, 76],
    [38, 49],
    [71, 69],
    [105, 42],
    [148, 76],
    [196, 45],
    [241, 69],
    [282, 47],
    [320, 68],
    [320, 101],
    [0, 101],
  ]);
  polygon(ctx, C.horizon, [
    [0, 82],
    [45, 65],
    [91, 83],
    [126, 60],
    [162, 80],
    [207, 64],
    [259, 84],
    [300, 62],
    [320, 72],
    [320, 105],
    [0, 105],
  ]);
  rect(ctx, "#101f2c", 119, 54, 82, 49);
  rect(ctx, "#203647", 126, 47, 68, 57);
  polygon(ctx, "#2b4250", [
    [121, 48],
    [135, 37],
    [185, 37],
    [199, 48],
  ]);
  rect(ctx, "#0b1823", 151, 61, 18, 43);
  rect(ctx, C.gold, 158, 66, 4, 20);
  rect(ctx, "#5f5135", 154, 89, 12, 2);
  for (const x of [130, 185]) {
    rect(ctx, "#0a1620", x, 56, 3, 37);
    rect(ctx, C.gold, x - 2, 53, 7, 2);
  }

  // Team pylons ground the two sides of the arena.
  [
    [31, C.cyan, C.cyanDark],
    [289, C.ember, C.emberDark],
  ].forEach(([x, glow, shadow]) => {
    rect(ctx, "#0b151e", x - 7, 65, 14, 45);
    polygon(ctx, shadow, [
      [x - 10, 71],
      [x, 58],
      [x + 10, 71],
      [x + 6, 102],
      [x - 6, 102],
    ]);
    rect(ctx, glow, x - 2, 68, 4, 24);
    ctx.globalAlpha = 0.2;
    rect(ctx, glow, x - 5, 66, 10, 29);
    ctx.globalAlpha = 1;
  });

  rect(ctx, C.stone, 0, 103, 320, 45);
  rect(ctx, C.gold, 0, 103, 320, 1);
  rect(ctx, C.stoneLight, 0, 106, 320, 3);
  for (let row = 0; row < 4; row += 1) {
    for (let x = -20; x < 340; x += 34) {
      const offset = row % 2 ? 17 : 0;
      rect(
        ctx,
        row % 2 ? "#1e2e3a" : "#233542",
        x + offset,
        112 + row * 9,
        32,
        7,
      );
      rect(ctx, "#304553", x + offset, 112 + row * 9, 32, 1);
    }
  }
  polygon(ctx, "#0d1720", [
    [126, 148],
    [151, 107],
    [169, 107],
    [194, 148],
  ]);
  line(ctx, "#41525c", 1, [
    [151, 108],
    [160, 123],
    [169, 108],
  ]);
}

function champion(ctx, x, facing, team, pose, time, hurt, won) {
  const main = team === 0 ? C.cyan : C.ember;
  const shadow = team === 0 ? C.cyanDark : C.emberDark;
  const idle = Math.sin(time / 260 + team) * 0.8;
  const strike = pose === "strike";
  const kick = pose === "kick";
  const burst = pose === "burst";

  ctx.save();
  ctx.translate(Math.round(x), 113 + Math.round(idle));
  ctx.scale(facing, 1);
  if (hurt) ctx.translate(-4, 1);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = main;
  ctx.beginPath();
  ctx.ellipse(0, 0, won ? 24 : 19, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  rect(ctx, C.ink, -17, -1, 34, 3);

  // Boots and articulated legs.
  rect(ctx, C.ink, -11, -24, 9, 22);
  rect(ctx, shadow, -9, -21, 5, 17);
  rect(ctx, C.ink, -14, -5, 13, 5);
  if (kick) {
    rect(ctx, C.ink, 2, -27, 29, 9);
    rect(ctx, main, 6, -25, 21, 5);
    polygon(ctx, C.pale, [
      [28, -28],
      [35, -25],
      [34, -17],
      [27, -18],
    ]);
  } else {
    rect(ctx, C.ink, 3, -24, 9, 22);
    rect(ctx, shadow, 5, -21, 5, 17);
    rect(ctx, C.ink, 3, -5, 14, 5);
  }

  // Asymmetric scholar armour keeps both champions readable at small sizes.
  polygon(ctx, C.ink, [
    [-14, -45],
    [-8, -52],
    [10, -50],
    [15, -42],
    [12, -22],
    [-12, -22],
  ]);
  polygon(ctx, main, [
    [-10, -45],
    [-5, -48],
    [8, -47],
    [11, -41],
    [8, -27],
    [-8, -27],
  ]);
  rect(ctx, shadow, -8, -43, 6, 15);
  rect(ctx, C.gold, -9, -27, 19, 3);
  rect(ctx, "#e9f6ec", -2, -42, 7, 7);
  rect(ctx, main, 0, -40, 3, 3);

  const armReach = strike ? 18 : burst ? 13 : 2;
  rect(ctx, C.ink, 8, -44, 12 + armReach, 8);
  rect(ctx, main, 10, -42, 9 + armReach, 4);
  rect(ctx, C.pale, 19 + armReach, -43, 6, 6);
  rect(ctx, C.ink, -17, -43, 8, won ? 25 : 14);
  rect(ctx, shadow, -15, -41, 4, won ? 21 : 10);
  if (won) {
    rect(ctx, C.pale, -18, -23, 6, 6);
    ctx.globalAlpha = 0.35;
    rect(ctx, main, -21, -51, 10, 32);
    ctx.globalAlpha = 1;
  }

  // Open-faced crystal helm: no borrowed mask or character silhouette.
  polygon(ctx, C.ink, [
    [-9, -62],
    [-4, -68],
    [6, -66],
    [10, -59],
    [7, -48],
    [-8, -48],
  ]);
  rect(ctx, "#d8b293", -6, -61, 12, 10);
  rect(ctx, main, -9, -64, 18, 4);
  polygon(ctx, main, [
    [-3, -67],
    [1, -74],
    [5, -66],
  ]);
  rect(ctx, C.ink, 2, -58, 3, 2);
  rect(ctx, "#f8fbde", 4, -58, 2, 2);

  if (burst) {
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = main;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(4, -40, 20 + Math.sin(time / 90) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (hurt) {
    ctx.globalAlpha = 0.42;
    rect(ctx, "#fff5cf", -13, -67, 31, 45);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function impact(ctx, event, progress, hit) {
  if (!event) return;
  const teamColor = event.team === 0 ? C.cyan : C.ember;
  const direction = event.team === 0 ? 1 : -1;
  const target = event.team === 0 ? 237 : 83;

  if (event.kind === "burst") {
    const x = event.team === 0 ? 101 + progress * 142 : 219 - progress * 142;
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.arc(x, 73, 12 + progress * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    polygon(ctx, teamColor, [
      [x - 9 * direction, 68],
      [x + 8 * direction, 73],
      [x - 9 * direction, 79],
    ]);
    rect(ctx, "#f7f1ca", x - 3, 70, 6, 6);
  }

  if (!hit) return;
  const radius = 8 + Math.sin(progress * Math.PI) * 16;
  for (let i = 0; i < 16; i += 1) {
    const angle = (i * Math.PI) / 8 + (event.kind === "kick" ? 0.2 : 0);
    const distance = radius + (i % 3) * 3;
    rect(
      ctx,
      i % 3 ? teamColor : i % 2 ? C.gold : "#f7f5da",
      target + Math.cos(angle) * distance,
      76 + Math.sin(angle) * distance,
      i % 4 ? 2 : 4,
      i % 4 ? 2 : 1,
    );
  }
  if (event.kind === "kick") {
    line(ctx, C.gold, 2, [
      [target - 17 * direction, 61],
      [target + 11 * direction, 87],
    ]);
  }

  const damage = Number(event.damage) || 0;
  if (damage) {
    ctx.save();
    ctx.fillStyle = "#fff1b8";
    ctx.font = "800 8px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`-${damage}`, target, 49 - Math.sin(progress * Math.PI) * 6);
    ctx.restore();
  }
}

export function renderArena(
  ctx,
  time = 0,
  event = null,
  elapsed = 9999,
  winner = null,
  compact = false,
  finished = false,
) {
  ctx.save();
  ctx.scale(3, 3);
  ctx.imageSmoothingEnabled = false;
  if (compact) ctx.translate(0, -30);

  const active = event && elapsed < 950;
  const progress = active ? Math.min(1, elapsed / 950) : 0;
  const hit = active && progress > 0.4 && progress < 0.72;
  if (hit) {
    const shake = Math.sin(progress * 90) * 1.5;
    ctx.translate(shake, -Math.abs(shake) * 0.35);
  }
  background(ctx, time);

  const lunge = active
    ? Math.sin(progress * Math.PI) * (event.kind === "burst" ? 12 : 90)
    : 0;
  const left = active && event.team === 0;
  const right = active && event.team === 1;
  champion(
    ctx,
    76 + (left ? lunge : 0),
    1,
    0,
    left ? event.kind : "idle",
    time,
    hit && right,
    finished && winner === 0,
  );
  champion(
    ctx,
    244 - (right ? lunge : 0),
    -1,
    1,
    right ? event.kind : "idle",
    time + 120,
    hit && left,
    finished && winner === 1,
  );
  if (active) impact(ctx, event, progress, hit);

  if (finished && winner === null) {
    ctx.globalAlpha = 0.7;
    rect(ctx, "#061018", 124, 66, 72, 24);
    ctx.globalAlpha = 1;
    line(ctx, C.gold, 1, [
      [132, 82],
      [160, 70],
      [188, 82],
    ]);
  }
  ctx.restore();
}

export default function PixelArena({
  event,
  events,
  round = 0,
  winner = null,
  finished = false,
  motion = true,
  className = "",
  responsive = false,
  ariaLabel = "Knowledge Forge arena",
}) {
  const ref = useRef(null);
  const latest = useRef({ winner, finished });
  const eventStart = useRef(-9999);
  const queue = useRef([]);
  const active = useRef(null);
  const seen = useRef(null);
  const lastRound = useRef(round);

  useEffect(() => {
    const incoming = events || (event ? [event] : []);
    if (seen.current !== null) {
      if (lastRound.current !== round) {
        queue.current = [];
        active.current = null;
      }
      queue.current.push(
        ...incoming.filter(
          (item) =>
            item.id > seen.current &&
            item.round === round &&
            Date.now() - item.at < 20000,
        ),
      );
      // Keep the latest actions visible while preventing a long animation backlog.
      queue.current = queue.current.slice(-8);
    } else {
      queue.current = [];
      active.current = null;
    }
    seen.current = incoming.at(-1)?.id ?? -1;
    lastRound.current = round;
    latest.current = { winner, finished };
  }, [event, events, winner, finished, round]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 768px)");
    let frame;
    let last = -100;
    let visible = true;

    function draw(now) {
      if (document.hidden || !visible) return;
      if (now - last >= 32) {
        if (!motion || media.matches) {
          queue.current = [];
          active.current = null;
        }
        const eventDuration = queue.current.length > 4 ? 180 : 360;
        if (active.current && now - eventStart.current >= eventDuration) {
          active.current = null;
        }
        if (!active.current && queue.current.length) {
          active.current = queue.current.shift();
          eventStart.current = now;
        }
        renderArena(
          ctx,
          now,
          active.current,
          ((now - eventStart.current) * 950) / eventDuration,
          latest.current.winner,
          responsive && wide.matches,
          latest.current.finished,
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
  }, [motion, event?.id, winner, finished, responsive]);

  return (
    <canvas
      ref={ref}
      width="960"
      height="444"
      className={`pixel-arena ${className}`}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
