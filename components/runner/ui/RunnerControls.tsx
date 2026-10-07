import React from "react";

export const RunnerControls: React.FC = () => {
  return (
    <div className="runner-bottom-hud">
      <div className="runner-route-badge">
        <small>ENDLESS HIGHWAY</small>
        <span id="runner-speed-value">72</span> km/h
      </div>
      <div id="runner-controls">
        <button
          id="runner-left-button"
          className="runner-steer-button"
          aria-label="Move one lane left"
        >
          ←
        </button>
        <div className="runner-control-hint">
          A / D · ← / →<br />
          SWIPE TO STEER
        </div>
        <button
          id="runner-right-button"
          className="runner-steer-button"
          aria-label="Move one lane right"
        >
          →
        </button>
      </div>
      <button
        id="runner-sound-toggle"
        aria-label="Disable sound"
        aria-pressed="true"
      >
        Sound on
      </button>
    </div>
  );
};
