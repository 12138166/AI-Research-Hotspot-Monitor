import { useState, useEffect, useRef } from "react";
import { RefreshCw, Clock, Sparkles, Bell, X, AlertTriangle, ArrowUpRight, Check, Trash2, HeartHandshake } from "lucide-react";
import FullTextSearch from "./FullTextSearch";
import { MonitorData, AssociationMutationAlert } from "../types";

interface HeaderProps {
  lastUpdated: string;
  isCached: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  postCount: number;
  currentData: MonitorData | null;
  onNavigateToDate: (date: string) => void;
  selectedDate?: string;
  alerts?: AssociationMutationAlert[];
  onClearAlert?: (id: string) => void;
  onMarkAlertRead?: (id: string) => void;
  onClearAllAlerts?: () => void;
}

export default function DashboardHeader({
  lastUpdated,
  isCached,
  isRefreshing,
  onRefresh,
  postCount,
  currentData,
  onNavigateToDate,
  selectedDate,
  alerts = [],
  onClearAlert,
  onMarkAlertRead,
  onClearAllAlerts,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [latestToast, setLatestToast] = useState<AssociationMutationAlert | null>(null);
  const [lastShownId, setLastShownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Monitor newly arrived alerts to push system-level toast notice
  useEffect(() => {
    if (alerts && alerts.length > 0) {
      const newest = alerts[0];
      if (newest.id !== lastShownId) {
        setLatestToast(newest);
        setLastShownId(newest.id);
        
        // Auto-close toast after 10 seconds
        const timer = setTimeout(() => {
          setLatestToast(null);
        }, 10000);
        return () => clearTimeout(timer);
      }
    }
  }, [alerts, lastShownId]);

  // Format the time elegantly
  const formatTime = (isoString?: string) => {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "N/A";
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "N/A";
    }
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="w-full flex flex-col sticky top-0 z-30">
      {/* 1. TOP SYSTEM-LEVEL MUTATION ALERT TOAST (Pops down elegantly of header) */}
      {latestToast && (
        <div className="bg-gradient-to-r from-red-650 via-indigo-950 to-slate-900 border-b border-rose-500 text-white px-6 py-3.5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-pulse-slow z-50 relative font-sans">
          <div className="flex items-start md:items-center gap-3">
            <span className="shrink-0 bg-rose-600 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded inline-flex items-center gap-1 shadow-md animate-bounce ring-2 ring-rose-400/50">
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
              突变警报 / Mutation Alert
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-rose-100">
                检测到 24小时关联强度突变：
                <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded mx-1 text-xs">
                  {latestToast.sourceLabel}
                </strong>
                与
                <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded mx-1 text-xs">
                  {latestToast.targetLabel}
                </strong>
                关联权值从{" "}
                <span className="font-mono text-gray-300 line-through">
                  {latestToast.oldValue}
                </span>{" "}
                飙升至{" "}
                <span className="font-mono text-rose-400 text-base font-extrabold underline decoration-rose-400 decoration-2">
                  {latestToast.newValue}
                </span>{" "}
                (突变率{" "}
                <span className="text-rose-400 font-bold">
                  +{Math.round(((latestToast.newValue - latestToast.oldValue) / latestToast.oldValue) * 100)}%
                </span>
                )
              </p>
              <p className="text-xs text-slate-350 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                <span>对流动能起因：{latestToast.reason}</span>
                <span className="text-[10px] font-mono text-slate-400">({latestToast.timestamp})</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
            <button
              onClick={() => {
                if (onMarkAlertRead) onMarkAlertRead(latestToast.id);
                setLatestToast(null);
              }}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 hover:text-white text-white text-[11px] font-bold rounded-md transition-all active:scale-95 cursor-pointer shadow flex items-center gap-1 border border-rose-400/40"
            >
              <Check className="w-3.5 h-3.5" />
              已知晓查阅
            </button>
            <button
              onClick={() => setLatestToast(null)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN HEADER BODY */}
      <header id="dashboard-header" className="border-b border-gray-200 bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Left section: Title & Slogan */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-100 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> HN Data Synthesis
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Pulse
              </span>
            </div>
            <h1 className="text-2xl font-sans font-bold tracking-tight text-gray-900 mt-1.5 truncate">
              AI Research Hotspot Monitor <span className="font-light text-gray-500 text-lg hidden sm:inline">| 趋势观测站</span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5 truncate">
              追踪 Hacker News 的技术变革、学术研究、业界市场三大核心维度的 AI 热度模型
            </p>
          </div>

          {/* Middle section: Integrated Full-Text Search Component */}
          <div className="w-full lg:max-w-xs shrink-0">
            <FullTextSearch
              currentData={currentData}
              onNavigateToDate={onNavigateToDate}
              selectedDate={selectedDate}
            />
          </div>

          {/* Right section: Monitor controls & values */}
          <div className="flex items-center flex-wrap lg:justify-end gap-3 shrink-0">
            {/* Cache state pill */}
            <div className="flex items-center gap-3.5 bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-1.5 text-xs text-gray-650">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="hidden sm:inline">更新时间:</span>
                <span className="font-mono font-medium text-gray-800">{formatDate(lastUpdated)} {formatTime(lastUpdated)}</span>
              </div>
              <div className="w-px h-3 bg-gray-250" />
              <div className="flex items-center gap-1">
                <span className="hidden sm:inline">状态:</span>
                <span className={`font-semibold ${isCached ? "text-amber-600" : "text-emerald-600"}`}>
                  {isCached ? "已缓存" : "实时最新"}
                </span>
              </div>
              <div className="w-px h-3 bg-gray-250" />
              <div>
                <span className="hidden sm:inline">收录:</span>
                <span className="font-mono font-bold text-gray-800 ml-1">{postCount} 篇</span>
              </div>
            </div>

            {/* Notification Subscription Bell Dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg border text-xs font-semibold relative transition-all duration-200 cursor-pointer flex items-center justify-center ${
                  unreadCount > 0
                    ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 ring-2 ring-rose-400/10 animate-pulse-slow"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
                title="24H 关联对流突变订阅监视"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-mono text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center border-2 border-white animate-bounce-slow">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[340px] sm:w-[420px] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[480px]">
                  <div className="bg-slate-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-indigo-500" />
                      对流突变预警订阅记录 ({unreadCount}未读)
                    </span>
                    <div className="flex items-center gap-1.5">
                      {alerts.length > 0 && (
                        <button
                          onClick={() => {
                            if (onClearAllAlerts) onClearAllAlerts();
                          }}
                          className="text-[10px] text-gray-400 hover:text-rose-500 font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" /> 清空全部
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-gray-400 hover:text-gray-600 rounded p-0.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 p-3 space-y-2">
                    {alerts.length === 0 ? (
                      <div className="text-center py-10 space-y-2 flex flex-col items-center justify-center">
                        <HeartHandshake className="w-8 h-8 text-gray-300 animate-pulse" />
                        <p className="text-xs text-gray-500">拓扑网络没有新的 24H 关联突变点产生</p>
                        <p className="text-[10px] text-gray-400">
                          请在下方拓扑网络组件中启用<b>突变模拟</b>直接发送热度突变样本。
                        </p>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`border rounded-lg p-2.5 transition-all relative ${
                            !alert.isRead
                              ? "bg-rose-50/50 border-rose-150 shadow-sm"
                              : "bg-slate-50 border-slate-100"
                          }`}
                        >
                          {!alert.isRead && (
                            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                          )}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[8px] font-extrabold uppercase px-1 py-0.2 rounded ${
                              alert.type === "academic" ? "bg-blue-100 text-blue-700" :
                              alert.type === "technical" ? "bg-amber-100 text-amber-700" :
                              alert.type === "marketing" ? "bg-teal-100 text-teal-700" :
                              "bg-purple-100 text-purple-700"
                            }`}>
                              {alert.type}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">{alert.timestamp}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-800 leading-snug">
                            通道: <strong>{alert.sourceLabel}</strong> ⇄ <strong>{alert.targetLabel}</strong>
                          </p>
                          <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
                            {alert.reason}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-150/50">
                            <span className="text-[10px] text-gray-400">
                              关联能级: <strong className="text-gray-700 bg-white border border-gray-200 px-1 font-mono rounded">{alert.oldValue}</strong> → <strong className="text-rose-600 bg-rose-50 border border-rose-100 px-1 font-mono rounded">{alert.newValue}</strong>
                            </span>
                            <div className="flex items-center gap-2">
                              {!alert.isRead && onMarkAlertRead && (
                                <button
                                  onClick={() => onMarkAlertRead(alert.id)}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                                >
                                  设为已读
                                </button>
                              )}
                              {onClearAlert && (
                                <button
                                  onClick={() => onClearAlert(alert.id)}
                                  className="text-[10px] text-gray-400 hover:text-rose-500 cursor-pointer"
                                >
                                  删除
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="bg-slate-50 px-4 py-2 border-t border-gray-100/80 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span>💡 突变判定算法: Antigravity-R2</span>
                    <span className="text-rose-500">24H Monitor Guard</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sync Button */}
            <button
              id="sync-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm border transition-all duration-205 bg-gray-950 text-white border-transparent hover:bg-gray-800 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "重爬中..." : "重爬重新分析"}</span>
            </button>
          </div>
        </div>
      </header>
    </div>
  );
}

