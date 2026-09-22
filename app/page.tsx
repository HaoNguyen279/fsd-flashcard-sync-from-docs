"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Sparkles, RefreshCw, AlertCircle, BookOpen } from "lucide-react";
import { VocabularyItem, VocabApiResponse } from "@/lib/types";
import { DaySelector } from "@/components/DaySelector";
import { FlashcardDeck } from "@/components/FlashcardDeck";

export default function Home() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="min-h-screen bg-[#fafafa] text-neutral-900 flex flex-col justify-between px-4 py-8 sm:py-12 selection:bg-neutral-900 selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto flex flex-col items-center text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200/60 text-xs font-semibold text-neutral-600 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-neutral-800" />
          <span>Synced with Google Docs</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 mb-2">
          Daily English Flashcards
        </h1>
        <p className="text-sm sm:text-base text-neutral-500 max-w-md">
          Master daily vocabulary with active recall and pronunciation practice.
        </p>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col items-center justify-center">
        {/* LOADING STATE */}
        {isLoading && (
          <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-6">
            <div className="h-2 w-full max-w-md bg-neutral-200 animate-pulse rounded-full" />
            <div className="w-full h-[360px] sm:h-[400px] bg-white rounded-3xl border border-neutral-200/80 shadow-subtle flex flex-col items-center justify-center p-8 animate-pulse">
              <div className="w-24 h-4 bg-neutral-100 rounded-full mb-8" />
              <div className="w-48 h-8 bg-neutral-200 rounded-xl mb-4" />
              <div className="w-32 h-6 bg-neutral-100 rounded-lg mb-8" />
              <div className="w-40 h-4 bg-neutral-100 rounded-full mt-auto" />
            </div>
            <p className="text-xs text-neutral-400 font-medium animate-pulse">
              Syncing vocabulary from Google Docs...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {!isLoading && error && (
          <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200 p-8 shadow-card text-center flex flex-col items-center">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Sync Unsuccessful
            </h3>
            <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
              {error}
            </p>

            {error.includes("GOOGLE_") || error.includes("credentials") ? (
              <div className="text-left bg-neutral-50 border border-neutral-200/80 rounded-xl p-4 w-full text-xs font-mono text-neutral-600 mb-6">
                <p className="font-semibold text-neutral-800 mb-2">Check .env.local:</p>
                <p>• GOOGLE_DOC_ID</p>
                <p>• GOOGLE_SERVICE_ACCOUNT_EMAIL</p>
                <p>• GOOGLE_PRIVATE_KEY</p>
              </div>
            ) : null}

            <button
              onClick={fetchVocabulary}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Sync</span>
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && !error && items.length === 0 && (
          <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200 p-8 shadow-card text-center flex flex-col items-center">
            <div className="p-3 bg-neutral-100 text-neutral-600 rounded-2xl mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              No Vocabulary Found
            </h3>
            <p className="text-sm text-neutral-500 mb-6">
              No parent sections matching "dd/month" were found in the document.
            </p>
            <button
              onClick={fetchVocabulary}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        )}

        {/* SUCCESSFUL DATA STATE */}
        {!isLoading && !error && items.length > 0 && (
          <div className="w-full flex flex-col items-center">
            {/* Day Selector */}
            <DaySelector
              days={days}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              dayCounts={dayCounts}
            />

            {/* Flashcard Deck */}
            <FlashcardDeck items={filteredItems} selectedDate={selectedDay} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto text-center pt-8 text-xs text-neutral-400">
        <p>Built with Next.js App Router • Google Docs API Sync</p>
      </footer>
    </main>
  );
}
