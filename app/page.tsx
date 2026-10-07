"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, AlertCircle, BookOpen, Sun, Moon, GraduationCap, Gamepad2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VocabularyItem, VocabApiResponse } from "@/lib/types";
import { DaySelector } from "@/components/DaySelector";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { TestingSetup, TestConfig } from "@/components/TestingSetup";
import { QuizView } from "@/components/QuizView";
import { TestingPracticeView } from "@/components/TestingPracticeView";
import { ChatBotDrawer } from "@/components/ChatBotDrawer";
import { SearchBar } from "@/components/SearchBar";
import { HardcoreView } from "@/components/HardcoreView";

export default function Home() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [targetWord, setTargetWord] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<"main" | "setup" | "quiz" | "practice" | "hardcore">("main");
  const [testConfig, setTestConfig] = useState<TestConfig | null>(null);
  const [testItems, setTestItems] = useState<VocabularyItem[]>([]);
  const [activeItem, setActiveItem] = useState<VocabularyItem | null>(null);

  // Force-remount key for recovering from blank screen edge cases
  const [viewKey, setViewKey] = useState(0);

  // Initialize theme: Default is light mode as requested
  useEffect(() => {
    const savedTheme = localStorage.getItem("vocab_theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("vocab_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("vocab_theme", "light");
      }
      return next;
    });
  };

  const fetchVocabulary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vocab");
      const data: VocabApiResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch vocabulary from Google Docs");
      }

      setItems(data.data);

      // Default to first available day
      if (data.data.length > 0) {
        const availableDates = Array.from(new Set(data.data.map((item) => item.date)));
        if (availableDates.length > 0) {
          setSelectedDay((prev) => (prev && availableDates.includes(prev) ? prev : availableDates[0]));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVocabulary();
  }, []);

  // Compute unique days and count per day
  const { days, dayCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      counts[item.date] = (counts[item.date] || 0) + 1;
    });
    return {
      days: Object.keys(counts),
      dayCounts: counts,
    };
  }, [items]);

  // Filter items for the selected day
  const filteredItems = useMemo(() => {
    if (!selectedDay) return [];
    return items.filter((item) => item.date === selectedDay);
  }, [items, selectedDay]);

  // Testing feature handlers
  const sampleRandomItems = useCallback(
    (count: number, pool: VocabularyItem[]) => {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(count, pool.length));
    },
    []
  );

  const handleStartTest = useCallback(
    (config: TestConfig, candidateItems: VocabularyItem[]) => {
      const sampled = sampleRandomItems(config.count, candidateItems);
      setTestConfig(config);
      setTestItems(sampled);
      setViewMode(config.mode);
    },
    [sampleRandomItems]
  );

  const handleRetryTest = useCallback(() => {
    // Retain the exact same set of words so user can re-test the exact same session
  }, []);

  const handleBackToMain = useCallback(() => {
    setViewMode("main");
  }, []);

  const handleSelectWordFromSearch = useCallback((item: VocabularyItem) => {
    setViewMode("main");
    setSelectedDay(item.date);
    setTargetWord(item.word);
  }, []);

  // Reload current view — force re-mount by incrementing key
  const handleReloadView = useCallback(() => {
    setViewKey((k) => k + 1);
  }, []);

  // Render non-main view content (setup / quiz / practice)
  const renderNonMainView = () => {
    if (viewMode === "setup") {
      return (
        <TestingSetup
          key={`setup-${viewKey}`}
          items={items}
          days={days}
          dayCounts={dayCounts}
          defaultSelectedDay={selectedDay}
          onStart={handleStartTest}
          onBack={handleBackToMain}
        />
      );
    }
    if (viewMode === "quiz" && testItems.length > 0) {
      return (
        <QuizView
          key={`quiz-${viewKey}`}
          items={testItems}
          allItems={items}
          onBack={handleBackToMain}
          onRetry={handleRetryTest}
        />
      );
    }
    if (viewMode === "practice" && testItems.length > 0) {
      return (
        <TestingPracticeView
          key={`practice-${viewKey}`}
          items={testItems}
          onBack={handleBackToMain}
          onRetry={handleRetryTest}
        />
      );
    }
    if (viewMode === "hardcore" && testItems.length > 0) {
      return (
        <HardcoreView
          key={`hardcore-${viewKey}`}
          items={testItems}
          allItems={items}
          onBack={handleBackToMain}
          onRetry={handleRetryTest}
        />
      );
    }
    return null;
  };

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 flex flex-col justify-between px-4 py-6 sm:py-10 selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900 transition-colors duration-200">
      {/* Top Navigation Bar with Actions */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="inline-flex shrink-0 items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            <Sparkles className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-200 shrink-0" />
            <span className="hidden md:inline">Synced with Google Docs</span>
            <span className="md:hidden">Docs</span>
          </div>

          {/* Instant Search Bar */}
          <SearchBar items={items} onSelectWord={handleSelectWordFromSearch} />
        </div>

        {/* Top-Right Action Buttons: Vocab Runner Game, Test Vocabulary, Reload Data & Theme Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 3D Vocab Runner Game Button */}
          {viewMode === "main" && (
            <Link
              href="/runner"
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-[#132b37] hover:bg-[#1a3d4e] text-[#8df0c8] border border-[#8df0c8]/40 shadow-subtle hover:shadow transition-all active:scale-95 text-xs font-semibold shrink-0"
              title="Chơi game 3D Vocab Runner"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-[#8df0c8] shrink-0" />
              <span className="hidden sm:inline">Vocab Runner</span>
              <span className="sm:hidden">Game</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#8df0c8]/20 text-[#8df0c8] font-mono">
                3D
              </span>
            </Link>
          )}

          {/* Vocabulary Test Button */}
          {viewMode === "main" && items.length > 0 && (
            <button
              onClick={() => setViewMode("setup")}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 shadow-subtle hover:shadow transition-all active:scale-95 text-xs font-semibold shrink-0"
              title={`Kiểm tra từ vựng (${items.length} từ)`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-400 dark:text-amber-500 shrink-0" />
              <span className="hidden lg:inline">Kiểm tra từ vựng</span>
              <span className="hidden sm:inline lg:hidden">Kiểm tra</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-neutral-900/15 font-mono">
                {items.length}
              </span>
            </button>
          )}

          {/* Reload Data Button (only show when on main screen) */}
          {viewMode === "main" && (
            <button
              onClick={fetchVocabulary}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white shadow-subtle hover:shadow transition-all active:scale-95 disabled:opacity-50 text-xs font-medium"
              title="Reload data from Google Docs"
              aria-label="Reload data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Reload</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white shadow-subtle hover:shadow transition-all active:scale-95"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center">
        {/* LOADING STATE — Sleek Minimal Spinner */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              key="loading-indicator"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center gap-4 py-20"
            >
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg
                  className="w-10 h-10 animate-spin text-neutral-900 dark:text-neutral-100"
                  viewBox="0 0 40 40"
                  fill="none"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    className="opacity-15"
                  />
                  <path
                    d="M36 20C36 11.1634 28.8366 4 20 4"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 tracking-wide">
                Loading docs data...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ERROR STATE */}
        {!isLoading && error && (
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-card text-center flex flex-col items-center">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Sync Unsuccessful
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              {error}
            </p>

            {error.includes("GOOGLE_") || error.includes("credentials") ? (
              <div className="text-left bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-4 w-full text-xs font-mono text-neutral-600 dark:text-neutral-400 mb-6">
                <p className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Check .env.local:</p>
                <p>• GOOGLE_DOC_ID</p>
                <p>• GOOGLE_SERVICE_ACCOUNT_EMAIL</p>
                <p>• GOOGLE_PRIVATE_KEY</p>
              </div>
            ) : null}

            <button
              onClick={fetchVocabulary}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-medium transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Sync</span>
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !error && items.length === 0 && (
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-8 shadow-card text-center flex flex-col items-center">
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              No Vocabulary Found
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              No parent sections matching &quot;dd/month&quot; were found in the document.
            </p>
            <button
              onClick={fetchVocabulary}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-medium transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        )}

        {/* SUCCESSFUL DATA STATE */}
        {!isLoading && !error && items.length > 0 && (
          <div className="w-full">
            {/* ===== MAIN VIEW ===== */}
            {viewMode === "main" && (
              <div
                key={`main-${viewKey}`}
                className="w-full relative flex flex-col items-center justify-center"
                style={{ animation: "viewFadeIn 0.2s ease-out" }}
              >
                {/* Day Selector (Pinned to left on PC, top on mobile/tablet) */}
                <DaySelector
                  days={days}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  dayCounts={dayCounts}
                />

                {/* Main Flashcard Deck and Testing Button */}
                <div className="w-full max-w-xl mx-auto flex flex-col items-center">
                  <FlashcardDeck
                    items={filteredItems}
                    selectedDate={selectedDay}
                    targetWord={targetWord}
                    onActiveItemChange={setActiveItem}
                  />
                </div>

                {/* AI Chatbot Assistant Drawer on the right */}
                <ChatBotDrawer activeItem={activeItem} />
              </div>
            )}

            {/* ===== NON-MAIN VIEWS (setup / quiz / practice) — No AnimatePresence wrapper ===== */}
            {viewMode !== "main" && (
              <div
                key={`${viewMode}-${viewKey}`}
                className="w-full"
                style={{ animation: "viewFadeIn 0.2s ease-out" }}
              >
                {renderNonMainView()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto text-center pt-8 text-xs text-neutral-400 dark:text-neutral-600">
        <p>Built with Next.js App Router • Google Docs API Sync</p>
      </footer>
    </main>
  );
}
