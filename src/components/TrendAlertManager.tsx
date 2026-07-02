import React, { useState, useEffect } from "react";
import { 
  Bell, BellOff, Plus, Trash2, ShieldAlert, Sparkles, Clock, 
  ExternalLink, Bookmark, Check, ToggleLeft, ToggleRight, Radio, AlertCircle,
  Volume2, VolumeX, Beaker, Flame, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { HNStory } from "../types";

export interface TrendAlertCriterion {
  id: string;
  keyword: string;
  isActive: boolean;
  createdAt: string;
  matchCount: number;
  minPoints?: number; // Minimum HN score threshold to trigger
}

export interface TriggeredAlertLog {
  id: string;
  storyId: string;
  storyTitle: string;
  storyUrl: string;
  points: number;
  keyword: string;
  timestamp: string;
}

interface TrendAlertManagerProps {
  criteria: TrendAlertCriterion[];
  onAddCriterion: (keyword: string, minPoints?: number) => void;
  onToggleCriterion: (id: string) => void;
  onDeleteCriterion: (id: string) => void;
  alertLogs: TriggeredAlertLog[];
  onClearLogs: () => void;
  onDeleteLog: (id: string) => void;
  bookmarkedIds: string[];
  onToggleBookmark: (story: HNStory) => void;
  onSimulateTrigger?: (keyword: string) => void; // Simulated trigger handler
}

// Tech double chime synthesized via Web Audio API
export function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First high tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(660, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Second delayed higher tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.22);
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.3);
  } catch (err) {
    console.warn("Web Audio chime failed to initialize:", err);
  }
}

export default function TrendAlertManager({
  criteria,
  onAddCriterion,
  onToggleCriterion,
  onDeleteCriterion,
  alertLogs,
  onClearLogs,
  onDeleteLog,
  bookmarkedIds,
  onToggleBookmark,
  onSimulateTrigger
}: TrendAlertManagerProps) {
  const [newKeyword, setNewKeyword] = useState("");
  const [minPoints, setMinPoints] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Sound toggle persist
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("hn_trend_alert_sound_enabled");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("hn_trend_alert_sound_enabled", String(next));
    if (next) {
      playAlertChime();
    }
  };

  // Preset keyword pool to encourage users
  const trendingPresets = [
    { label: "AGI", points: 100 },
    { label: "DeepSeek", points: 150 },
    { label: "o1 / o3", keyword: "o1", points: 200 },
    { label: "WebGPU", points: 50 },
    { label: "Rust", points: 50 },
    { label: "LLM scaling", points: 100 },
    { label: "Apple Intel", keyword: "Apple Intelligence", points: 150 }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = newKeyword.trim();
    if (!keyword) return;

    if (criteria.some(c => c.keyword.toLowerCase() === keyword.toLowerCase())) {
      setErrorMsg("该关键词已在监控列表中");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    onAddCriterion(keyword, minPoints);
    setNewKeyword("");
    setErrorMsg(null);
  };

  const handleAddPreset = (keyword: string, presetPoints: number) => {
    if (criteria.some(c => c.keyword.toLowerCase() === keyword.toLowerCase())) {
      setErrorMsg(`"${keyword}" 已在监控列表中`);
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    onAddCriterion(keyword, presetPoints);
    setErrorMsg(null);
  };

  // Helper to highlight search keywords in HTML
  const highlightText = (text: string, search: string) => {
    if (!search) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${search})`, "gi"));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-amber-100 text-slate-900 rounded-[2px] px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-6">
      
      {/* Header section */}
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-150">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-indigo-50 border border-indigo-150 rounded-lg text-indigo-650 block shrink-0">
            <Bell className="w-4 h-4 fill-indigo-500 text-indigo-600 animate-swing" />
          </span>
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-1.5">
              趋势信号监控 / Signal Center
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Hacker News High-Impact Signal Radar</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle button */}
          <button
            onClick={handleSoundToggle}
            className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              soundEnabled 
                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" 
                : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
            }`}
            title={soundEnabled ? "静音警报提示音" : "开启警报提示音"}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span className="text-[9px] font-mono hidden sm:inline">{soundEnabled ? "声音开启" : "已静音"}</span>
          </button>
          
          <span className="text-[10px] bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-full font-sans font-black flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 bg-indigo-650 rounded-full inline-block animate-ping" />
            {criteria.filter(c => c.isActive).length} 个激活
          </span>
        </div>
      </div>

      {/* Intro info box */}
      <div className="p-3 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-slate-50 border border-indigo-100/80 rounded-xl text-xs text-slate-700 leading-relaxed space-y-1">
        <p className="font-extrabold text-indigo-900 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-650" />
          <span>高频高阶雷达系统</span>
        </p>
        <p className="text-[11px] text-slate-600 font-medium">
          配置特定的高价值技术/学术词汇。当 HN 实时流动星空流出现匹配且<strong>得分达到设定门槛</strong>的新贴时，将发出<strong>全局实时 Toast 弹窗与音频提示音</strong>。
        </p>
      </div>

      {/* Preset Suggestions */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">🔥 一键订阅精选趋势词:</span>
        <div className="flex flex-wrap gap-1.5">
          {trendingPresets.map((preset) => {
            const kw = preset.keyword || preset.label;
            const isSubscribed = criteria.some(c => c.keyword.toLowerCase() === kw.toLowerCase());
            return (
              <button
                key={preset.label}
                type="button"
                disabled={isSubscribed}
                onClick={() => handleAddPreset(kw, preset.points)}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                  isSubscribed 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-400 cursor-not-allowed" 
                    : "bg-white border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/20"
                }`}
                title={`添加并设置得分阀值 >= ${preset.points} pt`}
              >
                <span>{preset.label}</span>
                <span className="text-[9px] text-slate-400 font-mono font-medium">({preset.points}pt+)</span>
                {isSubscribed ? <Check className="w-3 h-3 text-indigo-500" /> : <Plus className="w-2.5 h-2.5 text-indigo-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Criterion Form */}
      <form onSubmit={handleSubmit} className="space-y-3 p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700 block">✙ 新增监控词与门槛过滤：</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="例如: WebGPU, Sora, Agentic..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-250 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* Min score select slider or chips */}
        <div className="space-y-1">
          <span className="text-[10px] font-black text-gray-500 block">⚡ 最低热度得分要求 (Score Threshold):</span>
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 50, 100, 200].map((pts) => (
              <button
                key={pts}
                type="button"
                onClick={() => setMinPoints(pts)}
                className={`py-1 text-[10px] font-bold font-mono rounded-md border text-center transition cursor-pointer ${
                  minPoints === pts 
                    ? "bg-slate-900 border-slate-900 text-white shadow-xs" 
                    : "bg-white border-gray-200 text-gray-600 hover:bg-slate-100"
                }`}
              >
                {pts === 0 ? "不限分" : `>= ${pts}pt`}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
        >
          <Plus className="w-4 h-4" />
          <span>确认创建此趋势雷达 ({minPoints === 0 ? "全网匹配" : `>= ${minPoints} pt`})</span>
        </button>

        {errorMsg && (
          <p className="text-[10.5px] text-rose-500 font-bold flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </p>
        )}
      </form>

      {/* Current Monitor criteria list */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-black text-gray-700">📡 正在运行的雷达天线：</h4>
        
        {criteria.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-slate-50/30">
            <BellOff className="w-7 h-7 text-gray-300 mx-auto" />
            <p className="text-[11px] font-bold text-gray-400 mt-1.5">暂无任何监控关键词</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {criteria.map((c) => (
                <motion.div 
                  key={c.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    c.isActive 
                      ? "bg-indigo-50/20 border-indigo-150/70 hover:border-indigo-300" 
                      : "bg-slate-50/70 border-slate-200 hover:border-slate-250 opacity-70"
                  }`}
                >
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-800 font-mono truncate max-w-[120px]" title={c.keyword}>
                        {c.keyword}
                      </span>
                      {c.isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                      ) : (
                        <span className="text-[8px] bg-slate-200 text-slate-500 px-1 py-0.2 rounded font-sans shrink-0">已停用</span>
                      )}
                      
                      {/* Score requirement indicator */}
                      <span className="text-[8.5px] bg-amber-50 text-amber-700 font-mono px-1.5 py-0.2 rounded border border-amber-150 font-black shrink-0">
                        ⚡ {c.minPoints && c.minPoints > 0 ? `>= ${c.minPoints}pt` : "不限分"}
                      </span>
                    </div>
                    
                    <span className="text-[9px] text-slate-400 block font-mono">
                      触发触警: <b className="text-indigo-650 font-black">{c.matchCount}</b> 次
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Interactive Dry-Run simulation test trigger */}
                    {c.isActive && onSimulateTrigger && (
                      <button
                        type="button"
                        onClick={() => onSimulateTrigger(c.keyword)}
                        className="p-1.5 text-gray-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition"
                        title="🧪 极客模拟干预 (测试音效与全局通知)"
                      >
                        <Beaker className="w-3.5 h-3.5 text-indigo-500" />
                      </button>
                    )}

                    {/* Toggle Active state */}
                    <button
                      type="button"
                      onClick={() => onToggleCriterion(c.id)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                      title={c.isActive ? "暂停此监控" : "启用此监控"}
                    >
                      {c.isActive ? (
                        <ToggleRight className="w-6 h-6 text-indigo-650" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-350" />
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => onDeleteCriterion(c.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title="彻底删除关键词"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Triggered alert history logs */}
      <div className="space-y-3 pt-3.5 border-t border-slate-150">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-gray-700 flex items-center gap-1">
            <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>🔔 触警历史日志 / Alert Logs ({alertLogs.length})</span>
          </h4>
          {alertLogs.length > 0 && (
            <button
              type="button"
              onClick={onClearLogs}
              className="text-[10px] text-rose-600 font-black hover:underline transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              <span>清空历史</span>
            </button>
          )}
        </div>

        {alertLogs.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl bg-slate-50/30">
            <Radio className="w-6 h-6 text-slate-300 mx-auto stroke-1" />
            <p className="text-[10px] text-gray-400 mt-1">目前暂无触发记录，系统处于持续监听状态</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {alertLogs.map((log) => {
                const isStoryBookmarked = bookmarkedIds.includes(log.storyId);
                const storyAdapter: HNStory = {
                  id: log.storyId,
                  title: log.storyTitle,
                  url: log.storyUrl,
                  points: log.points,
                  author: "hn-user",
                  commentsCount: 0,
                  createdAt: log.timestamp,
                };

                return (
                  <motion.div 
                    key={log.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-3 rounded-xl border border-slate-150 hover:border-amber-250 bg-slate-50/40 hover:bg-white transition-all text-xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-amber-100 text-amber-800 uppercase tracking-wider flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5 text-amber-700" />
                        <span>触发: {log.keyword}</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                      </span>
                    </div>

                    <a 
                      href={log.storyUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="font-bold text-slate-800 hover:text-indigo-650 leading-relaxed block tracking-tight"
                      title={log.storyTitle}
                    >
                      {highlightText(log.storyTitle, log.keyword)}
                    </a>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[9px]">
                      <div className="flex items-center gap-1.5 text-slate-450 font-mono font-medium">
                        <span>HN score: <b className="text-amber-700">{log.points} pt</b></span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleBookmark(storyAdapter)}
                          className={`p-1 rounded cursor-pointer transition ${
                            isStoryBookmarked ? "text-rose-500 bg-rose-50 border border-rose-100" : "text-gray-400 hover:text-indigo-600 hover:bg-slate-100"
                          }`}
                          title={isStoryBookmarked ? "移出书签" : "收藏至书签栏"}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isStoryBookmarked ? "fill-rose-500" : ""}`} />
                        </button>

                        <a 
                          href={log.storyUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer transition"
                          title="查看原链接"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => onDeleteLog(log.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition"
                          title="删除该条记录"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
}
