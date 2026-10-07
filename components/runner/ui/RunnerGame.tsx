"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { GameEngine } from "../engine/GameEngine";
import { HUDReferences, QuestionProvider } from "../types";
import { createQuestionProvider, RawVocabularyInput } from "../adapters/vocabularyAdapter";
import { RunnerHUD } from "./RunnerHUD";
import { RunnerLaneLabels } from "./RunnerLaneLabels";
import { RunnerStartScreen } from "./RunnerStartScreen";
import { RunnerGameOverModal } from "./RunnerGameOverModal";
import "../runner.css";

interface RunnerGameProps {
  initialItems?: RawVocabularyInput[];
}

export const RunnerGame: React.FC<RunnerGameProps> = ({ initialItems }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef<boolean>(false);
  const engineRef = useRef<GameEngine | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [questionProvider, setQuestionProvider] = useState<QuestionProvider | null>(null);
  const [vocabularyCount, setVocabularyCount] = useState<number>(0);

  const loadVocabulary = useCallback(async () => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // 1. If pre-supplied items exist, test them first
      if (initialItems && initialItems.length >= 4) {
        const result = createQuestionProvider(initialItems);
        if (result.success) {
          setQuestionProvider(result.provider);
          setVocabularyCount(result.count);
          setIsLoading(false);
          return;
        }
      }

      // 2. Fetch real vocabulary from the existing API endpoint
      const res = await fetch("/api/vocab");
      if (!res.ok) {
        throw new Error(`Failed to fetch vocabulary (HTTP ${res.status} ${res.statusText})`);
      }

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to load vocabulary data from Google Docs sync");
      }

      const rawItems = Array.isArray(json.data) ? json.data : [];

      // 3. Validate and build question provider
      const result = createQuestionProvider(rawItems);
      if (!result.success) {
        throw new Error(result.error);
      }

      setQuestionProvider(result.provider);
      setVocabularyCount(result.count);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while loading vocabulary.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [initialItems]);

  useEffect(() => {
    loadVocabulary();
  }, [loadVocabulary]);

  // Initialize Three.js GameEngine once questionProvider is ready
  useEffect(() => {
    if (!questionProvider || !containerRef.current || !canvasRef.current) return;

    if (engineRef.current) {
      engineRef.current.updateQuestionProvider(questionProvider);
      return;
    }

    const hudRefs: HUDReferences = {
      container: containerRef.current,
      canvasContainer: canvasRef.current,
      hud: document.getElementById("runner-hud")!,
      laneLabelsContainer: document.getElementById("runner-lane-labels")!,
      laneLabelItems: Array.from(document.querySelectorAll(".runner-lane-label")) as HTMLElement[],
      startScreen: document.getElementById("runner-start-screen")!,
      gameOverScreen: document.getElementById("runner-game-over")!,
      startButton: document.getElementById("runner-start-button") as HTMLButtonElement,
      restartButton: document.getElementById("runner-restart-button") as HTMLButtonElement,
      closeGameOverButton: (document.getElementById("runner-close-game-over-button") as HTMLButtonElement) || undefined,
      questionPanel: document.getElementById("runner-question-panel")!,
      questionNumber: document.getElementById("runner-question-number")!,
      meaning: document.getElementById("runner-meaning")!,
      timerFill: document.getElementById("runner-timer-fill")!,
      timerValue: document.getElementById("runner-timer-value")!,
      progressBar: document.querySelector('.runner-timer-track[role="progressbar"]') as HTMLElement,
      scoreValue: document.getElementById("runner-score-value")!,
      distanceValue: document.getElementById("runner-distance-value")!,
      streakValue: document.getElementById("runner-streak-value")!,
      bestValue: document.getElementById("runner-best-value")!,
      speedValue: document.getElementById("runner-speed-value")!,
      toast: document.getElementById("runner-toast")!,
      flash: document.getElementById("runner-flash")!,
      liveStatus: document.getElementById("runner-live-status")!,
      soundToggle: document.getElementById("runner-sound-toggle") as HTMLButtonElement,
      leftButton: document.getElementById("runner-left-button") as HTMLButtonElement,
      rightButton: document.getElementById("runner-right-button") as HTMLButtonElement,
      crashReason: document.getElementById("runner-crash-reason")!,
      correctRecap: document.getElementById("runner-correct-recap")!,
      chosenRecap: document.getElementById("runner-chosen-recap")!,
      finalScore: document.getElementById("runner-final-score")!,
      finalDistance: document.getElementById("runner-final-distance")!,
      finalStreak: document.getElementById("runner-final-streak")!,
    };

    const engine = new GameEngine({
      container: containerRef.current,
      hud: hudRefs,
      questionProvider,
    });
    engineRef.current = engine;

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [questionProvider]);

  return (
    <div ref={containerRef} className="runner-root">
      {/* Return to Flashcards navigation */}
      <div style={{ position: "fixed", top: "16px", left: "16px", zIndex: 40, pointerEvents: "auto" }}>
        <Link
          href="/"
          prefetch={false}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "9999px",
            backgroundColor: "rgba(15, 35, 46, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            backdropFilter: "blur(6px)",
          }}
        >
          ← Back to Flashcards
        </Link>
      </div>

      {/* LOADING STATE OVERLAY */}
      {isLoading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0d222d",
            color: "#ffffff",
            gap: "16px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              border: "3px solid rgba(141, 240, 200, 0.2)",
              borderTopColor: "#8df0c8",
              borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
            }}
          />
          <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Connecting to Vocabulary Sync…
          </h2>
          <p style={{ fontSize: "14px", color: "#a9c0cc", maxWidth: "340px", margin: 0, lineHeight: 1.5 }}>
            Loading your real vocabulary from Google Docs to prepare the game.
          </p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* ERROR STATE OVERLAY */}
      {!isLoading && error && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0d222d",
            padding: "24px",
          }}
        >
          <div
            style={{
              width: "min(100%, 460px)",
              backgroundColor: "rgba(16, 37, 49, 0.97)",
              border: "1px solid rgba(255, 117, 109, 0.35)",
              borderRadius: "24px",
              padding: "36px",
              boxShadow: "0 25px 85px rgba(5, 24, 33, 0.4)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                margin: "0 auto 16px",
                borderRadius: "16px",
                backgroundColor: "rgba(255, 117, 109, 0.15)",
                display: "grid",
                placeItems: "center",
                color: "#ff756d",
              }}
            >
              <AlertCircle size={26} />
            </div>
            <h3 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 10px", color: "#ffffff" }}>
              Unable to Start Highway
            </h3>
            <p style={{ fontSize: "14px", color: "#c4d8df", lineHeight: 1.55, margin: "0 0 24px" }}>
              {error}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={loadVocabulary}
                className="runner-primary-button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={16} />
                <span>Retry Sync</span>
              </button>
              <Link
                href="/"
                prefetch={false}
                style={{
                  display: "block",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#a9c0cc",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Return to Flashcards
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas Viewport */}
      <main
        ref={canvasRef}
        id="runner-world"
        className="runner-world"
        aria-label="Three-dimensional four-lane driving vocabulary game"
      />

      {/* Vignette Shadow Overlay */}
      <div className="runner-vignette" />

      {/* Red Crash Flash Overlay */}
      <div id="runner-flash" className="runner-flash" />

      {/* Heads Up Display */}
      <RunnerHUD />

      {/* 3D Projected Lane Answer Labels */}
      <RunnerLaneLabels />

      {/* Start Screen Menu Overlay */}
      <RunnerStartScreen vocabularyCount={vocabularyCount} />

      {/* Game Over Crash Screen Overlay */}
      <RunnerGameOverModal />

      {/* Screen Reader Polite Live Region */}
      <div id="runner-live-status" role="status" aria-live="polite" />
    </div>
  );
};

export default RunnerGame;
