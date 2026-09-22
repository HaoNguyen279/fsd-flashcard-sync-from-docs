"use client";

import React from "react";
import { motion } from "framer-motion";

interface ProgressBarProps {
  current: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs font-medium text-neutral-500 dark:text-neutral-400 px-1">
        <span>
          Progress: <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">{current}</strong> / {total}
        </span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-200/60 dark:border-neutral-700/60">
        <motion.div
          className="h-full bg-neutral-900 dark:bg-white rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 25 }}
        />
      </div>
    </div>
  );
};
