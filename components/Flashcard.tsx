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
        <div className="absolute inset-0 w-full h-full bg-white rounded-3xl border border-neutral-200/90 shadow-card hover:shadow-card-hover transition-shadow p-8 flex flex-col justify-between backface-hidden">
          {/* Header row: Category / Date tag and Audio button */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-neutral-400 uppercase bg-neutral-50 px-3 py-1 rounded-full border border-neutral-100">
              English • {item.date}
            </span>
            <button
              onClick={handlePlayAudio}
              className={`p-2.5 rounded-full border transition-all ${
                isPlayingAudio
                  ? "bg-neutral-900 text-white border-neutral-900 scale-105"
                  : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 border-neutral-200/80"
              }`}
              title="Listen to pronunciation"
              aria-label="Listen to pronunciation"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Word and Pronunciation */}
          <div className="flex flex-col items-center justify-center text-center my-auto py-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mb-3 break-words">
              {item.word}
            </h2>
            {item.pronunciation && (
              <p className="text-lg sm:text-xl font-normal text-neutral-500 font-mono tracking-wide bg-neutral-50/80 px-4 py-1.5 rounded-xl border border-neutral-100">
                {item.pronunciation}
              </p>
            )}
          </div>

          {/* Footer: Flip hint */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-400 font-medium pt-2 border-t border-neutral-100">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Click or press Space to reveal meaning</span>
          </div>
        </div>

        {/* BACK OF CARD (Vietnamese Meaning) */}
        <div className="absolute inset-0 w-full h-full bg-white rounded-3xl border border-neutral-200/90 shadow-card hover:shadow-card-hover transition-shadow p-8 flex flex-col justify-between backface-hidden rotate-y-180">
          {/* Header row: English reminder */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              Vietnamese Meaning
            </span>
            <span className="text-xs font-medium text-neutral-400">
              {item.word}
            </span>
          </div>

          {/* Center: Vietnamese Meaning */}
          <div className="flex flex-col items-center justify-center text-center my-auto py-4">
            <p className="text-2xl sm:text-3xl font-semibold text-neutral-900 leading-relaxed max-w-sm">
              {item.meaning}
            </p>
            {item.pronunciation && (
              <p className="text-sm text-neutral-400 font-mono mt-3">
                {item.pronunciation}
              </p>
            )}
          </div>

          {/* Footer: Flip back hint */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-400 font-medium pt-2 border-t border-neutral-100">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Click or press Space to flip back</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
