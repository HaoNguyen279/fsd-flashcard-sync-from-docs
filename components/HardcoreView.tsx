"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Flame,
  Clock,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trophy,
  Volume2,
  Zap,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VocabularyItem } from "@/lib/types";

export interface HardcoreViewProps {
  items: VocabularyItem[];
  allItems: VocabularyItem[];
  onBack: () => void;
  onRetry: () => void;
}

export type PosOptionId = "n" | "v" | "adj" | "adv" | "none";

export const POS_OPTIONS: { id: PosOptionId; label: string; tag: string }[] = [
  { id: "n", label: "Danh từ", tag: "(n)" },
  { id: "v", label: "Động từ", tag: "(v)" },
  { id: "adj", label: "Tính từ", tag: "(adj)" },
  { id: "adv", label: "Trạng từ", tag: "(adv)" },
  { id: "none", label: "Không có", tag: "(Không có)" },
];

const QUESTION_TIME_LIMIT = 15; // 15 seconds per question

/**
 * Extracts target parts of speech for a word.
 * Returns a tuple of 2 elements, e.g. ["v", "n"], ["adj", "none"], or ["none", "none"].
 */
export function getTargetPosPair(item: VocabularyItem): [PosOptionId, PosOptionId] {
  const text = `${item.partOfSpeech || ""} ${item.rawWord || ""}`.toLowerCase();
  const set = new Set<PosOptionId>();

  // Check for combined patterns like (v/n), (n/v), (v, n), etc.
  if (/\b(v\/n|n\/v|v\s*,\s*n|n\s*,\s*v)\b/i.test(text)) {
    set.add("v");
    set.add("n");
  }
  if (/\b(adj\/adv|adv\/adj)\b/i.test(text)) {
    set.add("adj");
    set.add("adv");
  }

  // Check standalone tokens
  if (/\b(adj|tính từ)\b/i.test(text)) set.add("adj");
  if (/\b(adv|trạng từ)\b/i.test(text)) set.add("adv");
  if (/\b(v|vi|vt|động từ)\b/i.test(text)) set.add("v");
  if (/\b(n|danh từ)\b/i.test(text)) set.add("n");

  const list = Array.from(set);

  if (list.length >= 2) {
    return [list[0], list[1]];
  }
  if (list.length === 1) {
    return [list[0], "none"];
  }

  // Fallback heuristic if Docs had no parenthesized POS tag
  const word = item.word.toLowerCase();
  if (word.endsWith("ly")) return ["adv", "none"];
  if (/(tion|sion|ment|ness|ity|ance|ence|ship|er|or)$/.test(word)) return ["n", "none"];
  if (/(able|ible|ive|ous|ful|less|al|ic|ish)$/.test(word)) return ["adj", "none"];

  return ["none", "none"];
}

/**
 * Checks if user's pair of POS selections matches the target pair, ignoring order.
 */
export function arePosSelectionsEqual(
  user: [PosOptionId, PosOptionId],
  target: [PosOptionId, PosOptionId]
): boolean {
  return (
    (user[0] === target[0] && user[1] === target[1]) ||
    (user[0] === target[1] && user[1] === target[0])
  );
}

/**
 * Formats target POS for readable display in feedback
 */
function getTargetDisplayPosText(targetPair: [PosOptionId, PosOptionId]): string {
  const labels: Record<PosOptionId, string> = {
    n: "(n) Danh từ",
    v: "(v) Động từ",
    adj: "(adj) Tính từ",
    adv: "(adv) Trạng từ",
    none: "(Không có)",
  };

  if (targetPair[0] === "none" && targetPair[1] === "none") {
    return "(Không có từ loại)";
  }
  if (targetPair[1] === "none") {
    return labels[targetPair[0]];
  }
  return `${labels[targetPair[0]]} và ${labels[targetPair[1]]}`;
}

/**
 * In Hardcore mode, removes Part of Speech tags (e.g. (v), (n), (adj), (adv), (v/n), v., n:)
 * and any notes / ghi chú annotations from the Vietnamese meaning prompt so it doesn't give away the POS answer.
 */
export function cleanMeaningForHardcore(rawMeaning: string): string {
  if (!rawMeaning) return "";

  let text = rawMeaning;

  // 1. Remove parenthesized or bracketed parts of speech:
  // e.g. (n), (v), (adj), (adv), (prep), (conj), (pron), (v/n), (n/v), (adj/n), (adj/adv), (v, n), etc.
  text = text.replace(
    /[\(\[]\s*(?:(?:v|n|adj|adv|prep|conj|pron|interj|num|art|det|phrase|idiom|collocation|slang)\.?)(?:\s*[/,&+-]\s*(?:v|n|adj|adv|prep|conj|pron|interj|num|art|det|phrase|idiom|collocation|slang)\.?)*\s*[\)\]][:;,-]?/gi,
    " "
  );

  // 2. Remove parenthesized or bracketed notes like (ghi chú: ...), (ghi: ...), (lưu ý: ...), (note: ...)
  text = text.replace(
    /[\(\[]\s*(?:ghi\s*chú|ghi|lưu\s*ý|note)(?:\s*[:\-]|[\s\S]*?)[\)\]]/gi,
    " "
  );

  // 3. Remove leading prefix part-of-speech or notes like "v. ", "n: ", "adj. ", "v/n: ", "ghi chú: "
  text = text.replace(
    /^(?:(?:v|n|adj|adv|prep|conj|pron|v\/n|n\/v|adj\/n|adj\/adv)\.?|(?:ghi\s*chú|lưu\s*ý|note))\s*[:.\-]\s*/i,
    " "
  );

  // 4. Remove trailing note clauses like "ghi chú: ...", "lưu ý: ..."
  text = text.replace(
    /\s*[:;,-]?\s*(?:ghi\s*chú|lưu\s*ý|note)\s*[:\-].*$/i,
    " "
  );

  // 5. Clean up extra punctuation at boundaries and duplicate whitespace
  text = text.replace(/^[\s:;,\-\.\/]+/, "");
  text = text.replace(/[\s:;,\-\/]+$/, "");
  text = text.replace(/\s{2,}/g, " ").trim();

  return text || rawMeaning.trim();
}

interface QuestionResult {
  target: VocabularyItem;
  targetPosPair: [PosOptionId, PosOptionId];
  userWord: string | null;
  userRow1Pos: PosOptionId | null;
  userRow2Pos: PosOptionId | null;
  isWordCorrect: boolean;
  isPosCorrect: boolean;
  isPerfect: boolean;
  isTimeout: boolean;
}

export const HardcoreView: React.FC<HardcoreViewProps> = ({
  items,
  allItems,
  onBack,
  onRetry,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [row1Pos, setRow1Pos] = useState<PosOptionId | null>(null);
  const [row2Pos, setRow2Pos] = useState<PosOptionId | null>(null);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentItem = items[currentIndex];
  const targetPosPair = useMemo<[PosOptionId, PosOptionId]>(() => {
    if (!currentItem) return ["none", "none"];
    return getTargetPosPair(currentItem);
  }, [currentItem]);

  // Generate 6 options for the current question
  const currentOptions = useMemo(() => {
    if (!currentItem) return [];
    const distractors = allItems
      .filter((w) => w.word.toLowerCase() !== currentItem.word.toLowerCase())
      .map((w) => w.word);

    const shuffledDistractors = [...Array.from(new Set(distractors))].sort(
      () => Math.random() - 0.5
    );
    const chosenDistractors = shuffledDistractors.slice(0, 5);
    const combined = [currentItem.word, ...chosenDistractors];
    return combined.sort(() => Math.random() - 0.5);
  }, [currentItem, allItems]);

  // Audio pronunciation helper
  const speakWord = useCallback((word: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Move to next question or complete
  const handleNextQuestion = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedWord(null);
      setRow1Pos(null);
      setRow2Pos(null);
      setIsEvaluated(false);
      setTimeLeft(QUESTION_TIME_LIMIT);
    } else {
      setIsCompleted(true);
    }
  }, [currentIndex, items.length]);

  // Evaluate answer
  const evaluateAnswer = useCallback(
    (
      wordChoice: string | null,
      r1Pos: PosOptionId | null,
      r2Pos: PosOptionId | null,
      isTimeout: boolean
    ) => {
      if (isEvaluated) return;
      setIsEvaluated(true);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const isWordCorrect =
        !isTimeout &&
        wordChoice !== null &&
        wordChoice.toLowerCase() === currentItem.word.toLowerCase();

      const isPosCorrect =
        !isTimeout &&
        r1Pos !== null &&
        r2Pos !== null &&
        arePosSelectionsEqual([r1Pos, r2Pos], targetPosPair);

      const isPerfect = isWordCorrect && isPosCorrect;

      if (isPerfect) {
        setStreak((s) => {
          const next = s + 1;
          setMaxStreak((m) => Math.max(m, next));
          return next;
        });
      } else {
        setStreak(0);
      }

      speakWord(currentItem.word);

      const result: QuestionResult = {
        target: currentItem,
        targetPosPair,
        userWord: wordChoice,
        userRow1Pos: r1Pos,
        userRow2Pos: r2Pos,
        isWordCorrect,
        isPosCorrect,
        isPerfect,
        isTimeout,
      };

      setResults((prev) => [...prev, result]);
    },
    [isEvaluated, currentItem, targetPosPair, speakWord]
  );

  // Timer countdown effect
  useEffect(() => {
    if (isCompleted || isEvaluated) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          evaluateAnswer(selectedWord, row1Pos, row2Pos, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentIndex, isCompleted, isEvaluated, selectedWord, row1Pos, row2Pos, evaluateAnswer]);

  // Handle selecting word
  const handleSelectWord = (word: string) => {
    if (isEvaluated) return;
    setSelectedWord(word);

    // If both POS rows are already selected, evaluate immediately!
    if (row1Pos !== null && row2Pos !== null) {
      evaluateAnswer(word, row1Pos, row2Pos, false);
    }
  };

  // Handle selecting Row 1 POS
  const handleSelectRow1 = (pos: PosOptionId) => {
    if (isEvaluated) return;
    setRow1Pos(pos);

    // If Word and Row 2 POS are already selected, evaluate immediately!
    if (selectedWord !== null && row2Pos !== null) {
      evaluateAnswer(selectedWord, pos, row2Pos, false);
    }
  };

  // Handle selecting Row 2 POS
  const handleSelectRow2 = (pos: PosOptionId) => {
    if (isEvaluated) return;
    setRow2Pos(pos);

    // If Word and Row 1 POS are already selected, evaluate immediately!
    if (selectedWord !== null && row1Pos !== null) {
      evaluateAnswer(selectedWord, row1Pos, pos, false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (isCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If already evaluated, Enter or Space advances to next question
      if (isEvaluated) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNextQuestion();
        }
        return;
      }

      const key = e.key.toLowerCase();

      // Number keys 1-6 for word options
      const num = parseInt(key, 10);
      if (!isNaN(num) && num >= 1 && num <= currentOptions.length) {
        e.preventDefault();
        handleSelectWord(currentOptions[num - 1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEvaluated, isCompleted, currentOptions, handleSelectWord, handleNextQuestion]);

  // Restart hardcore test
  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedWord(null);
    setRow1Pos(null);
    setRow2Pos(null);
    setIsEvaluated(false);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setResults([]);
    setIsCompleted(false);
    setStreak(0);
    setMaxStreak(0);
    onRetry();
  };

  // Compute final score
  const perfectCount = results.filter((r) => r.isPerfect).length;
  const timeoutCount = results.filter((r) => r.isTimeout).length;
  const partialCount = results.filter(
    (r) => !r.isPerfect && !r.isTimeout && (r.isWordCorrect || r.isPosCorrect)
  ).length;
  const wrongCount = results.filter(
    (r) => !r.isPerfect && !r.isTimeout && !r.isWordCorrect && !r.isPosCorrect
  ).length;

  const scorePercentage = Math.round((perfectCount / items.length) * 100);

  // Timer color classes
  const timerColor =
    timeLeft > 7
      ? "text-emerald-500 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
      : timeLeft > 3
      ? "text-amber-500 border-amber-500 bg-amber-50 dark:bg-amber-950/40"
      : "text-rose-500 border-rose-500 bg-rose-50 dark:bg-rose-950/40 animate-pulse";

  const timerProgress = (timeLeft / QUESTION_TIME_LIMIT) * 100;

  // Resolve which target belongs to Row 1 and which to Row 2 for clear, bug-free highlighting
  const { row1Target, row2Target } = useMemo(() => {
    const [tA, tB] = targetPosPair;
    if (row1Pos === tA && row2Pos === tB) return { row1Target: tA, row2Target: tB };
    if (row1Pos === tB && row2Pos === tA) return { row1Target: tB, row2Target: tA };
    if (row1Pos === tA) return { row1Target: tA, row2Target: tB };
    if (row1Pos === tB) return { row1Target: tB, row2Target: tA };
    if (row2Pos === tB) return { row1Target: tA, row2Target: tB };
    if (row2Pos === tA) return { row1Target: tB, row2Target: tA };
    return { row1Target: tA, row2Target: tB };
  }, [targetPosPair, row1Pos, row2Pos]);

  // ──────────────────────────── RESULTS SCREEN ────────────────────────────
  if (isCompleted) {
    return (
      <div className="w-full max-w-xl mx-auto flex flex-col gap-6 py-2">
        <div className="w-full bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 shadow-card p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mb-4 shadow-sm">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-2">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Kết Quả Hardcore</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
            {perfectCount} / {items.length}
          </h2>

          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1">
            Độ chính xác hoàn hảo: <strong className="text-rose-500">{scorePercentage}%</strong>
            {maxStreak > 1 && ` • Chuỗi liên tiếp: ${maxStreak} 🔥`}
          </p>

          {/* Stats breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full mt-6">
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900 text-center">
              <span className="block text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {perfectCount}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                Hoàn hảo
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900 text-center">
              <span className="block text-xl font-bold text-amber-600 dark:text-amber-400">
                {partialCount}
              </span>
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                Đúng 1 phần
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900 text-center">
              <span className="block text-xl font-bold text-rose-600 dark:text-rose-400">
                {timeoutCount}
              </span>
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                Hết giờ (Miss)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-center">
              <span className="block text-xl font-bold text-neutral-600 dark:text-neutral-400">
                {wrongCount}
              </span>
              <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                Sai cả hai
              </span>
            </div>
          </div>

          {/* Detailed Question Review List */}
          <div className="w-full mt-6 text-left">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Chi tiết câu hỏi:
            </h4>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-60 overflow-y-auto pr-1">
              {results.map((r, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {r.target.word}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                        {getTargetDisplayPosText(r.targetPosPair)}
                      </span>
                      <span className="text-neutral-400 truncate max-w-[200px]">
                        — {cleanMeaningForHardcore(r.target.meaning)}
                      </span>
                    </div>
                    {r.isTimeout ? (
                      <span className="text-[11px] text-rose-500 font-medium">
                        ⏰ Quá 15s (Bị miss)
                      </span>
                    ) : !r.isPerfect ? (
                      <span className="text-[11px] text-neutral-400">
                        Bạn chọn: {r.userWord || "Chưa chọn"} [
                        {r.userRow1Pos ? `(${r.userRow1Pos})` : "trống"},{" "}
                        {r.userRow2Pos ? `(${r.userRow2Pos})` : "trống"}]
                      </span>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    {r.isPerfect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full mt-6">
            <button
              onClick={handleRestart}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm transition-all active:scale-95 shadow-md"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Chơi lại Hardcore</span>
            </button>
            <button
              onClick={onBack}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-semibold text-sm transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────── IN-GAME SCREEN ────────────────────────────
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-medium transition-all active:scale-95 shadow-subtle"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Thoát</span>
        </button>

        <div className="flex items-center gap-2">
          {streak > 1 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200/60 dark:border-amber-900">
              <Zap className="w-3 h-3 fill-current" />
              <span>{streak} Streak!</span>
            </span>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>HARDCORE</span>
          </div>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="w-full bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 shadow-card p-5 sm:p-7 flex flex-col gap-5 relative overflow-hidden">
        {/* Top Progress & Countdown Bar */}
        <div className="w-full">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-400 mb-2">
            <span>
              Câu <strong className="text-neutral-800 dark:text-neutral-200">{currentIndex + 1}</strong> / {items.length}
            </span>
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono font-bold text-xs ${timerColor}`}>
              <Clock className="w-3 h-3" />
              <span>{timeLeft}s</span>
            </div>
          </div>

          {/* Time progress bar */}
          <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full transition-all duration-300 ${
                timeLeft > 7
                  ? "bg-emerald-500"
                  : timeLeft > 3
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${timerProgress}%` }}
            />
          </div>
        </div>

        {/* Vietnamese Meaning Prompt */}
        <div className="py-2 text-center flex flex-col items-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-1">
            Nghĩa tiếng Việt
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
            {cleanMeaningForHardcore(currentItem.meaning)}
          </h3>
        </div>

        {/* ─── STEP 1: CHỌN TỪ TIẾNG ANH (6 OPTIONS) ─── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              1. Chọn từ tiếng Anh (6 lựa chọn)
            </span>
            {selectedWord && (
              <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                Đã chọn: <code className="text-neutral-900 dark:text-neutral-100 font-bold">{selectedWord}</code>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currentOptions.map((word, idx) => {
              const isSelected = selectedWord === word;
              const isCorrectTarget =
                word.toLowerCase() === currentItem.word.toLowerCase();

              let buttonStyle =
                "bg-neutral-50 dark:bg-neutral-850 border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800";

              if (isEvaluated) {
                if (isCorrectTarget) {
                  buttonStyle =
                    "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/40";
                } else if (isSelected && !isCorrectTarget) {
                  buttonStyle =
                    "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200 font-bold ring-2 ring-rose-500/40 line-through";
                } else {
                  buttonStyle = "opacity-40 border-neutral-200 dark:border-neutral-800";
                }
              } else if (isSelected) {
                buttonStyle =
                  "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm ring-2 ring-neutral-400";
              }

              return (
                <button
                  key={`${word}-${idx}`}
                  type="button"
                  disabled={isEvaluated}
                  onClick={() => handleSelectWord(word)}
                  className={`p-3 min-h-[52px] rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.98] ${buttonStyle}`}
                >
                  <span className="font-semibold text-xs sm:text-sm line-clamp-2 leading-tight break-words mr-1">{word}</span>
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 shrink-0">
                    {idx + 1}
                  </kbd>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── STEP 2: CHỌN TỪ LOẠI (2 HÀNG LỰA CHỌN) ─── */}
        <div className="flex flex-col gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              2. Chọn từ loại (chọn đủ cả 2 loại nếu có)
            </span>
            <span className="text-[10px] text-neutral-400">
              {row1Pos && row2Pos ? "Đã chọn đủ 2 hàng ✓" : "Cần chọn cả 2 hàng"}
            </span>
          </div>

          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed -mt-1">
            • Từ có 2 từ loại: chọn cả 2 • Từ có 1 từ loại: chọn từ loại đó và (Không có) • Không phân biệt thứ tự hàng
          </p>

          {/* HÀNG 1 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                Từ loại 1:
              </span>
              {row1Pos && (
                <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                  Đã chọn: <code className="text-neutral-900 dark:text-neutral-100 font-bold">{POS_OPTIONS.find((p) => p.id === row1Pos)?.tag}</code>
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {POS_OPTIONS.map((pos) => {
                const isSelected = row1Pos === pos.id;
                const isCorrect = row1Target === pos.id;

                let posStyle =
                  "bg-neutral-50 dark:bg-neutral-850 border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800";

                if (isEvaluated) {
                  if (isCorrect) {
                    posStyle =
                      "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/40";
                  } else if (isSelected && !isCorrect) {
                    posStyle =
                      "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200 font-bold ring-2 ring-rose-500/40 line-through";
                  } else {
                    posStyle = "opacity-35 border-neutral-200 dark:border-neutral-800";
                  }
                } else if (isSelected) {
                  posStyle =
                    "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm ring-2 ring-neutral-400";
                }

                return (
                  <button
                    key={`r1-${pos.id}`}
                    type="button"
                    disabled={isEvaluated}
                    onClick={() => handleSelectRow1(pos.id)}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center text-center transition-all active:scale-[0.97] ${posStyle}`}
                  >
                    <span className="font-bold text-xs truncate max-w-full">{pos.tag}</span>
                    <span
                      className={`text-[10px] truncate max-w-full ${
                        isSelected && !isEvaluated
                          ? "text-neutral-300 dark:text-neutral-600 font-medium"
                          : "text-neutral-500 dark:text-neutral-400"
                      }`}
                    >
                      {pos.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* HÀNG 2 */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                Từ loại 2 (option):
              </span>
              {row2Pos && (
                <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                  Đã chọn: <code className="text-neutral-900 dark:text-neutral-100 font-bold">{POS_OPTIONS.find((p) => p.id === row2Pos)?.tag}</code>
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {POS_OPTIONS.map((pos) => {
                const isSelected = row2Pos === pos.id;
                const isCorrect = row2Target === pos.id;

                let posStyle =
                  "bg-neutral-50 dark:bg-neutral-850 border-neutral-200/80 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800";

                if (isEvaluated) {
                  if (isCorrect) {
                    posStyle =
                      "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/40";
                  } else if (isSelected && !isCorrect) {
                    posStyle =
                      "bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200 font-bold ring-2 ring-rose-500/40 line-through";
                  } else {
                    posStyle = "opacity-35 border-neutral-200 dark:border-neutral-800";
                  }
                } else if (isSelected) {
                  posStyle =
                    "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm ring-2 ring-neutral-400";
                }

                return (
                  <button
                    key={`r2-${pos.id}`}
                    type="button"
                    disabled={isEvaluated}
                    onClick={() => handleSelectRow2(pos.id)}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center text-center transition-all active:scale-[0.97] ${posStyle}`}
                  >
                    <span className="font-bold text-xs truncate max-w-full">{pos.tag}</span>
                    <span
                      className={`text-[10px] truncate max-w-full ${
                        isSelected && !isEvaluated
                          ? "text-neutral-300 dark:text-neutral-600 font-medium"
                          : "text-neutral-500 dark:text-neutral-400"
                      }`}
                    >
                      {pos.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── EVALUATION FEEDBACK BANNER ─── */}
        <AnimatePresence>
          {isEvaluated && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="mt-1"
            >
              {timeLeft === 0 && !selectedWord ? (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <div className="flex-1">
                    <p className="font-bold">Hết giờ! (Missed)</p>
                    <p className="text-[11px] text-neutral-500">
                      Đáp án đúng: <strong>{currentItem.word}</strong> • Từ loại:{" "}
                      <strong>{getTargetDisplayPosText(targetPosPair)}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => speakWord(currentItem.word)}
                    className="p-1 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900"
                    title="Phát âm"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : selectedWord?.toLowerCase() === currentItem.word.toLowerCase() &&
                row1Pos !== null &&
                row2Pos !== null &&
                arePosSelectionsEqual([row1Pos, row2Pos], targetPosPair) ? (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <div className="flex-1">
                    <p className="font-bold">Chính xác hoàn hảo! (+1 điểm)</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      {currentItem.word} • Từ loại: {getTargetDisplayPosText(targetPosPair)} • {currentItem.pronunciation}
                    </p>
                  </div>
                  <button
                    onClick={() => speakWord(currentItem.word)}
                    className="p-1 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900"
                    title="Phát âm"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs">
                  <XCircle className="w-4 h-4 shrink-0 text-amber-500" />
                  <div className="flex-1">
                    <p className="font-bold">
                      {selectedWord?.toLowerCase() !== currentItem.word.toLowerCase() &&
                      (!row1Pos ||
                        !row2Pos ||
                        !arePosSelectionsEqual([row1Pos, row2Pos], targetPosPair))
                        ? "Chưa chính xác cả hai!"
                        : selectedWord?.toLowerCase() !== currentItem.word.toLowerCase()
                        ? "Sai từ vựng!"
                        : "Sai từ loại!"}
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      Đáp án đúng: <strong>{currentItem.word}</strong> • Từ loại:{" "}
                      <strong>{getTargetDisplayPosText(targetPosPair)}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => speakWord(currentItem.word)}
                    className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900"
                    title="Phát âm"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Next Question Button */}
              <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <span className="hidden sm:inline text-xs text-neutral-400">
                  Nhấn <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded font-mono font-semibold text-neutral-700 dark:text-neutral-300">Enter</kbd> hoặc <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded font-mono font-semibold text-neutral-700 dark:text-neutral-300">Space</kbd> để tiếp tục
                </span>

                <button
                  type="button"
                  onClick={() => handleNextQuestion()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-semibold text-sm transition-all active:scale-95 shadow-md ml-auto"
                >
                  <span>
                    {currentIndex < items.length - 1 ? "Câu tiếp theo" : "Xem kết quả Hardcore"}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
