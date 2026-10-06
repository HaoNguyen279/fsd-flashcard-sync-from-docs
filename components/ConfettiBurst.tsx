"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = [
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#facc15", // yellow
];

interface ConfettiBurstProps {
  /** Number of particles (keep small for a subtle effect) */
  count?: number;
}

/**
 * A small, self-contained confetti burst that explodes outward from the
 * center of its (relatively positioned) parent. Re-mount it (via `key`) to replay.
 */
export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({ count = 18 }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
        const distance = 45 + Math.random() * 55;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          // bias upward a little, then gravity pulls down at the end
          y: Math.sin(angle) * distance * 0.7 - 15,
          rotate: (Math.random() - 0.5) * 540,
          color: COLORS[i % COLORS.length],
          size: 5 + Math.random() * 4,
          isCircle: Math.random() > 0.55,
          delay: Math.random() * 0.05,
        };
      }),
    [count]
  );

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center z-20"
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute"
          style={{
            width: p.size,
            height: p.isCircle ? p.size : p.size * 0.5,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? "9999px" : "2px",
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
          animate={{
            x: [0, p.x, p.x * 1.05],
            y: [0, p.y, p.y + 30],
            opacity: [1, 1, 0],
            scale: [0.6, 1, 0.8],
            rotate: p.rotate,
          }}
          transition={{
            duration: 0.85,
            delay: p.delay,
            ease: "easeOut",
            times: [0, 0.45, 1],
          }}
        />
      ))}
    </span>
  );
};
