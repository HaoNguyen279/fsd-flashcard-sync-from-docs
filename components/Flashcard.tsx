"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, RotateCw } from "lucide-react";
import { VocabularyItem } from "@/lib/types";

interface FlashcardProps {
  item: VocabularyItem;
  isFlipped: boolean;
  onFlip: () => void;
}

export const Flashcard: React.FC<FlashcardProps> = ({ item, isFlipped, onFlip }) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Play English pronunciation using browser SpeechSynthesis API
  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger card flip when clicking audio button

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech

      // Clean the word (strip part of speech like '(v)', '(n)', etc. for natural pronunciation)
      const cleanWord = item.word.replace(/\s*\([a-z/]+\)\s*/gi, "").trim();

      const utterance = new SpeechSynthesisUtterance(cleanWord);
      utterance.lang = "en-US";
      utterance.rate = 0.9; // Slightly slower for clarity

      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div
      className="relative w-full max-w-lg h-[360px] sm:h-[400px] cursor-pointer perspective-1000 select-none mx-auto"
      onClick={onFlip}
    >
      <motion.div
        className="relative w-full h-full transform-style-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 220, damping: 20 }}
      >
        {/* FRONT OF CARD (English Vocabulary) */}
        <div className="absolute inset-0 w-full h-full bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 shadow-card hover:shadow-card-hover dark:shadow-none transition-all p-8 flex flex-col justify-between backface-hidden">
          {/* Header row: Category / Date tag and Audio button */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-neutral-400 dark:text-neutral-400 uppercase bg-neutral-50 dark:bg-neutral-800 px-3 py-1 rounded-full border border-neutral-100 dark:border-neutral-700">
              English • {item.date}
            </span>
            <button
              onClick={handlePlayAudio}
              className={`p-2.5 rounded-full border transition-all ${
                isPlayingAudio
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white scale-105"
                  : "bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border-neutral-200/80 dark:border-neutral-700"
              }`}
              title="Listen to pronunciation"
              aria-label="Listen to pronunciation"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Word and Pronunciation */}
          <div className="flex flex-col items-center justify-center text-center my-auto py-4">
            <h2
              className={`font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-3 break-words max-w-full px-2 ${
                item.word.length > 25
                  ? "text-xl sm:text-2xl"
                  : item.word.length > 15
                  ? "text-2xl sm:text-3xl"
                  : "text-3xl sm:text-4xl"
              }`}
            >
              {item.word}
            </h2>
            {item.pronunciation && (
              <p className="text-lg sm:text-xl font-normal text-neutral-500 dark:text-neutral-300 font-mono tracking-wide bg-neutral-50/80 dark:bg-neutral-800/80 px-4 py-1.5 rounded-xl border border-neutral-100 dark:border-neutral-700">
                {item.pronunciation}
              </p>
            )}
          </div>

          {/* Footer: Flip hint */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 font-medium pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Click or press Space to reveal meaning</span>
          </div>
        </div>

        {/* BACK OF CARD (Vietnamese Meaning) */}
        <div className="absolute inset-0 w-full h-full bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 shadow-card hover:shadow-card-hover dark:shadow-none transition-all p-8 flex flex-col justify-between backface-hidden rotate-y-180">
          {/* Header row: English reminder */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800/60">
              Vietnamese Meaning
            </span>
            <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 truncate max-w-[200px]">
              {item.word}
            </span>
          </div>

          {/* Center: Vietnamese Meaning */}
          <div className="flex flex-col items-center justify-center text-center my-auto py-4 gap-3">
            {/* Raw word hint — shown when cell has annotations/usage notes */}
            {item.rawWord && item.rawWord.trim() !== item.word && (
              <p className="text-xs sm:text-sm text-neutral-400 dark:text-neutral-500 font-mono italic tracking-wide leading-relaxed max-w-xs">
                {item.rawWord}
              </p>
            )}
            <p className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 leading-relaxed max-w-sm">
              {item.meaning}
            </p>
            {item.pronunciation && (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 font-mono">
                {item.pronunciation}
              </p>
            )}
          </div>

          {/* Footer: Flip back hint */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500 font-medium pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Click or press Space to flip back</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
