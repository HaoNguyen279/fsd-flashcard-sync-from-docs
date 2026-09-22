"use client";

import React from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

interface DaySelectorProps {
  days: string[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
  dayCounts?: Record<string, number>;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
  days,
  selectedDay,
  onSelectDay,
  dayCounts = {},
}) => {
  if (!days || days.length === 0) {
    return null;
  }

  return (
    <>
      {/* DESKTOP SIDEBAR: Pinned to the far left on PC */}
      <aside className="hidden lg:flex flex-col lg:fixed lg:left-4 xl:left-8 lg:top-24 lg:w-56 xl:w-64 z-20">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 p-4 shadow-card flex flex-col gap-3 max-h-[calc(100vh-140px)]">
          {/* Header */}
          <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
              <Calendar className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              <span>Chọn Ngày</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {days.length} ngày
            </span>
          </div>

          {/* Vertical Dates List */}
          <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
            {days.map((day) => {
              const isSelected = day === selectedDay;
              const count = dayCounts[day];

              return (
                <button
                  key={day}
                  onClick={() => onSelectDay(day)}
                  className={`group relative flex items-center justify-between w-full px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all text-left ${
                    isSelected
                      ? "text-white dark:text-neutral-950 font-semibold shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/70"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeDaySidebar"
                      className="absolute inset-0 bg-neutral-900 dark:bg-white rounded-2xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                    />
                  )}

                  <span className="relative z-10 flex items-center gap-2">
                    <span className="text-sm">{day}</span>
                  </span>

                  {count !== undefined && (
                    <span
                      className={`relative z-10 text-xs px-2 py-0.5 rounded-full transition-colors ${
                        isSelected
                          ? "bg-neutral-800 dark:bg-neutral-200 text-neutral-200 dark:text-neutral-900 font-semibold"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 group-hover:bg-neutral-200/70 dark:group-hover:bg-neutral-700"
                      }`}
                    >
                      {count} từ
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* MOBILE / TABLET HORIZONTAL SELECTOR (Top of content on smaller screens) */}
      <div className="lg:hidden w-full max-w-xl mx-auto mb-6">
        <div className="flex items-center gap-2 mb-2 px-1 text-xs font-semibold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
          <Calendar className="w-3.5 h-3.5" />
          <span>Chọn ngày học ({days.length})</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
          {days.map((day) => {
            const isSelected = day === selectedDay;
            const count = dayCounts[day];

            return (
              <button
                key={day}
                onClick={() => onSelectDay(day)}
                className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap focus:outline-none ${
                  isSelected
                    ? "text-white dark:text-neutral-950 font-semibold"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 bg-neutral-100 hover:bg-neutral-200/70 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeDayMobile"
                    className="absolute inset-0 bg-neutral-900 dark:bg-white rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span>{day}</span>
                  {count !== undefined && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-neutral-800 dark:bg-neutral-200 text-neutral-300 dark:text-neutral-900"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
