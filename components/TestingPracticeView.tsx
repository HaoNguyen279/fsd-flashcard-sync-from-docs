"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  Trophy,
  RotateCcw,
  Home,
} from "lucide-react";
import { VocabularyItem } from "@/lib/types";
import { Flashcard } from "./Flashcard";
import { ProgressBar } from "./ProgressBar";

interface TestingPracticeViewProps {
  items: VocabularyItem[];
  onBack: () => void;
  onRetry: () => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.25 },
      scale: { duration: 0.25 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 120 : -120,
    opacity: 0,
    scale: 0.95,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
      scale: { duration: 0.2 },
    },
  }),
};

export const TestingPracticeView: React.FC<TestingPracticeViewProps> = ({
  items,
  onBack,
  onRetry,
}) => {
  const [deck, setDeck] = useState<VocabularyItem[]>(items);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    setDeck(items);
    setCurrentIndex(0);
    setIsFlipped(false);
    setDirection(0);
    setIsFinished(false);
  }, [items]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setDirection(1);
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, deck.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleShuffle = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  };

  // Keyboard navigation: A for previous, D for next, Space for flip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent repeated trigger when holding down a key (fixes card jitter)
      if (e.repeat) return;

      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        isFinished
      ) {
        return;
      }

      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrevious, handleFlip, isFinished]);

  const handleRetry = useCallback(() => {
    setDeck(items);
    setCurrentIndex(0);
    setIsFlipped(false);
    setDirection(0);
    setIsFinished(false);
    onRetry();
  }, [items, onRetry]);

  if (isFinished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-xl mx-auto flex flex-col gap-6"
      >
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 shadow-card p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4">
            <Trophy className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-1">
            Tuyệt vời!
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            Bạn đã hoàn thành lượt luyện tập {deck.length} từ vựng ngẫu nhiên.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mt-2">
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold text-sm transition-all active:scale-[0.98] shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Luyện tập lại bộ từ này</span>
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

  const currentItem = deck[currentIndex];
  const hasPrevious = currentIndex > 0;
  const isLast = currentIndex === deck.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-xl mx-auto flex flex-col items-center gap-6"
    >
      {/* Top Header: Back Button, Restart & Count */}
      <div className="flex items-center justify-between w-full">
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
            title="Luyện tập lại bộ từ này từ đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Làm lại</span>
          </button>
        </div>

        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          Luyện tập flashcard • {deck.length} từ
        </span>
      </div>

      {/* Progress Bar */}
      <ProgressBar current={currentIndex + 1} total={deck.length} />

      {/* Card area */}
      <div className="relative w-full overflow-visible min-h-[380px] sm:min-h-[420px] flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={`${currentItem.word}-${currentIndex}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            <Flashcard item={currentItem} isFlipped={isFlipped} onFlip={handleFlip} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between w-full max-w-lg px-2 mt-2">
        <button
          onClick={handlePrevious}
          disabled={!hasPrevious}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium border transition-all ${
            hasPrevious
              ? "bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-800 shadow-sm active:scale-95"
              : "bg-neutral-50 dark:bg-neutral-900/40 text-neutral-300 dark:text-neutral-700 border-neutral-100 dark:border-neutral-900 cursor-not-allowed"
          }`}
          aria-label="Previous card"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleFlip}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 shadow-sm transition-all active:scale-95"
          >
            <RotateCw className="w-4 h-4" />
            <span>Flip</span>
          </button>

          <button
            onClick={handleShuffle}
            className="p-2.5 rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-transparent dark:border-neutral-800 transition-all active:scale-95"
            title="Xáo trộn từ"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleNext}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium border transition-all bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-800 shadow-sm active:scale-95"
          aria-label={isLast ? "Finish practice" : "Next card"}
        >
          <span className="hidden sm:inline">{isLast ? "Hoàn thành" : "Next"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="hidden sm:flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500 mt-2">
        <span>
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 font-mono font-semibold">
            A
          </kbd>{" "}
          Prev
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 font-mono font-semibold">
            Space
          </kbd>{" "}
          Flip
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 font-mono font-semibold">
            D
          </kbd>{" "}
          Next
        </span>
      </div>
    </motion.div>
  );
};
