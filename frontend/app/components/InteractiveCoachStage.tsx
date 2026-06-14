"use client";

import { MouseEvent, useMemo, useState } from "react";
import type { CSSProperties } from "react";

const scenes = [
  {
    id: "calibrate",
    label: "Calibrate",
    title: "Meet your speaking coach",
    cue: "Move your cursor across the panel and choose a mode to preview how Vaani guides practice.",
    signal: "Ready to listen to your first recording",
    words: ["clarity", "pace", "tone", "focus", "confidence"],
  },
  {
    id: "practice",
    label: "Practice",
    title: "Practice mode",
    cue: "Use prompts for interviews, presentations, daily English, and client conversations.",
    signal: "Preparing a short speaking prompt",
    words: ["answer", "pause", "example", "structure", "fluency"],
  },
  {
    id: "feedback",
    label: "Feedback",
    title: "Feedback mode",
    cue: "After recording, Vaani explains what sounded strong and what to practice next.",
    signal: "Reviewing clarity, confidence, pacing, and fluency",
    words: ["score", "feedback", "drill", "improve", "repeat"],
  },
];

export default function InteractiveCoachStage() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [pointer, setPointer] = useState({ x: 50, y: 42 });
  const scene = scenes[sceneIndex];

  const rings = useMemo(() => Array.from({ length: 5 }), []);
  const particles = useMemo(() => Array.from({ length: 18 }), []);
  const bars = useMemo(() => Array.from({ length: 36 }), []);
  const wordStream = useMemo(() => Array.from({ length: 15 }), []);

  function handleMove(event: MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  }

  return (
    <div
      className="stage-shell group"
      onMouseMove={handleMove}
      style={
        {
          "--pointer-x": `${pointer.x}%`,
          "--pointer-y": `${pointer.y}%`,
        } as CSSProperties
      }
    >
      <div className="stage-scan" />
      <div className="stage-depth" />
      <div className="stage-horizon" />

      <div className="stage-orbit" aria-hidden="true">
        {rings.map((_, index) => (
          <span
            className="stage-ring"
            key={index}
            style={{ "--ring": index } as CSSProperties}
          />
        ))}
      </div>

      <div className="stage-core" aria-hidden="true">
        <div className="audio-visual-wrap">
          <div className="audio-orb">
            {Array.from({ length: 48 }).map((_, i) => (
              <span
                className="audio-bar"
                key={i}
                style={
                  {
                    "--i": i,
                    "--delay": `${i * -0.05}s`,
                    "--h": `${30 + Math.random() * 50}%`,
                  } as CSSProperties
                }
              />
            ))}
            <div className="audio-center">
              <div className="audio-pulse" />
              <div className="audio-pulse" style={{ animationDelay: "0.5s" } as CSSProperties} />
              <div className="audio-pulse" style={{ animationDelay: "1s" } as CSSProperties} />
            </div>
          </div>
        </div>
      </div>

      <div className="stage-words" aria-hidden="true">
        {wordStream.map((_, index) => (
          <span
            key={`${scene.id}-${index}`}
            style={
              {
                "--word": index,
                "--word-delay": `${index * -0.72}s`,
              } as CSSProperties
            }
          >
            {scene.words[index % scene.words.length]}
          </span>
        ))}
      </div>

      <div className="stage-particles" aria-hidden="true">
        {particles.map((_, index) => (
          <span
            className="stage-particle"
            key={index}
            style={
              {
                "--particle": index,
                "--delay": `${index * -0.34}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="stage-panel stage-panel-top">
        <p>{scene.title}</p>
        <span>{scene.signal}</span>
      </div>

      <div className="stage-panel stage-panel-bottom">
        <p>{scene.cue}</p>
        <div className="stage-wave" aria-hidden="true">
          {bars.map((_, index) => (
            <span
              key={index}
              style={
                {
                  "--bar": index,
                  "--bar-height": `${24 + ((index * 13 + sceneIndex * 11) % 66)}%`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>

      <div className="stage-controls" aria-label="Interactive visual modes">
        {scenes.map((item, index) => (
          <button
            className={index === sceneIndex ? "is-active" : ""}
            key={item.id}
            onMouseEnter={() => setSceneIndex(index)}
            onClick={() => setSceneIndex(index)}
            onPointerDown={() => setSceneIndex(index)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}