import React from "react";
import { RunnerControls } from "./RunnerControls";

export const RunnerHUD: React.FC = () => {
  return (
    <div id="runner-hud" className="runner-hud" hidden>
      <div className="runner-topbar">
        <section id="runner-score-stat" className="runner-stat">
          <div className="runner-stat-label">Score</div>
          <div id="runner-score-value" className="runner-stat-value">
            0000
          </div>
          <div className="runner-distance">
            <span id="runner-distance-value">0</span> m traveled
          </div>
        </section>

        <section id="runner-question-panel">
          <div className="runner-question-heading">
            <span>Find the word</span>
            <span id="runner-question-number">GATE 01</span>
          </div>
          <h2 id="runner-meaning">Choose the word that matches the definition.</h2>
          <div className="runner-timer-row">
            <div
              className="runner-timer-track"
              role="progressbar"
              aria-label="Time remaining"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={5}
            >
              <div id="runner-timer-fill"></div>
            </div>
            <div id="runner-timer-value">5.0s</div>
          </div>
        </section>

        <section id="runner-streak-stat" className="runner-stat">
          <div className="runner-stat-label">Streak</div>
          <div id="runner-streak-value" className="runner-stat-value">
            ×0
          </div>
          <div className="runner-distance">
            Best <span id="runner-best-value">0</span>
          </div>
        </section>
      </div>

      <div id="runner-toast">
        <div id="runner-toast-title">✓ CORRECT!</div>
        <div id="runner-toast-score">+100</div>
      </div>

      <div id="runner-levelup-toast" aria-hidden="true">
        <div id="runner-levelup-title">⚡ SPEED UP!</div>
        <div id="runner-levelup-subtitle">−0.5s</div>
      </div>

      <RunnerControls />
    </div>
  );
};
