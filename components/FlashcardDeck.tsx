"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCw, Shuffle } from "lucide-react";
import { VocabularyItem } from "@/lib/types";
import { Flashcard } from "./Flashcard";
import { ProgressBar } from "./ProgressBar";

interface FlashcardDeckProps {
  items: VocabularyItem[];
  selectedDate: string;
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

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ items, selectedDate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [deck, setDeck] = useState<VocabularyItem[]>(items);

  // Sync deck when items change
  useEffect(() => {
    setDeck(items);
    setCurrentIndex(0);
    setIsFlipped(false);
    setDirection(0);
  }, [items, selectedDate]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setDirection(1);
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
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
  };

  // Keyboard navigation: A for previous, D for next, Space for flip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
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
  }, [handleNext, handlePrevious, handleFlip]);

  if (deck.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500 dark:text-neutral-400 font-medium">No vocabulary items available for this date.</p>
      </div>
    );
  }

  const currentItem = deck[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < deck.length - 1;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-6">
      {/* Progress Bar */}
      <ProgressBar current={currentIndex + 1} total={deck.length} />

      {/* Card area with slide animation */}
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
        {/* Previous Button */}
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

        {/* Action center: Flip card & Shuffle */}
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
            title="Shuffle cards"
            aria-label="Shuffle cards"
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={!hasNext}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium border transition-all ${
            hasNext
              ? "bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-800 shadow-sm active:scale-95"
              : "bg-neutral-50 dark:bg-neutral-900/40 text-neutral-300 dark:text-neutral-700 border-neutral-100 dark:border-neutral-900 cursor-not-allowed"
          }`}
          aria-label="Next card"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Keyboard guide hint */}
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
    </div>
  );
};
