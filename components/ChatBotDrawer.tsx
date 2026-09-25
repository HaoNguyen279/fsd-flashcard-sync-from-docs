"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Loader2,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { VocabularyItem } from "@/lib/types";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatBotDrawerProps {
  activeItem: VocabularyItem | null;
}

export const ChatBotDrawer: React.FC<ChatBotDrawerProps> = ({ activeItem }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Conversations are stored strictly in memory (reset on page reload)
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Draggable AI button (AssistiveTouch-style) ───
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const [snappedEdge, setSnappedEdge] = useState<"left" | "right">("right");
  const [isPositioned, setIsPositioned] = useState(false);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const isDragging = useRef(false);

  // Initialize button position from localStorage or default to top-right corner
  useEffect(() => {
    // Clear legacy storage key if exists
    localStorage.removeItem("ai_btn_pos");

    const defaultY = window.innerWidth >= 640 ? 84 : 76;
    const estimatedBtnW = window.innerWidth >= 640 ? 115 : 44;

    const saved = localStorage.getItem("ai_btn_pos_v2");
    if (saved) {
      try {
        const { y: sy, edge } = JSON.parse(saved);
        const validEdge = edge === "left" ? "left" : "right";
        setSnappedEdge(validEdge);

        const clampedY =
          typeof sy === "number" && !isNaN(sy)
            ? Math.max(16, Math.min(window.innerHeight - 60, sy))
            : defaultY;

        dragY.set(clampedY);
        dragX.set(validEdge === "right" ? window.innerWidth - estimatedBtnW : 0);
      } catch {
        setSnappedEdge("right");
        dragY.set(defaultY);
        dragX.set(window.innerWidth - estimatedBtnW);
      }
    } else {
      setSnappedEdge("right");
      dragY.set(defaultY);
      dragX.set(window.innerWidth - estimatedBtnW);
    }
  }, [dragX, dragY]);

  // Calibrate exact position against edge once element is mounted and measured
  useEffect(() => {
    if (!buttonRef.current) return;
    const btn = buttonRef.current;
    const btnW = btn.offsetWidth;

    if (snappedEdge === "right") {
      dragX.set(window.innerWidth - btnW);
    } else {
      dragX.set(0);
    }
    setIsPositioned(true);
  }, [snappedEdge, dragX]);

  // Re-clamp position when the viewport is resized
  useEffect(() => {
    const handleResize = () => {
      const btn = buttonRef.current;
      if (!btn || isOpen) return;
      const w = btn.offsetWidth;
      const h = btn.offsetHeight;

      if (snappedEdge === "right") {
        dragX.set(window.innerWidth - w);
      } else {
        dragX.set(0);
      }

      const maxY = window.innerHeight - h - 16;
      if (dragY.get() > maxY) dragY.set(maxY);
      if (dragY.get() < 16) dragY.set(16);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, dragX, dragY, snappedEdge]);

  // Snap to nearest horizontal edge on drag end (iPhone AssistiveTouch style)
  const handleDragEnd = () => {
    setIsDraggingActive(false);
    const btn = buttonRef.current;
    if (!btn) return;
    const btnW = btn.offsetWidth;
    const btnH = btn.offsetHeight;
    const currentX = dragX.get();
    const currentY = dragY.get();

    const centerX = currentX + btnW / 2;
    const snapRight = centerX > window.innerWidth / 2;
    const targetX = snapRight ? window.innerWidth - btnW : 0;
    const clampedY = Math.max(
      16,
      Math.min(window.innerHeight - btnH - 16, currentY)
    );
    const edge = snapRight ? "right" : "left";

    setSnappedEdge(edge);
    animate(dragX, targetX, { type: "spring", stiffness: 300, damping: 30 });
    animate(dragY, clampedY, { type: "spring", stiffness: 300, damping: 30 });

    localStorage.setItem(
      "ai_btn_pos_v2",
      JSON.stringify({ x: targetX, y: clampedY, edge })
    );
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend.trim(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          currentWord: activeItem?.word || "",
          currentMeaning: activeItem?.meaning || "",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể kết nối với Gemini AI.");
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Đã có lỗi xảy ra khi trò chuyện.";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ ${errorMsg}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetExamples = () => {
    if (!activeItem) return;
    const prompt = `Lấy câu ví dụ cho từ "${activeItem.word}"`;
    sendMessage(prompt);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* COLLAPSED DRAGGABLE BUTTON (AssistiveTouch-style) */}
      {!isOpen && (
        <motion.button
          ref={buttonRef}
          drag
          dragMomentum={false}
          whileDrag={{ scale: 1.06 }}
          onPointerDown={() => {
            isDragging.current = false;
          }}
          onDragStart={() => {
            isDragging.current = true;
            setIsDraggingActive(true);
          }}
          onDragEnd={handleDragEnd}
          onPointerUp={() => {
            if (!isDragging.current) {
              setIsOpen(true);
            }
          }}
          style={{
            x: dragX,
            y: dragY,
            opacity: isPositioned ? 1 : 0,
            pointerEvents: isPositioned ? "auto" : "none",
          }}
          className={`fixed top-0 left-0 z-30 flex items-center gap-1.5 p-2.5 sm:px-3 sm:py-2.5 ${
            isDraggingActive
              ? "rounded-2xl shadow-2xl ring-2 ring-neutral-400/20 dark:ring-neutral-600/30"
              : snappedEdge === "right"
              ? "rounded-l-2xl rounded-r-none"
              : "rounded-r-2xl rounded-l-none"
          } bg-neutral-900/90 hover:bg-neutral-800 dark:bg-white/90 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 shadow-card backdrop-blur-sm transition-[border-radius,box-shadow,background-color] duration-200 touch-none select-none cursor-grab active:cursor-grabbing`}
          title="AI Trợ lý từ vựng"
        >
          <Bot className="w-4 h-4 text-amber-400 dark:text-amber-500" />
          <span className="hidden sm:inline text-xs font-semibold tracking-wide">
            AI Trợ lý
          </span>
        </motion.button>
      )}

      {/* EXPANDED CHAT DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-40 w-[92vw] sm:w-[380px] max-w-sm h-[520px] sm:h-[580px] bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/90 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-subtle">
                  <Bot className="w-4 h-4 text-amber-400 dark:text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    AI Trợ Lý Từ Vựng
                  </h3>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                    Google Gemini Flash Lite
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-all"
                title="Thu gọn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Active Word Strip & Quick Action */}
            <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 dark:text-neutral-500 font-medium flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Từ trên flashcard:</span>
                </span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 max-w-[160px] truncate">
                  {activeItem ? activeItem.word : "Chưa chọn từ"}
                </span>
              </div>

              {/* Quick "Lấy câu ví dụ" Button */}
              <button
                type="button"
                onClick={handleGetExamples}
                disabled={!activeItem || isLoading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-800 dark:text-neutral-200 text-xs font-semibold border border-neutral-200/60 dark:border-neutral-700 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Lấy câu ví dụ {activeItem ? `cho "${activeItem.word}"` : ""}</span>
              </button>
            </div>

            {/* Chat Messages List (Memory Only) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-neutral-400 dark:text-neutral-500">
                  <Bot className="w-8 h-8 mb-2 opacity-50 text-neutral-400" />
                  <p className="text-xs font-medium leading-relaxed max-w-[220px]">
                    Nhấn <strong>"Lấy câu ví dụ"</strong> hoặc đặt câu hỏi về ngữ pháp, cách dùng từ tiếng Anh.
                  </p>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-tr-none font-medium shadow-subtle whitespace-pre-wrap"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-none border border-neutral-200/50 dark:border-neutral-700/60"
                    }`}
                  >
                    {m.role === "user" ? (
                      m.content
                    ) : (
                      <div className="space-y-1">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0 leading-relaxed">
                                {children}
                              </p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic text-neutral-800 dark:text-neutral-200">
                                {children}
                              </em>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc pl-4 space-y-1 my-1.5">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-4 space-y-1 my-1.5">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="leading-relaxed marker:text-neutral-400 dark:marker:text-neutral-500">
                                {children}
                              </li>
                            ),
                            code: ({ children }) => (
                              <code className="bg-neutral-200/70 dark:bg-neutral-700/70 px-1 py-0.5 rounded text-[11px] font-mono text-neutral-800 dark:text-neutral-200">
                                {children}
                              </code>
                            ),
                            h1: ({ children }) => (
                              <h1 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-2 mb-1">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-2 mb-1">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 mt-1.5 mb-0.5">
                                {children}
                              </h3>
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500 text-xs p-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gemini đang soạn câu trả lời...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleFormSubmit}
              className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi về ngữ pháp, từ vựng..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Gửi"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
