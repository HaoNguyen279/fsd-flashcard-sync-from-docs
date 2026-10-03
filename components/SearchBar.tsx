"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Calendar, CornerDownLeft, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VocabularyItem } from "@/lib/types";

interface SearchBarProps {
  items: VocabularyItem[];
  onSelectWord: (item: VocabularyItem) => void;
  className?: string;
}

/**
 * Highlights matched characters in search query
 */
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-semibold px-0.5 rounded"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export const SearchBar: React.FC<SearchBarProps> = ({
  items,
  onSelectWord,
  className = "",
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Instant search ranking algorithm
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const scored = items.map((item) => {
      const wordLower = item.word.toLowerCase();
      const rawWordLower = (item.rawWord || "").toLowerCase();
      const meaningLower = item.meaning.toLowerCase();

      let score = 0;
      if (wordLower === q) {
        score = 100; // Exact match on clean English word
      } else if (wordLower.startsWith(q)) {
        score = 80; // Starts with query
      } else if (wordLower.includes(q)) {
        score = 60; // Substring in word
      } else if (rawWordLower.includes(q)) {
        score = 40; // Substring in notes / full phrase
      } else if (meaningLower.includes(q)) {
        score = 25; // Substring in Vietnamese meaning
      }

      return { item, score };
    });

    return scored
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.word.localeCompare(b.item.word))
      .slice(0, 8)
      .map((entry) => entry.item);
  }, [query, items]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Global hotkeys (Ctrl+K, Cmd+K, or / to open search)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        results.length > 0 ? (prev - 1 + results.length) % results.length : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.length > 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (item: VocabularyItem) => {
    onSelectWord(item);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const speakWord = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div ref={containerRef} className={`relative flex-1 min-w-0 max-w-xs sm:max-w-sm ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center w-full">
        <Search className="w-3.5 h-3.5 absolute left-3 text-neutral-400 dark:text-neutral-500 pointer-events-none shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Tìm từ vựng..."
          className="w-full pl-8 pr-16 py-1.5 text-xs sm:text-sm bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-full text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 shadow-subtle focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:border-transparent transition-all"
        />

        {/* Action icons on right of input */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {query ? (
            <button
              onClick={handleClear}
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              title="Xóa tìm kiếm"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd
              className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded"
              title="Nhấn Enter để mở"
            >
              <CornerDownLeft className="w-2.5 h-2.5" />
            </kbd>
          )}
        </div>
      </div>

      {/* Instant Search Dropdown Popover */}
      <AnimatePresence>
        {isOpen && query.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-4 right-4 top-[68px] sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:w-[420px] sm:mt-2 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[440px]"
          >
            {/* Header info */}
            <div className="px-3.5 py-2 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] font-medium text-neutral-400 dark:text-neutral-500 bg-neutral-50/50 dark:bg-neutral-950/40">
              <span>
                {results.length > 0 ? (
                  <>Tìm thấy <strong className="text-neutral-700 dark:text-neutral-300 font-semibold">{results.length}</strong> từ phù hợp</>
                ) : (
                  "Không có kết quả"
                )}
              </span>
              <span className="hidden sm:inline text-[10px] text-neutral-400 dark:text-neutral-600">
                Nhấn ↑↓ để chọn • Enter để mở
              </span>
            </div>

            {/* Results list */}
            {results.length > 0 ? (
              <div className="overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {results.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const hasExtraHint = item.rawWord && item.rawWord.trim() !== item.word;

                  return (
                    <div
                      key={`${item.date}-${item.word}-${idx}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`px-3.5 py-2.5 flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-neutral-100 dark:bg-neutral-800/90 text-neutral-900 dark:text-white"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        {/* Word + Pronunciation + Date Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 tracking-tight">
                            {highlightMatch(item.word, query)}
                          </span>

                          {item.pronunciation && (
                            <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                              {item.pronunciation}
                            </span>
                          )}

                          <button
                            onClick={(e) => speakWord(e, item.word)}
                            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                            title="Phát âm"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>

                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/50 dark:border-neutral-750">
                            <Calendar className="w-2.5 h-2.5" />
                            {item.date}
                          </span>
                        </div>

                        {/* Extra phrase note if present */}
                        {hasExtraHint && (
                          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono italic mt-0.5 truncate">
                            {item.rawWord}
                          </p>
                        )}

                        {/* Meaning */}
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-1 leading-snug">
                          {highlightMatch(item.meaning, query)}
                        </p>
                      </div>

                      {/* Select hint icon */}
                      <div className="shrink-0 self-center">
                        <span
                          className={`inline-flex items-center justify-center p-1 rounded-lg transition-opacity ${
                            isSelected
                              ? "opacity-100 text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-700/60"
                              : "opacity-0"
                          }`}
                        >
                          <CornerDownLeft className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 px-4 text-center">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Không tìm thấy từ nào khớp với &quot;{query}&quot;
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  Thử tìm theo từ tiếng Anh hoặc nghĩa tiếng Việt
                </p>
              </div>
            )}

            {/* Footer with hint */}
            <div className="px-3.5 py-1.5 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/40 text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center justify-between">
              <span>Bấm vào từ để mở Flashcard</span>
              <span>Tổng: {items.length} từ</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
