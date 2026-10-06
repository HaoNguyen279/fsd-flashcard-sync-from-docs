"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Home,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { VocabularyItem } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { ConfettiBurst } from "./ConfettiBurst";
import { playCorrectSound } from "@/lib/sounds";

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
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("quiz_auto_audio");
      return saved !== "false";
    }
    return true;
  });

  const toggleAutoPlayAudio = useCallback(() => {
    setAutoPlayAudio((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("quiz_auto_audio", String(next));
      }
      return next;
    });
  }, []);

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
        playCorrectSound();
      }

      setHistory((prev) => [
        ...prev,
        {
          question: currentQ,
          selectedOption: index,
          isCorrect,
        },
      ]);

      // Play audio for the correct word if auto-play is enabled
      if (autoPlayAudio) {
        playPronunciation(currentQ.targetItem.word);
      }
    },
    [isAnswered, currentQ, autoPlayAudio, playPronunciation]
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
      {/* Top Header: Back Button, Restart Button, Auto Audio Toggle & Progress */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
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
          {/* Auto pronunciation toggle button */}
          <button
            onClick={toggleAutoPlayAudio}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95 shadow-subtle ${
              autoPlayAudio
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                : "bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
            title={
              autoPlayAudio
                ? "Tự động phát âm khi chọn đáp án: BẬT (click để tắt)"
                : "Tự động phát âm khi chọn đáp án: TẮT (click để bật)"
            }
          >
            {autoPlayAudio ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {autoPlayAudio ? "Tự phát âm: Bật" : "Tự phát âm: Tắt"}
            </span>
            <span className="sm:hidden">
              {autoPlayAudio ? "Auto âm" : "Tắt âm"}
            </span>
          </button>
        </div>

        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
          Câu hỏi {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Progress Bar */}
      <ProgressBar current={currentIndex + 1} total={questions.length} />

      {/* Quiz Card Container - matching screenshot theme with smooth layout transition */}
      <motion.div
        layout
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="w-full bg-white dark:bg-neutral-950 rounded-3xl border border-neutral-200/90 dark:border-neutral-800/90 shadow-card p-5 sm:p-8 flex flex-col justify-between min-h-[450px] sm:min-h-[420px] transition-[height] duration-300 ease-out"
      >
        {/* Sub-header instruction - fixed height to prevent vertical jitter */}
        <div className="flex items-center justify-between h-9 mb-3 sm:mb-4">
          <span className="text-sm sm:text-base font-medium text-neutral-500 dark:text-neutral-400 select-none">
            Pick the correct answer
          </span>

          {/* Reserved slot for pronunciation audio button */}
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            {isAnswered && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={() => playPronunciation(currentQ.targetItem.word)}
                className={`p-2 rounded-full border transition-all ${
                  isPlayingAudio
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white scale-105"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
                }`}
                title="Nghe lại phát âm"
              >
                <Volume2 className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Center: Vietnamese Question Prompt + Reserved Pronunciation Slot */}
        <div className="flex flex-col items-center justify-center text-center my-auto py-2 sm:py-4">
          <div className="min-h-[60px] sm:min-h-[72px] flex items-center justify-center">
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 leading-snug max-w-md break-words">
              {currentQ.targetItem.meaning}
            </h2>
          </div>

          {/* Reserved Pronunciation slot (height is fixed so container never jumps when answered/next) */}
          <div className="h-8 mt-2 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isAnswered && currentQ.targetItem.pronunciation ? (
                <motion.p
                  key="pronunciation-badge"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs sm:text-sm font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100/80 dark:bg-neutral-850 px-3 py-1 rounded-lg border border-neutral-200/60 dark:border-neutral-800 select-none"
                >
                  {currentQ.targetItem.pronunciation}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* 4 Options Grid (2x2) - Exactly matching screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 mt-auto">
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
                className={`group relative flex items-center gap-3 px-4 py-3 sm:py-4 rounded-2xl border text-sm sm:text-base font-medium transition-all text-left shadow-subtle ${buttonStyles} ${
                  !isAnswered ? "active:scale-[0.98] cursor-pointer" : "cursor-default"
                }`}
              >
                {/* Small confetti burst when the user picks the correct answer */}
                {isAnswered && isSelected && isCorrect && (
                  <ConfettiBurst key={`confetti-${currentIndex}`} />
                )}

                {/* Number Badge [1], [2], [3], [4] */}
                <span
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg font-mono font-semibold text-xs flex items-center justify-center shrink-0 transition-colors ${badgeStyles}`}
                >
                  {idx + 1}
                </span>

                {/* Option Text */}
                <span className="flex-1 break-words font-medium">{option}</span>

                {/* Status indicator slot - always reserved (w-5 h-5) to prevent text wrapping/layout shift */}
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  {isAnswered && isCorrect && (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </motion.span>
                  )}
                  {isAnswered && isSelected && !isCorrect && (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <XCircle className="w-5 h-5 text-rose-500" />
                    </motion.span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Bottom Controls / Next Button - fixed height to prevent vertical jitter */}
      <div className="flex items-center justify-between h-12 px-1">
        {/* Keyboard shortcut tips (desktop only, hidden on mobile to prevent wrapping) */}
        <div className="hidden sm:flex text-xs text-neutral-400 dark:text-neutral-500 items-center gap-2">
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

        {/* Next Question Button with smooth presence */}
        <div className="w-full sm:w-auto flex justify-end">
          <AnimatePresence>
            {isAnswered && (
              <motion.button
                key="next-button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                onClick={handleNext}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold text-sm transition-all active:scale-95 shadow-sm"
              >
                <span>
                  {currentIndex < questions.length - 1 ? "Câu tiếp theo" : "Xem kết quả"}
                </span>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
