"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Home,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { VocabularyItem } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";

interface QuizQuestion {
  targetItem: VocabularyItem;
  options: string[];
  correctIndex: number;
}

interface QuizViewProps {
  items: VocabularyItem[];
  allItems: VocabularyItem[];
  onBack: () => void;
  onRetry: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  items,
  allItems,
  onBack,
  onRetry,
}) => {
  // Generate question list with randomized distractors once on mount / items change
  const questions = useMemo<QuizQuestion[]>(() => {
    return items.map((target) => {
      // Pick 3 distractors from allItems (excluding target word)
      const otherWords = allItems
        .filter((w) => w.word !== target.word)
        .map((w) => w.word);

      // Shuffle other words and pick up to 3
      const shuffledOthers = [...otherWords].sort(() => Math.random() - 0.5);
      const distractors = Array.from(new Set(shuffledOthers)).slice(0, 3);

      // Combine target and distractors
      const combined = [target.word, ...distractors];
      // Shuffle options
      const shuffledOptions = [...combined].sort(() => Math.random() - 0.5);
      const correctIndex = shuffledOptions.indexOf(target.word);

      return {
        targetItem: target,
        options: shuffledOptions,
        correctIndex,
      };
    });
  }, [items, allItems]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [history, setHistory] = useState<
    {
      question: QuizQuestion;
      selectedOption: number;
      isCorrect: boolean;
    }[]
  >([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  const currentQ = questions[currentIndex];

  const playPronunciation = useCallback((word: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const cleanWord = word.replace(/\s*\([a-z/]+\)\s*/gi, "").trim();
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleSelectOption = useCallback(
    (index: number) => {
      if (isAnswered || !currentQ) return;

      setSelectedOption(index);
      setIsAnswered(true);

      const isCorrect = index === currentQ.correctIndex;
      if (isCorrect) {
        setScore((prev) => prev + 1);
      }

      setHistory((prev) => [
        ...prev,
        {
          question: currentQ,
          selectedOption: index,
          isCorrect,
        },
      ]);

      // Play audio for the correct word
      playPronunciation(currentQ.targetItem.word);
    },
    [isAnswered, currentQ, playPronunciation]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, questions.length]);

  const handleRetry = useCallback(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setHistory([]);
    setIsFinished(false);
    onRetry();
  }, [onRetry]);

  // Keyboard navigation: 1, 2, 3, 4 to choose answer, Space/Enter to go next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent repeated trigger when holding down a key
      if (e.repeat) return;

      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (!isAnswered && !isFinished) {
        if (e.key === "1") {
          e.preventDefault();
          handleSelectOption(0);
        } else if (e.key === "2" && currentQ?.options.length > 1) {
          e.preventDefault();
          handleSelectOption(1);
        } else if (e.key === "3" && currentQ?.options.length > 2) {
          e.preventDefault();
          handleSelectOption(2);
        } else if (e.key === "4" && currentQ?.options.length > 3) {
          e.preventDefault();
          handleSelectOption(3);
        }
      } else if (isAnswered && !isFinished) {
        if (e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnswered, isFinished, currentQ, handleSelectOption, handleNext]);

  // If quiz is finished, show Results screen
  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    const incorrectList = history.filter((h) => !h.isCorrect);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-xl mx-auto flex flex-col gap-6"
      >
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 shadow-card p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-4">
            <Trophy className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-1">
            Hoàn Thành Bài Kiểm Tra!
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            Kết quả của bạn trong bài test trắc nghiệm
          </p>

          {/* Score Badge */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 w-full max-w-xs mb-6">
            <div className="text-4xl sm:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {score} / {questions.length}
            </div>
            <div className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mt-1">
              Độ chính xác: {percentage}%
            </div>
          </div>

          {/* Review of Missed Words */}
          {incorrectList.length > 0 && (
            <div className="w-full text-left mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-3">
                Các từ cần ôn lại ({incorrectList.length})
              </h3>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {incorrectList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between gap-3 text-xs sm:text-sm"
                  >
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {item.question.targetItem.word}{" "}
                        <span className="font-normal text-neutral-400 font-mono">
                          {item.question.targetItem.pronunciation}
                        </span>
                      </div>
                      <div className="text-neutral-500 dark:text-neutral-400 text-xs">
                        Nghĩa: {item.question.targetItem.meaning}
                      </div>
                    </div>
                    <button
                      onClick={() => playPronunciation(item.question.targetItem.word)}
                      className="p-2 rounded-lg bg-neutral-200/70 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 transition-all"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold text-sm transition-all active:scale-[0.98] shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Làm lại bài này</span>
            </button>
            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-sm transition-all active:scale-[0.98]"
            >
              <Home className="w-4 h-4" />
              <span>Về trang chính</span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!currentQ) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-xl mx-auto flex flex-col gap-6"
    >
      {/* Top Header: Back Button, Restart Button & Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-medium transition-all active:scale-95 shadow-subtle"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Thoát</span>
          </button>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-medium transition-all active:scale-95 shadow-subtle"
            title="Làm lại bài này từ đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Làm lại</span>
          </button>
        </div>

        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          Câu hỏi {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Progress Bar */}
      <ProgressBar current={currentIndex + 1} total={questions.length} />

      {/* Quiz Card Container - matching screenshot theme */}
      <div className="w-full bg-white dark:bg-neutral-950 rounded-3xl border border-neutral-200/90 dark:border-neutral-800/90 shadow-card p-6 sm:p-8 flex flex-col justify-between min-h-[380px] sm:min-h-[420px]">
        {/* Sub-header instruction */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm sm:text-base font-medium text-neutral-500 dark:text-neutral-400">
            Pick the correct answer
          </span>

          {isAnswered && (
            <button
              onClick={() => playPronunciation(currentQ.targetItem.word)}
              className={`p-2 rounded-full border transition-all ${
                isPlayingAudio
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white scale-105"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
              }`}
              title="Nghe lại phát âm"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Center: Vietnamese Question Prompt */}
        <div className="flex flex-col items-center justify-center text-center my-auto py-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 leading-snug max-w-md break-words">
            {currentQ.targetItem.meaning}
          </h2>

          {/* If answered, reveal pronunciation */}
          <AnimatePresence>
            {isAnswered && currentQ.targetItem.pronunciation && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-mono text-neutral-500 dark:text-neutral-400 mt-2 bg-neutral-100/80 dark:bg-neutral-850 px-3 py-1 rounded-lg border border-neutral-200/60 dark:border-neutral-800"
              >
                {currentQ.targetItem.pronunciation}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* 4 Options Grid (2x2) - Exactly matching screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-auto">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQ.correctIndex;

            let buttonStyles =
              "border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/90 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-700";
            let badgeStyles =
              "bg-neutral-200/80 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400";

            if (isAnswered) {
              if (isCorrect) {
                // Highlight correct answer in green
                buttonStyles =
                  "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold ring-1 ring-emerald-500";
                badgeStyles = "bg-emerald-500 text-white";
              } else if (isSelected && !isCorrect) {
                // Highlight wrong selection in red
                buttonStyles =
                  "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 line-through ring-1 ring-rose-500";
                badgeStyles = "bg-rose-500 text-white";
              } else {
                // Dim other incorrect options
                buttonStyles =
                  "border-neutral-200/40 dark:border-neutral-800/40 opacity-40 text-neutral-400 dark:text-neutral-600";
                badgeStyles =
                  "bg-neutral-100 dark:bg-neutral-850 text-neutral-400 dark:text-neutral-600";
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`group relative flex items-center gap-3 px-4 py-3.5 sm:py-4 rounded-2xl border text-sm sm:text-base font-medium transition-all text-left shadow-subtle ${buttonStyles} ${
                  !isAnswered ? "active:scale-[0.98] cursor-pointer" : "cursor-default"
                }`}
              >
                {/* Number Badge [1], [2], [3], [4] */}
                <span
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg font-mono font-semibold text-xs flex items-center justify-center shrink-0 transition-colors ${badgeStyles}`}
                >
                  {idx + 1}
                </span>

                {/* Option Text */}
                <span className="flex-1 break-words font-medium">{option}</span>

                {/* Status indicator icon if answered */}
                {isAnswered && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls / Next Button */}
      <div className="flex items-center justify-between min-h-[48px] px-1">
        {/* Keyboard shortcut tips */}
        <div className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
          {!isAnswered ? (
            <span>
              Phím tắt:{" "}
              <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                1
              </kbd>{" "}
              -{" "}
              <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                4
              </kbd>
            </span>
          ) : (
            <span>
              Nhấn{" "}
              <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                Enter
              </kbd>{" "}
              hoặc{" "}
              <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                Space
              </kbd>{" "}
              để tiếp tục
            </span>
          )}
        </div>

        {/* Next Question Button */}
        {isAnswered && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleNext}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold text-sm transition-all active:scale-95 shadow-sm ml-auto"
          >
            <span>
              {currentIndex < questions.length - 1 ? "Câu tiếp theo" : "Xem kết quả"}
            </span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
