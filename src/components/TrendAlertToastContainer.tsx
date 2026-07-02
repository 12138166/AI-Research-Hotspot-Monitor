import React, { useEffect, useState } from "react";
import { Bookmark, ExternalLink, X, Bell, Flame } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { HNStory } from "../types";

export interface TrendToast {
  id: string;
  story: HNStory;
  keyword: string;
  timestamp: string;
  duration?: number; // millisecond duration
}

interface TrendAlertToastContainerProps {
  toasts: TrendToast[];
  onDismiss: (id: string) => void;
  bookmarkedIds: string[];
  onToggleBookmark: (story: HNStory) => void;
}

export default function TrendAlertToastContainer({
  toasts,
  onDismiss,
  bookmarkedIds,
  onToggleBookmark
}: TrendAlertToastContainerProps) {
  return (
    <div 
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3.5 max-w-sm w-full pointer-events-none"
      id="trend-alert-toast-container"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard 
            key={toast.id} 
            toast={toast} 
            onDismiss={onDismiss} 
            isBookmarked={bookmarkedIds.includes(toast.story.id)}
            onToggleBookmark={onToggleBookmark}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastCardProps {
  key?: string | number;
  toast: TrendToast;
  onDismiss: (id: string) => void;
  isBookmarked: boolean;
  onToggleBookmark: (story: HNStory) => void;
}

function ToastCard({
  toast,
  onDismiss,
  isBookmarked,
  onToggleBookmark
}: ToastCardProps) {
  const { id, story, keyword } = toast;
  const duration = toast.duration || 8000;
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    const intervalTime = 40;
    const steps = duration / intervalTime;
    const decrement = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        if (next <= 0) {
          clearInterval(timer);
          return 0;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [id, duration, isHovered]);

  useEffect(() => {
    if (progress <= 0) {
      onDismiss(id);
    }
  }, [progress, id, onDismiss]);

  const handleActionBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleBookmark(story);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="bg-slate-900 border border-indigo-400/40 text-slate-100 rounded-xl p-4 overflow-hidden flex flex-col gap-3 pointer-events-auto shadow-[0_15px_30px_-5px_rgba(79,70,229,0.35),0_8px_16px_rgba(0,0,0,0.25)] hover:scale-[1.01] hover:border-indigo-400/70 group relative font-sans"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Toast Top header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded bg-amber-500 text-slate-950 block animate-bounce">
            <Bell className="w-3.5 h-3.5 fill-slate-950" />
          </span>
          <span className="text-[10px] font-black text-indigo-300 tracking-wider uppercase font-mono">
            趋势雷达触发 / Trend Triggered
          </span>
        </div>
        
        <button 
          onClick={() => onDismiss(id)}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          title="关闭通知"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Trigger alert summary text */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black font-mono bg-indigo-500 text-white shadow-sm flex items-center gap-0.5">
            <Flame className="w-2.5 h-2.5" />
            <span>关键词: {keyword}</span>
          </span>
          <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5 font-bold">
            🔥 {story.points} pt
          </span>
        </div>

        <a 
          href={story.url} 
          target="_blank" 
          rel="noreferrer" 
          className="text-xs font-black text-slate-100 hover:text-indigo-300 leading-normal block transition-colors hover:underline"
        >
          {story.title}
        </a>
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
        <span className="text-[9px] text-slate-500 font-mono">
          by @{story.author || "hn"}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Bookmark immediately */}
          <button
            onClick={handleActionBookmark}
            className={`p-1 px-2 text-[9px] font-extrabold rounded-md cursor-pointer transition flex items-center gap-1 ${
              isBookmarked 
                ? "bg-rose-950 text-rose-300 border border-rose-900" 
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-750"
            }`}
            title={isBookmarked ? "从智库中移除" : "立即加入存盘智库"}
          >
            <Bookmark className={`w-2.5 h-2.5 ${isBookmarked ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>{isBookmarked ? "已存盘" : "星标存盘"}</span>
          </button>

          {/* External article link */}
          <a 
            href={story.url} 
            target="_blank" 
            rel="noreferrer"
            className="p-1 px-2 bg-indigo-650 hover:bg-indigo-600 text-white border border-indigo-550 rounded-md text-[9px] font-extrabold transition flex items-center gap-1 cursor-pointer shadow-3xs"
            title="开浏览器页访问原帖"
          >
            <span>直达链接</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Progress countdown bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800">
        <div 
          className="h-full bg-indigo-400 transition-all duration-40"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}
