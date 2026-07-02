import { useState, FormEvent } from "react";
import { History, Calendar, Sparkles, AlertCircle, ChevronRight, Zap, RefreshCw } from "lucide-react";

interface TimeTravelNavigatorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  isRefreshing: boolean;

  compareMode: boolean;
  setCompareMode: (mode: boolean) => void;
  compareDate: string;
  onCompareDateChange: (date: string) => void;
  compareLoading: boolean;
}

export default function TimeTravelNavigator({
  selectedDate,
  onDateChange,
  isRefreshing,
  compareMode,
  setCompareMode,
  compareDate,
  onCompareDateChange,
  compareLoading,
}: TimeTravelNavigatorProps) {
  const [customDate, setCustomDate] = useState(selectedDate || "2026-06-19");
  const [customCompareDate, setCustomCompareDate] = useState(compareDate || "2026-06-15");
  
  // High-value historic dates with real context in 2026
  const presets = [
    { date: "", label: "🪐 实时最新 (Live)" },
    { date: "2026-06-18", label: "🗓️ 6月18日 (架构突破)" },
    { date: "2026-06-15", label: "🔥 6月15日 (API价格战)" },
    { date: "2026-06-12", label: "🤖 6月12日 (端侧AI落地)" },
  ];

  const handleSubmitCustom = (e: FormEvent) => {
    e.preventDefault();
    if (!customDate) return;
    
    // Ensure format is YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(customDate)) {
      alert("请输入格式正确的日期: YYYY-MM-DD");
      return;
    }
    
    // Check if future
    const target = new Date(customDate);
    const today = new Date("2026-06-19T11:23:24-07:00");
    if (target > today) {
      alert("时空法则限制：暂时无法前往未来的时空！请选择 2026-06-19 之前的任意日期。");
      return;
    }
    
    onDateChange(customDate);
  };

  const handleCompareSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!customCompareDate) return;

    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(customCompareDate)) {
      alert("请输入格式正确的对比日期: YYYY-MM-DD");
      return;
    }

    onCompareDateChange(customCompareDate);
  };

  return (
    <div
      id="time-travel-navigator"
      className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-xl p-5 mb-6 shadow-md text-white font-sans"
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left header info */}
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
              <History className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> Time Travel Module
            </span>
            {selectedDate && (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] px-2 py-0.5 rounded font-bold">
                🕰️ 当前位置：{selectedDate}
              </span>
            )}
            {compareMode && compareDate && (
              <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] px-2 py-0.5 rounded font-bold">
                ⚡ 对比位置：{compareDate}
              </span>
            )}
          </div>
          <h2 className="text-base font-bold flex items-center gap-2 text-slate-100">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            时空穿梭及趋势对流控制器 / AI Temporal Axis Control
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            回到过去任意一天，实时重分类当年讨论快照。开启 <strong className="text-indigo-300 font-extrabold">双时空对比模式</strong>，支持将当前时刻与另一历史基准对流，生成叠放位移折线。
          </p>
        </div>

        {/* Right controllers */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
          {/* Mode toggle */}
          <button
            type="button"
            onClick={() => setCompareMode(!compareMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              compareMode
                ? "bg-purple-600 hover:bg-purple-500 text-white border border-purple-400"
                : "bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500"
            }`}
          >
            <span>{compareMode ? "关闭对比" : "⚔️ 开启对比"}</span>
          </button>

          {/* Date Selector A */}
          <form onSubmit={handleSubmitCustom} className="flex items-stretch gap-2 shrink-0">
            <div className="relative flex items-center bg-slate-950/80 border border-indigo-500/20 hover:border-indigo-500/40 focus-within:border-indigo-400 rounded-lg overflow-hidden px-2 py-1.5 transition-colors">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 mr-2 shrink-0" />
              <input
                type="date"
                value={customDate}
                max="2026-06-19"
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-transparent text-xs font-mono text-slate-100 focus:outline-none w-28 [color-scheme:dark]"
              />
            </div>
            <button
              type="submit"
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white hover:text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 active:scale-95 transition-all disabled:opacity-40"
            >
              <span>穿梭A</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Date Selector B (only in compare mode) */}
          {compareMode && (
            <form onSubmit={handleCompareSubmit} className="flex items-stretch gap-2 shrink-0 animate-fade-in">
              <span className="text-xs text-slate-400 self-center font-bold">VS</span>
              <div className="relative flex items-center bg-slate-950/80 border border-amber-500/20 hover:border-amber-500/40 focus-within:border-amber-400 rounded-lg overflow-hidden px-2 py-1.5 transition-colors">
                <Calendar className="w-3.5 h-3.5 text-amber-400 mr-2 shrink-0" />
                <input
                  type="date"
                  value={customCompareDate}
                  max="2026-06-19"
                  onChange={(e) => setCustomCompareDate(e.target.value)}
                  className="bg-transparent text-xs font-mono text-slate-100 focus:outline-none w-28 [color-scheme:dark]"
                />
              </div>
              <button
                type="submit"
                disabled={compareLoading}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black hover:text-black rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 active:scale-95 transition-all disabled:opacity-40"
              >
                {compareLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>锁定B</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Preset click nodes */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>常用历史时空预设点 (直接穿梭时空A)：</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p, idx) => {
            const isActive = selectedDate === p.date;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onDateChange(p.date);
                  setCustomDate(p.date || "2026-06-19");
                }}
                disabled={isRefreshing}
                className={`px-3 py-1 rounded text-xs transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-500 text-white font-bold shadow border border-indigo-400"
                    : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-750 hover:border-slate-700"
                } disabled:opacity-50`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
