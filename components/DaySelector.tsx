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
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center gap-2 mb-2 px-1 text-xs font-semibold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
        <Calendar className="w-3.5 h-3.5" />
        <span>Select Date</span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
        {days.map((day) => {
          const isSelected = day === selectedDay;
          const count = dayCounts[day];

          return (
            <button
              key={day}
              onClick={() => onSelectDay(day)}
              className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${
                isSelected
                  ? "text-white dark:text-neutral-950 font-semibold"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 bg-neutral-100 hover:bg-neutral-200/70 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeDayBadge"
                  className="absolute inset-0 bg-neutral-900 dark:bg-white rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
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
  );
};
