import React from "react";

export const RunnerLaneLabels: React.FC = () => {
  return (
    <div id="runner-lane-labels" hidden>
      {[1, 2, 3, 4].map((lane) => (
        <div key={lane} className="runner-lane-label">
          <div className="runner-answer-card">
            <span className="runner-lane-number">LANE {lane}</span>
            <span className="runner-answer-word"></span>
          </div>
          <div className="runner-label-arrow"></div>
        </div>
      ))}
    </div>
  );
};
