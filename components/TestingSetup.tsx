"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Play,
  Layers,
  HelpCircle,
  Sparkles,
  Calendar,
  Check,
  CheckCheck,
  X,
  AlertCircle,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VocabularyItem } from "@/lib/types";

export type TestMode = "practice" | "quiz" | "hardcore";
export type TestScope = "all" | "by_date";

export interface TestConfig {
  count: number;
  mode: TestMode;
  scope: TestScope;
  selectedDates?: string[];
}

interface TestingSetupProps {
  items: VocabularyItem[];
  days: string[];
  dayCounts: Record<string, number>;
  defaultSelectedDay?: string;
  onStart: (config: TestConfig, candidateItems: VocabularyItem[]) => void;
  onBack: () => void;
}

const PRESET_COUNTS = [5, 10, 15, 20];

export const TestingSetup: React.FC<TestingSetupProps> = ({
  items,
  days,
  dayCounts,
  defaultSelectedDay,
  onStart,
  onBack,
}) => {
  // Tab Navigation: All Vocab vs By Date
  const [scope, setScope] = useState<TestScope>("all");

  // Selected dates for multi-day test (default to currently active day or first day)
  const [selectedDates, setSelectedDates] = useState<string[]>(() => {
    if (defaultSelectedDay && days.includes(defaultSelectedDay)) {
      return [defaultSelectedDay];
    }
    return days.length > 0 ? [days[0]] : [];
  });

  // Candidate items pool based on chosen scope
  const candidateItems = useMemo<VocabularyItem[]>(() => {
    if (scope === "all") {
      return items;
    }
    return items.filter((item) => selectedDates.includes(item.date));
  }, [scope, items, selectedDates]);

  const availableCount = candidateItems.length;

  // Selected word count for test
  const [selectedCount, setSelectedCount] = useState<number>(() =>
    Math.min(10, Math.max(1, items.length))
  );
  const [selectedMode, setSelectedMode] = useState<TestMode>("quiz");

  // Auto-clamp selected count whenever candidateItems pool changes
  useEffect(() => {
    if (availableCount > 0) {
      setSelectedCount((prev) => Math.min(Math.max(1, prev), availableCount));
    }
  }, [availableCount]);

  // Toggle single date in multi-select
  const handleToggleDate = (day: string) => {
    setSelectedDates((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Select all dates
  const handleSelectAllDates = () => {
    setSelectedDates([...days]);
  };

  // Deselect all dates
  const handleDeselectAllDates = () => {
    setSelectedDates([]);
  };

  const handlePresetClick = (preset: number) => {
    setSelectedCount(Math.min(preset, availableCount));
  };

  const handleAllClick = () => {
    setSelectedCount(availableCount);
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setSelectedCount(1);
    } else {
      setSelectedCount(Math.max(1, Math.min(val, availableCount)));
    }
  };

  const handleStart = () => {
    if (availableCount === 0) return;
    onStart(
      {
        count: selectedCount,
        mode: selectedMode,
        scope,
        selectedDates: scope === "by_date" ? selectedDates : undefined,
      },
      candidateItems
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      {/* Top Header with Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-medium transition-all active:scale-95 shadow-subtle"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại học từ</span>
        </button>

        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Tổng cộng: {items.length} từ vựng
        </span>
      </div>

      {/* Main Setup Card */}
      <div className="w-full bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 shadow-card p-6 sm:p-8 flex flex-col gap-7">
        {/* Title */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Cấu hình kiểm tra</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Kiểm Tra Từ Vựng
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Chọn phạm vi từ vựng, số lượng câu hỏi và hình thức kiểm tra.
          </p>
        </div>

        {/* ─── TAB NAVIGATION: Phạm vi từ vựng ─── */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
            1. Chọn phạm vi từ vựng
          </label>

          {/* Segmented Control Tab Bar */}
          <div className="flex p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-750">
            {/* Tab: Tất cả từ vựng */}
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                scope === "all"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Tất cả từ vựng</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {items.length}
              </span>
            </button>

            {/* Tab: Chọn theo ngày */}
            <button
              type="button"
              onClick={() => setScope("by_date")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                scope === "by_date"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Chọn theo ngày</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {days.length} ngày
              </span>
            </button>
          </div>

          {/* Sub-Panel: Date Multi-selection (When 'by_date' tab is active) */}
          <AnimatePresence>
            {scope === "by_date" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-850/60 border border-neutral-200/80 dark:border-neutral-800 flex flex-col gap-3 mt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-600 dark:text-neutral-300">
                      Chọn các ngày muốn kiểm tra:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllDates}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-2 py-1 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Tất cả</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllDates}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-2 py-1 rounded-md hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        <span>Bỏ chọn</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-date Chips */}
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                    {days.map((day) => {
                      const isSelected = selectedDates.includes(day);
                      const count = dayCounts[day] || 0;

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleDate(day)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                            isSelected
                              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm"
                              : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border transition-colors ${
                              isSelected
                                ? "bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white border-transparent"
                                : "border-neutral-300 dark:border-neutral-700"
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span>{day}</span>
                          <span
                            className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                              isSelected
                                ? "bg-white/20 dark:bg-neutral-900/15"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Date Status Banner */}
                  {selectedDates.length === 0 ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs border border-amber-200/80 dark:border-amber-900">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Vui lòng chọn ít nhất 1 ngày để bắt đầu kiểm tra.</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Đã chọn <strong className="text-neutral-800 dark:text-neutral-200">{selectedDates.length}</strong> ngày • <strong className="text-neutral-800 dark:text-neutral-200">{availableCount}</strong> từ vựng sẵn sàng
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── 2. SELECT NUMBER OF WORDS ─── */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
            2. Chọn số lượng từ cần test (1 - {Math.max(1, availableCount)})
          </label>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COUNTS.map((preset) => {
              const disabled = preset > availableCount || availableCount === 0;
              const isSelected = selectedCount === preset && !disabled;
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                    isSelected
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm"
                      : disabled
                      ? "opacity-30 border-neutral-200 dark:border-neutral-800 cursor-not-allowed text-neutral-400"
                      : "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/70 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {preset} từ
                </button>
              );
            })}

            <button
              type="button"
              disabled={availableCount === 0}
              onClick={handleAllClick}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                selectedCount === availableCount && availableCount > 0
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm"
                  : availableCount === 0
                  ? "opacity-30 border-neutral-200 dark:border-neutral-800 cursor-not-allowed text-neutral-400"
                  : "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/70 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              Tất cả ({availableCount})
            </button>
          </div>

          {/* Custom count range and number input */}
          <div className="flex items-center gap-4 mt-2">
            <input
              type="range"
              min={1}
              max={Math.max(1, availableCount)}
              value={selectedCount}
              disabled={availableCount === 0}
              onChange={handleCountChange}
              className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-white disabled:opacity-30"
            />
            <div className="flex items-center gap-1.5 min-w-[70px]">
              <input
                type="number"
                min={1}
                max={Math.max(1, availableCount)}
                value={selectedCount}
                disabled={availableCount === 0}
                onChange={handleCountChange}
                className="w-16 px-2.5 py-1.5 text-center text-sm font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-30"
              />
              <span className="text-xs text-neutral-400 font-medium">từ</span>
            </div>
          </div>
        </div>

        {/* ─── 3. SELECT MODE ─── */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
            3. Chọn hình thức kiểm tra
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mode Quiz */}
            <button
              type="button"
              onClick={() => setSelectedMode("quiz")}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.99] ${
                selectedMode === "quiz"
                  ? "border-neutral-900 dark:border-white bg-neutral-900/5 dark:bg-white/5 ring-1 ring-neutral-900 dark:ring-white"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850 hover:bg-neutral-100/70 dark:hover:bg-neutral-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  <HelpCircle className="w-5 h-5" />
                </div>
                {selectedMode === "quiz" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">
                  Trắc nghiệm (Quiz)
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  Chọn đáp án đúng từ 4 lựa chọn ngẫu nhiên. Hỗ trợ phím tắt 1, 2, 3, 4.
                </p>
              </div>
            </button>

            {/* Mode Practice */}
            <button
              type="button"
              onClick={() => setSelectedMode("practice")}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.99] ${
                selectedMode === "practice"
                  ? "border-neutral-900 dark:border-white bg-neutral-900/5 dark:bg-white/5 ring-1 ring-neutral-900 dark:ring-white"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850 hover:bg-neutral-100/70 dark:hover:bg-neutral-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  <Layers className="w-5 h-5" />
                </div>
                {selectedMode === "practice" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">
                  Luyện tập (Practice)
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  Học theo dạng flashcard lật mặt với phát âm âm thanh và phím tắt A, D, Space.
                </p>
              </div>
            </button>

            {/* Mode Hardcore */}
            <button
              type="button"
              onClick={() => setSelectedMode("hardcore")}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.99] sm:col-span-2 ${
                selectedMode === "hardcore"
                  ? "border-rose-500 dark:border-rose-400 bg-rose-500/5 dark:bg-rose-500/10 ring-1 ring-rose-500 dark:ring-rose-400"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850 hover:bg-neutral-100/70 dark:hover:bg-neutral-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <Flame className="w-5 h-5" />
                </div>
                {selectedMode === "hardcore" && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold tracking-wider uppercase shadow-sm">
                    HARDCORE 🔥
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base flex items-center gap-1.5">
                  <span>Chế độ Hardcore</span>
                  <span>🔥</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  <strong>6 lựa chọn</strong> từ vựng • Bắt buộc chọn đúng cả <strong>Từ vựng</strong> và <strong>Từ loại</strong> (n, v, adj, adv) • Giới hạn <strong>15 giây</strong> mỗi câu (quá giờ bị tính miss).
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Start Button */}
        <button
          type="button"
          disabled={availableCount === 0}
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold text-base transition-all active:scale-[0.98] shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed mt-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>
            {availableCount === 0
              ? "Vui lòng chọn ngày có từ vựng"
              : `Bắt đầu kiểm tra (${selectedCount} từ)`}
          </span>
        </button>
      </div>
    </div>
  );
};
