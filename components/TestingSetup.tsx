"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Layers, HelpCircle, Sparkles } from "lucide-react";

export type TestMode = "practice" | "quiz";

export interface TestConfig {
  count: number;
  mode: TestMode;
}

interface TestingSetupProps {
  totalCount: number;
  onStart: (config: TestConfig) => void;
  onBack: () => void;
}

const PRESET_COUNTS = [5, 10, 15, 20];

export const TestingSetup: React.FC<TestingSetupProps> = ({
  totalCount,
  onStart,
  onBack,
}) => {
  const initialCount = Math.min(10, Math.max(1, totalCount));
  const [selectedCount, setSelectedCount] = useState<number>(initialCount);
  const [selectedMode, setSelectedMode] = useState<TestMode>("quiz");

  const handlePresetClick = (preset: number) => {
    setSelectedCount(Math.min(preset, totalCount));
  };

  const handleAllClick = () => {
    setSelectedCount(totalCount);
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setSelectedCount(1);
    } else {
      setSelectedCount(Math.max(1, Math.min(val, totalCount)));
    }
  };

  const handleStart = () => {
    onStart({
      count: selectedCount,
      mode: selectedMode,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto flex flex-col gap-6"
    >
      {/* Top Header with Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-medium transition-all active:scale-95 shadow-subtle"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại trang chính</span>
        </button>

        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Tổng cộng: {totalCount} từ vựng
        </span>
      </div>

      {/* Main Setup Card */}
      <div className="w-full bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 shadow-card p-6 sm:p-8 flex flex-col gap-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Cấu hình kiểm tra</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Kiểm Tra Từ Vựng Ngẫu Nhiên
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Chọn số lượng từ và hình thức kiểm tra bạn muốn luyện tập hôm nay.
          </p>
        </div>

        {/* 1. Select Number of Words */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
            1. Chọn số lượng từ cần test (1 - {totalCount})
          </label>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COUNTS.map((preset) => {
              const disabled = preset > totalCount;
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
              onClick={handleAllClick}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                selectedCount === totalCount
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm"
                  : "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/70 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              Tất cả ({totalCount})
            </button>
          </div>

          {/* Custom count range and number input */}
          <div className="flex items-center gap-4 mt-2">
            <input
              type="range"
              min={1}
              max={totalCount}
              value={selectedCount}
              onChange={handleCountChange}
              className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-white"
            />
            <div className="flex items-center gap-1.5 min-w-[70px]">
              <input
                type="number"
                min={1}
                max={totalCount}
                value={selectedCount}
                onChange={handleCountChange}
                className="w-16 px-2.5 py-1.5 text-center text-sm font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
              <span className="text-xs text-neutral-400 font-medium">từ</span>
            </div>
          </div>
        </div>

        {/* 2. Select Mode */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
            2. Chọn hình thức kiểm tra
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
          </div>
        </div>

        {/* Start Button */}
        <button
          type="button"
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold text-base transition-all active:scale-[0.98] shadow-md hover:shadow-lg mt-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Bắt đầu kiểm tra ({selectedCount} từ)</span>
        </button>
      </div>
    </motion.div>
  );
};
