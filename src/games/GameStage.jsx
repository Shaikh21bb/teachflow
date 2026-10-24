import { useEffect, useRef } from "react";
import {
  Blocks,
  BookOpen,
  Check,
  CircuitBoard,
  Fish,
  Flag,
  Flower2,
  Rocket,
  Satellite,
  Shell,
  Sparkles,
  Sprout,
  Waves,
  Zap,
} from "lucide-react";
import PixelArena from "./PixelArena";

const clampProgress = (value) =>
  Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 0));

export const formatGameProgress = (value) => {
  const progress = clampProgress(value);
  return progress > 0 && progress < 1
    ? progress.toFixed(1)
    : String(Math.round(progress));
};

function StageEvent({ name, event, motion, round }) {
  // A snapshot may already contain the last action after reload/reconnect.
  // Only events arriving after this stage mounted should replay their badge.
  const suppressed = useRef(
    new Set(event?.id === undefined ? [] : [event.id]),
  );
  useEffect(() => {
    if (!motion && event?.id !== undefined) {
      suppressed.current.add(event.id);
      if (suppressed.current.size > 40) {
        suppressed.current = new Set([...suppressed.current].slice(-20));
      }
    }
  }, [event?.id, motion]);
  if (
    !event ||
    !motion ||
    event.round !== round ||
    suppressed.current.has(event.id)
  )
    return null;
  return (
    <div
      className={`game-stage-event ${name}-event team-${event.team}`}
      key={event.id}
    >
      +{formatGameProgress(event.damage)}%
    </div>
  );
}

function GardenStage({
  progress = [0, 0],
  event,
  motion = true,
  compact = false,
  round = 0,
}) {
  return (
    <div
      className={`garden-stage ${motion ? "is-moving" : ""} ${compact ? "is-compact" : ""}`}
      data-testid="garden-stage"
    >
      <div className="garden-sky-orb" />
      <div className="garden-cloud cloud-one" />
      <div className="garden-cloud cloud-two" />
      {[0, 1].map((team) => {
        const growth = clampProgress(progress[team]);
        return (
          <div
            className={`garden-plot team-${team}`}
            style={{
              "--growth": growth,
              "--plant-scale": 0.35 + growth / 155,
              "--stem-height": `${26 + growth * 0.58}px`,
            }}
            key={team}
          >
            <div className="garden-growth-label">
              {formatGameProgress(growth)}%
            </div>
            <div className="garden-plant">
              <Flower2 className="garden-flower" aria-hidden="true" />
              <i className="garden-leaf leaf-left" />
              <i className="garden-leaf leaf-right" />
              <i className="garden-stem" />
            </div>
            <div className="garden-soil">
              <Sprout aria-hidden="true" />
            </div>
          </div>
        );
      })}
      <StageEvent name="garden" event={event} motion={motion} round={round} />
    </div>
  );
}

function WordStage({
  progress = [0, 0],
  event,
  motion = true,
  compact = false,
  round = 0,
}) {
  return (
    <div
      className={`word-stage ${motion ? "is-moving" : ""} ${compact ? "is-compact" : ""}`}
      data-testid="word-stage"
    >
      <div className="word-stage-title">
        <BookOpen aria-hidden="true" />
        <span>A · Ә · Б · C</span>
      </div>
      {[0, 1].map((team) => {
        const distance = clampProgress(progress[team]);
        return (
          <div className={`word-lane team-${team}`} key={team}>
            <span className="word-start">{team ? "Ә" : "A"}</span>
            <div className="word-track">
              <span
                className="word-runner"
                style={{ left: `calc(${distance}% - ${distance * 0.32}px)` }}
              >
                <Check aria-hidden="true" />
              </span>
            </div>
            <Flag className="word-finish" aria-hidden="true" />
            <strong>{formatGameProgress(distance)}%</strong>
          </div>
        );
      })}
      <StageEvent name="word" event={event} motion={motion} round={round} />
    </div>
  );
}

function OrbitStage({
  progress = [0, 0],
  event,
  motion = true,
  compact = false,
  round = 0,
}) {
  return (
    <div
      className={`orbit-stage ${motion ? "is-moving" : ""} ${compact ? "is-compact" : ""}`}
      data-testid="orbit-stage"
    >
      <div className="orbit-stars" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
      </div>
      <div className="orbit-planet" aria-hidden="true" />
      <div className="orbit-station" aria-hidden="true">
        <span />
        <Satellite />
      </div>
      {[0, 1].map((team) => {
        const distance = clampProgress(progress[team]);
        return (
          <div className={`orbit-lane team-${team}`} key={team}>
            <div className="orbit-route" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div
              className="orbit-craft"
              style={{ bottom: `${8 + distance * 0.66}%` }}
            >
              <Rocket aria-hidden="true" />
              <span className="orbit-thrust" aria-hidden="true" />
            </div>
            <strong>{formatGameProgress(distance)}%</strong>
          </div>
        );
      })}
      <StageEvent name="orbit" event={event} motion={motion} round={round} />
    </div>
  );
}

function TowerStage({
  progress = [0, 0],
  event,
  motion = true,
  compact = false,
  round = 0,
}) {
  return (
    <div
      className={`tower-stage ${motion ? "is-moving" : ""} ${compact ? "is-compact" : ""}`}
      data-testid="tower-stage"
    >
      <div className="tower-sun" aria-hidden="true" />
      <div className="tower-skyline" aria-hidden="true" />
      <div className="tower-crane" aria-hidden="true"><i /><span /></div>
      {[0, 1].map((team) => {
        const height = clampProgress(progress[team]);
        return (
          <div className={`tower-site team-${team}`} key={team}>
            <strong>{formatGameProgress(height)}%</strong>
            <div
              className="tower-building"
              style={{ height: `${18 + height * 0.65}%` }}
            >
              <div className="tower-crown">
                {height >= 100 ? <Flag aria-hidden="true" /> : <Blocks aria-hidden="true" />}
              </div>
              <span className="tower-windows" aria-hidden="true" />
            </div>
            <span className="tower-foundation" aria-hidden="true" />
          </div>
        );
      })}
      <StageEvent name="tower" event={event} motion={motion} round={round} />
    </div>
  );
}

function CircuitStage({
  progress = [0, 0],
  event,
  motion = true,
  compact = false,
  round = 0,
}) {
  return (
    <div
      className={`circuit-stage ${motion ? "is-moving" : ""} ${compact ? "is-compact" : ""}`}
      data-testid="circuit-stage"
    >
      <div className="circuit-grid" aria-hidden="true" />
      <div className="circuit-center" aria-hidden="true">
        <CircuitBoard />
        <span />
      </div>
      {[0, 1].map((team) => {
        const charge = clampProgress(progress[team]);
        return (
          <div
            className={`circuit-system team-${team}`}
            style={{ "--charge-angle": `${charge * 3.6}deg` }}
            key={team}
          >
            <div className="circuit-line" aria-hidden="true">
              <i /><i /><i />
            </div>
            <div className="circuit-core">
              <Zap aria-hidden="true" />
              <span>{formatGameProgress(charge)}%</span>
            </div>
            <div className="circuit-signal" aria-hidden="true" />
          </div>
        );
      })}
      <StageEvent name="circuit" event={event} motion={motion} round={round} />
    </div>
  );
}

function OceanStage({
  progress = [0, 0],
  event,
  motion = true,
  compact = false,
  round = 0,
}) {
  return (
    <div
      className={`ocean-stage ${motion ? "is-moving" : ""} ${compact ? "is-compact" : ""}`}
      data-testid="ocean-stage"
    >
      <div className="ocean-surface" aria-hidden="true"><Waves /></div>
      <div className="ocean-rays" aria-hidden="true" />
      <div className="ocean-bubbles" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
      </div>
      {[0, 1].map((team) => {
        const restored = clampProgress(progress[team]);
        return (
          <div
            className={`ocean-reef team-${team}`}
            style={{
              "--reef-scale": 0.52 + restored / 210,
              "--reef-color": `${42 + restored * 0.9}%`,
              "--reef-opacity": 0.45 + restored / 220,
            }}
            key={team}
          >
            <div className="ocean-score">
              <Shell aria-hidden="true" />
              <strong>{formatGameProgress(restored)}%</strong>
            </div>
            <Fish className="ocean-fish" aria-hidden="true" />
            <div className="ocean-coral" aria-hidden="true">
              <i /><i /><i /><Sparkles />
            </div>
          </div>
        );
      })}
      <StageEvent name="ocean" event={event} motion={motion} round={round} />
    </div>
  );
}

export function GameCover({ mode }) {
  if (mode === "garden")
    return <GardenStage compact motion={false} progress={[46, 68]} />;
  if (mode === "word")
    return <WordStage compact motion={false} progress={[38, 72]} />;
  if (mode === "orbit")
    return <OrbitStage compact motion={false} progress={[52, 78]} />;
  if (mode === "tower")
    return <TowerStage compact motion={false} progress={[43, 70]} />;
  if (mode === "circuit")
    return <CircuitStage compact motion={false} progress={[48, 76]} />;
  if (mode === "ocean")
    return <OceanStage compact motion={false} progress={[58, 82]} />;
  return <PixelArena motion={false} />;
}

export default function GameStage({ mode, progress, ...props }) {
  if (mode === "garden") return <GardenStage progress={progress} {...props} />;
  if (mode === "word") return <WordStage progress={progress} {...props} />;
  if (mode === "orbit") return <OrbitStage progress={progress} {...props} />;
  if (mode === "tower") return <TowerStage progress={progress} {...props} />;
  if (mode === "circuit") return <CircuitStage progress={progress} {...props} />;
  if (mode === "ocean") return <OceanStage progress={progress} {...props} />;
  return <PixelArena {...props} />;
}
