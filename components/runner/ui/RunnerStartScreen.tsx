import React from "react";

interface RunnerStartScreenProps {
  vocabularyCount?: number;
}

export const RunnerStartScreen: React.FC<RunnerStartScreenProps> = ({ vocabularyCount }) => {
  return (
    <section id="runner-start-screen" className="runner-start-hud" aria-labelledby="runner-game-title">
      {/* Top minimal arcade title pill */}
      <div className="runner-start-header">
        <div className="runner-brand-pill">
          <span className="runner-brand-symbol">↗</span>
          <span id="runner-game-title" className="runner-start-title">
            VOCAB RUNNER
          </span>
          {vocabularyCount ? (
            <span className="runner-start-count-badge">{vocabularyCount} WORDS</span>
          ) : null}
        </div>
      </div>

      {/* Center / lower action area with prominent pulse button */}
      <div className="runner-start-action-container">
        <button
          id="runner-start-button"
          className="runner-start-prompt-btn"
          aria-label="Start Game"
          disabled
        >
          <span className="runner-start-prompt-text">PRESS TO START</span>
          <span className="runner-start-prompt-arrow">→</span>
        </button>

        <div className="runner-start-hints">
          <div className="runner-start-hint-desktop">
            <span className="runner-key-group">
              <kbd>A</kbd> <kbd>D</kbd> or <kbd>←</kbd> <kbd>→</kbd>
            </span>
            <span className="runner-hint-sep">·</span>
            <span>Switch lanes</span>
            <span className="runner-hint-sep">·</span>
            <span className="runner-key-group">
              <kbd>SPACE</kbd> / <kbd>ENTER</kbd>
            </span>
            <span>to start</span>
          </div>
          <div className="runner-start-hint-mobile">
            <span>Swipe left / right or tap arrows to steer</span>
          </div>
        </div>

        <p id="runner-load-error" role="alert" hidden></p>
      </div>
    </section>
  );
};
