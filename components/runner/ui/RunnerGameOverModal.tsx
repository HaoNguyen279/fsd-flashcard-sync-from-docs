import React from "react";

export const RunnerGameOverModal: React.FC = () => {
  return (
    <section id="runner-game-over" className="runner-overlay" aria-labelledby="runner-game-over-title" hidden>
      <div className="runner-menu-card">
        <button
          id="runner-close-game-over-button"
          className="runner-close-btn"
          type="button"
          aria-label="Close and return to start"
          title="Return to start screen"
        >
          ✕
        </button>
        <div className="runner-brand-line">
          <span className="runner-brand-symbol">!</span>
          <span className="runner-eyebrow">End of the road</span>
        </div>
        <h2 id="runner-game-over-title">CRASH!</h2>
        <p id="runner-crash-reason">You drove into the wrong answer.</p>
        <div className="runner-answer-recap">
          <div>
            <span className="runner-eyebrow">Correct answer</span>
            <strong id="runner-correct-recap"></strong>
          </div>
          <div>
            <span className="runner-eyebrow">Your lane</span>
            <strong id="runner-chosen-recap"></strong>
          </div>
        </div>
        <div className="runner-run-recap">
          <div>
            <span className="runner-eyebrow">Score</span>
            <strong id="runner-final-score">0</strong>
          </div>
          <div>
            <span className="runner-eyebrow">Distance</span>
            <strong id="runner-final-distance">0 m</strong>
          </div>
          <div>
            <span className="runner-eyebrow">Best streak</span>
            <strong id="runner-final-streak">×0</strong>
          </div>
        </div>
        <button id="runner-restart-button" className="runner-primary-button">
          PLAY AGAIN →
        </button>
        <p className="runner-menu-footer">New road. Fresh start. You&apos;ve got this.</p>
      </div>
    </section>
  );
};
