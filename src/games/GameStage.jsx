import { BookOpen, Check, Flag, Flower2, Sprout } from "lucide-react";
import PixelArena from "./PixelArena";

function GardenStage({ progress = [0, 0], event, motion = true, compact = false }) {
  return (
    <div
      className={`garden-stage ${motion ? "is-moving" : ""} ${compact ? "is-compact" : ""}`}
      data-testid="garden-stage"
    >
      <div className="garden-sky-orb" />
      <div className="garden-cloud cloud-one" />
      <div className="garden-cloud cloud-two" />
      {[0, 1].map((team) => {
        const growth = Math.max(0, Math.min(100, progress[team] || 0));
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
            <div className="garden-growth-label">{Math.round(growth)}%</div>
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
      {event && motion && (
        <div className={`garden-event team-${event.team}`} key={event.id}>
          +{event.damage}%
        </div>
      )}
    </div>
  );
}

function WordStage({ progress = [0, 0], event, motion = true, compact = false }) {
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
        const distance = Math.max(0, Math.min(100, progress[team] || 0));
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
            <strong>{Math.round(distance)}%</strong>
          </div>
        );
      })}
      {event && motion && (
        <div className={`word-event team-${event.team}`} key={event.id}>
          +{event.damage}%
        </div>
      )}
    </div>
  );
}

export function GameCover({ mode }) {
  if (mode === "garden")
    return <GardenStage compact motion={false} progress={[46, 68]} />;
  if (mode === "word")
    return <WordStage compact motion={false} progress={[38, 72]} />;
  return <PixelArena motion={false} />;
}

export default function GameStage({ mode, progress, ...props }) {
  if (mode === "garden") return <GardenStage progress={progress} {...props} />;
  if (mode === "word") return <WordStage progress={progress} {...props} />;
  return <PixelArena {...props} />;
}
