import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Flame, Clock, RefreshCw, Search, ExternalLink, Bookmark, HelpCircle, 
  Radio, FileText, ChevronRight, Share2, Clipboard, Globe, Filter, AlertTriangle, ArrowUpDown
} from "lucide-react";
import { HNStory } from "../types";

interface HNLiveFeedPanelProps {
  bookmarkedIds: string[];
  onToggleBookmark: (story: HNStory) => void;
  onNewStoriesLoaded?: (stories: HNStory[]) => void;
}

interface HNRawItem {
  id: number;
  title: string;
  url?: string;
  by: string;
  score: number;
  descendants?: number;
  time: number;
  type: string;
}

export default function HNLiveFeedPanel({
  bookmarkedIds = [],
  onToggleBookmark,
  onNewStoriesLoaded
}: HNLiveFeedPanelProps) {
  const [endpointType, setEndpointType] = useState<"top" | "new">("top");
  const [limit, setLimit] = useState<number>(30);
  const [liveStories, setLiveStories] = useState<HNStory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 means Off
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch function for raw Hacker News top / new stories via official Firebase API
  const fetchHNLiveDetails = async (type: "top" | "new", fetchLimit: number) => {
    try {
      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: fetchLimit });

      const listUrl = type === "top" 
        ? "https://hacker-news.firebaseio.com/v0/topstories.json"
        : "https://hacker-news.firebaseio.com/v0/newstories.json";

      const listRes = await fetch(listUrl);
      if (!listRes.ok) {
        throw new Error(`Failed to load Hacker News story index: HTTP ${listRes.status}`);
      }

      const rawIds: number[] = await listRes.json();
      const targetIds = rawIds.slice(0, fetchLimit);
      
      setProgress({ current: 0, total: targetIds.length });
      
      const loadedStories: HNStory[] = [];
      let currentProgress = 0;

      // Group in small chunks to prevent aggressive rate limits but keep speed high
      const chunkSize = 10;
      for (let i = 0; i < targetIds.length; i += chunkSize) {
        const chunk = targetIds.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async (id) => {
          try {
            const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            if (!itemRes.ok) return null;
            const itemData: HNRawItem = await itemRes.json();
            if (!itemData || itemData.type !== "story" || !itemData.title) return null;

            return {
              id: String(itemData.id),
              title: itemData.title,
              url: itemData.url || `https://news.ycombinator.com/item?id=${itemData.id}`,
              points: itemData.score || 0,
              author: itemData.by || "hn-user",
              commentsCount: itemData.descendants || 0,
              createdAt: new Date(itemData.time * 1000).toISOString(),
              originSegment: "frontpage" as const, // Treat as raw stream feed
            };
          } catch (itemErr) {
            console.warn(`Error fetching details of item ${id}:`, itemErr);
            return null;
          }
        });

        const chunkDetails = await Promise.all(chunkPromises);
        for (const story of chunkDetails) {
          if (story) {
            loadedStories.push(story);
          }
          currentProgress++;
          setProgress({ current: currentProgress, total: targetIds.length });
        }
      }

      // Sort live stories in accordance with type: top stories are pre-sorted by HN rank, new stories are pre-sorted by time
      setLiveStories(loadedStories);
      if (onNewStoriesLoaded) {
        onNewStoriesLoaded(loadedStories);
      }
    } catch (err) {
      console.error("Error in fetching HN Live Feed data:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Trigger loading when tab change, limit change, or endpoint change
  useEffect(() => {
    fetchHNLiveDetails(endpointType, limit);
  }, [endpointType, limit]);

  // Handle auto-refresh configuration
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (autoRefreshInterval > 0) {
      timerRef.current = setInterval(() => {
        console.log(`[Auto-Refresh] Re-fetching HN ${endpointType} stream...`);
        fetchHNLiveDetails(endpointType, limit);
      }, autoRefreshInterval * 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoRefreshInterval, endpointType, limit]);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Compute domain extractor
  const getDomain = (urlStr: string) => {
    try {
      if (!urlStr) return "news.ycombinator.com";
      const u = new URL(urlStr);
      return u.hostname.replace("www.", "");
    } catch {
      return "external";
    }
  };

  // Helper relative time formatter
  const getRelativeTime = (isoString: string) => {
    const pTime = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - pTime) / 1000);

    if (diffSec < 60) return "刚刚 / Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}分钟前 / ${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}小时前 / ${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}天前 / ${diffDay}d ago`;
  };

  // Filter processes
  const filteredStories = useMemo(() => {
    if (!searchQuery.trim()) return liveStories;
    const query = searchQuery.toLowerCase();
    return liveStories.filter(
      (story) => 
        story.title.toLowerCase().includes(query) || 
        story.author.toLowerCase().includes(query) ||
        getDomain(story.url).toLowerCase().includes(query)
    );
  }, [liveStories, searchQuery]);

  return (
    <div id="hn-live-feed-panel" className="bg-white rounded-2xl border border-slate-200/95 shadow-sm overflow-hidden flex flex-col">
      
      {/* Upper header section */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-1.5">
              HN Live Feed / 极客实时直通车
            </h2>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 px-2 py-0.5 rounded-sm flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping" />
              实时联播 / Online
            </span>
          </div>
          <p className="text-xs text-cool-gray-500 mt-1">
            无阻断、免分类实时拉取 Hacker News 原版顶层数据流。专为敏锐极客设计，确保最前沿的技术情报零时差捕获。
          </p>
        </div>

        {/* Streaming togglers & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Top / New Type Control */}
          <div className="inline-flex rounded-lg bg-slate-200 p-1">
            <button
              onClick={() => setEndpointType("top")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                endpointType === "top"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-650 hover:text-slate-900"
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${endpointType === "top" ? "text-amber-500" : ""}`} />
              最佳热门 / Top
            </button>
            <button
              onClick={() => setEndpointType("new")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                endpointType === "new"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-650 hover:text-slate-900"
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${endpointType === "new" ? "text-blue-500" : ""}`} />
              最新未检 / Newest
            </button>
          </div>

          {/* Loader counts */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-white border border-gray-250 text-xs font-semibold rounded-lg px-2.5 py-1.5 cursor-pointer outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value={15}>👁️ 15 条</option>
            <option value={30}>👁️ 30 条</option>
            <option value={50}>👁️ 50 条</option>
            <option value={100}>👁️ 100 条</option>
          </select>

          {/* Trigger manual reload */}
          <button
            onClick={() => fetchHNLiveDetails(endpointType, limit)}
            disabled={loading}
            className="bg-white hover:bg-slate-50 border border-slate-200 p-2 rounded-lg text-slate-700 disabled:opacity-50 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="刷新数据流"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* Control row containing Search, Auto Refresh choice and Count status */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索实时网络标题、发帖人、外链域名..."
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white shadow-3xs"
          />
        </div>

        {/* Real-time sync choices */}
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-bold whitespace-nowrap">🔄 自动轮询:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-white border border-gray-200 text-xs rounded-md px-2 py-1 cursor-pointer outline-none focus:ring-1 focus:ring-slate-500 text-gray-700"
            >
              <option value={0}>关 / Off</option>
              <option value={30}>30 秒 / 30s</option>
              <option value={60}>1 分钟 / 1m</option>
              <option value={300}>5 分钟 / 5m</option>
            </select>
          </div>

          <div className="text-[11px] text-gray-500 font-bold">
            已呈现: <span className="text-slate-900">{filteredStories.length}</span> / {liveStories.length}
          </div>
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="p-4 sm:p-6 min-h-[300px] flex-1">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-slate-800 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Radio className="w-5 h-5 text-rose-500 animate-ping" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-black text-slate-800">
                正在穿梭 HN 获取实时原版数据流...
              </p>
              <p className="text-xs text-slate-400">
                已拉取第 {progress.current} / {progress.total} 篇详情，请稍候
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-3">
            <AlertTriangle className="w-12 h-12 text-pink-500 mx-auto" />
            <h3 className="text-sm font-black text-slate-800">无法拉取 Hacker News 实时信号</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              原因: {error}. 请检查您的外部网络连接。Hacker News 的官方接口没有设置访问防护，可在断网状态下稍候重试。
            </p>
            <button
              onClick={() => fetchHNLiveDetails(endpointType, limit)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all"
            >
              极速重试 / Retry
            </button>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
            <FileText className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">未检索到任何符合筛选条件的实时情报</p>
            <p className="text-xs text-slate-400">请尝试清除关键字或等待下一轮信号到来。</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            
            {/* Realtime stream tip */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-slate-700 leading-relaxed flex items-start gap-2">
              <span className="text-base">💡</span>
              <div>
                <span className="font-bold text-amber-900">免流未分类机制说明：</span>
                此界面不经过任何人工智能、大模型进行精细筛选或行业分类。在此您可捕捉到 100% 原始的 HN 极客发帖，适合作为您敏锐发掘非 AI 相关前沿软硬件（如系统芯片、数据库、极客冷门发明）的绝佳前哨。
              </div>
            </div>

            {/* List Stream Items */}
            <div className="divide-y divide-slate-105 border border-slate-150/80 rounded-xl overflow-hidden bg-slate-50/30 shadow-3xs">
              {filteredStories.map((story, idx) => {
                const isBookmarked = bookmarkedIds.includes(story.id);
                const domain = getDomain(story.url);
                return (
                  <div 
                    key={story.id}
                    className="p-4 hover:bg-white transition-all duration-100 flex items-start gap-3 sm:gap-4 shadow-4xs"
                  >
                    {/* Index Sequence Badge */}
                    <div className="text-xs font-black text-slate-400 font-mono w-5 pt-0.5">
                      {String(idx + 1).padStart(2, '0')}
                    </div>

                    {/* Main content area */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-4">
                        <a 
                          href={story.url}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="font-black text-slate-800 hover:text-indigo-650 leading-snug text-sm select-all tracking-tight"
                        >
                          {story.title}
                        </a>
                      </div>

                      {/* Info & Micro Metadata row */}
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-gray-500 font-bold font-mono">
                        
                        {/* Domain tag */}
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>{domain}</span>
                        </span>

                        <span className="text-slate-400">/</span>

                        {/* author */}
                        <span>
                          by <a 
                            href={`https://news.ycombinator.com/user?id=${story.author}`}
                            target="_blank"
                            className="text-slate-705 hover:underline decoration-dashed"
                          >
                            @{story.author}
                          </a>
                        </span>

                        <span className="text-slate-400">|</span>

                        {/* Score */}
                        <span className="text-amber-700 font-extrabold flex items-center gap-0.5">
                          🔥 {story.points} pt
                        </span>

                        <span className="text-slate-400">|</span>

                        {/* Relative Age */}
                        <span className="text-blue-650">
                          {getRelativeTime(story.createdAt)}
                        </span>

                        <span className="text-slate-400">|</span>

                        {/* Comments Count */}
                        <a 
                          href={`https://news.ycombinator.com/item?id=${story.id}`}
                          target="_blank"
                          className="hover:text-indigo-600 flex items-center gap-0.5"
                        >
                          💬 {story.commentsCount} 讨论
                        </a>
                      </div>
                    </div>

                    {/* Left Quick action list */}
                    <div className="flex items-center gap-1.5 self-center">
                      {/* Copy link */}
                      <button
                        onClick={() => handleCopyLink(story.url, story.id)}
                        className={`p-1.5 rounded-md border transition-all cursor-pointer ${
                          copiedId === story.id 
                            ? "bg-slate-900 border-slate-900 text-white" 
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                        title="复制文章 URL"
                      >
                        {copiedId === story.id ? (
                          <span className="text-[9px] font-black px-0.5">COPIED</span>
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Toggle bookmark */}
                      <button
                        onClick={() => onToggleBookmark(story)}
                        className={`p-1.5 rounded-md border transition-all cursor-pointer ${
                          isBookmarked 
                            ? "bg-amber-100/70 border-amber-300 text-amber-700" 
                            : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-amber-500"
                        }`}
                        title={isBookmarked ? "移除书签" : "收藏至智能书签专栏"}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-amber-500" : ""}`} />
                      </button>
                      
                      {/* View original HN thread */}
                      <a
                        href={`https://news.ycombinator.com/item?id=${story.id}`}
                        target="_blank"
                        className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-650 transition-all inline-block"
                        title="前往 Hacker News 查看原帖与回复"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Foot note */}
            <div className="text-center text-[10px] text-gray-400 font-bold py-2">
              📅 Hacker News FireBase RESTful Live Streaming Engine • 端侧并行流式缓冲刷新技术
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
