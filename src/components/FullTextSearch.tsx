import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Sparkles, HelpCircle, ArrowRight, ExternalLink, MessageSquare, BookOpen, Cpu, DollarSign, X, Calendar, MapPin } from "lucide-react";
import { MonitorData, HNStory } from "../types";

interface FullTextSearchProps {
  currentData: MonitorData | null;
  onNavigateToDate: (date: string) => void;
  selectedDate?: string;
}

// Pre-defined historical landmarks mapping keywords to target historical dates
const HISTORICAL_LANDMARKS = [
  {
    keywords: ["api", "price", "wars", "降价", "cost", "serverless", "cheap", "deepseek", "r1", "v3", "fee"],
    date: "2026-06-15",
    title: "2026-06-15 (API 降价胜地)",
    description: "由 DeepSeek-R1 引出的全网大模型费率革命与轻型无服务器 RAG 开发狂潮"
  },
  {
    keywords: ["gpu", "webgpu", "wasm", "local", "端侧", "webassembly", "apple", "client", "edge"],
    date: "2026-06-12",
    title: "2026-06-12 (端侧 AI 落地 / WebGPU)",
    description: "高效本地端浏览器执行、WASM 移植与苹果 AI 本地端集成狂潮"
  },
  {
    keywords: ["quantize", "ternary", "1.58bit", "matrix", "architecture", "linear", "mamba", "ssm", "架构", "消除乘法"],
    date: "2026-06-18",
    title: "2026-06-18 (AI 模型架构重大突破)",
    description: "三元 1.58-bit 量化模型、微弱乘积替代消除及 Mamba 级物理机推理优化"
  },
  {
    keywords: ["interpret", "sparse", "autoencoder", "sae", "explainable", "theory", "interpretability", "可解释", "机制可解释性"],
    date: "2026-06-19",
    title: "2026-06-19 (机制可解释性审计)",
    description: "学术界对 Sparse Autoencoders 解释算子和注意力机制隐态的密集审查"
  }
];

export default function FullTextSearch({ currentData, onNavigateToDate, selectedDate }: FullTextSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery("");
  };

  // Perform full-text match over loaded data
  const searchResults = useMemo(() => {
    if (!currentData || !query.trim()) {
      return { academic: [], technical: [], marketing: [], totalCount: 0 };
    }

    const lowerQuery = query.toLowerCase();

    const filterStories = (items: HNStory[] = []) => {
      return items.filter((item) => {
        const matchTitle = item.title?.toLowerCase().includes(lowerQuery);
        const matchSummary = item.aiSummary?.toLowerCase().includes(lowerQuery);
        const matchAuthor = item.author?.toLowerCase().includes(lowerQuery);
        return matchTitle || matchSummary || matchAuthor;
      });
    };

    const academicMatches = filterStories(currentData.categories?.academic?.items || []);
    const technicalMatches = filterStories(currentData.categories?.technical?.items || []);
    const marketingMatches = filterStories(currentData.categories?.marketing?.items || []);

    return {
      academic: academicMatches,
      technical: technicalMatches,
      marketing: marketingMatches,
      totalCount: academicMatches.length + technicalMatches.length + marketingMatches.length
    };
  }, [currentData, query]);

  // Identify matching historical landmarks
  const matchedLandmarks = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return HISTORICAL_LANDMARKS.filter((landmark) =>
      landmark.keywords.some((kw) => lowerQuery.includes(kw) || kw.includes(lowerQuery))
    );
  }, [query]);

  // Highlight helper for text matches
  const highlightText = (text: string, search: string) => {
    if (!search.trim() || !text) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-amber-100 text-amber-900 rounded-[2px] px-0.5 font-semibold">
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
    <div ref={containerRef} id="full-text-search-container" className="relative w-full max-w-md z-40">
      {/* Search Input Box */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="全文检索当前时空帖子 title / aiSummary..."
          className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-gray-400 text-gray-800 transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500"
        />
        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-2.5 hover:text-gray-600 text-gray-400 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <span className="absolute right-3 top-2.5 text-[9px] text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded shadow-xs bg-white pointer-events-none font-mono">
            Ctrl+K
          </span>
        )}
      </div>

      {/* Floating Detailed Results Drawer */}
      {isOpen && (query.trim().length > 0) && (
        <div className="absolute right-0 mt-1.5 w-[335px] sm:w-[650px] bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50 flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="bg-slate-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-gray-700">全文搜索及脉络溯源结果</span>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                {searchResults.totalCount} 个匹配项
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 rounded-lg p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {/* Historical Landmarks Suggestion (TIME TRAVEL DIRECTORS) */}
            {matchedLandmarks.length > 0 && (
              <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-lg p-3 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  历史维度脉络推荐 / Temporal Pathways Identified
                </span>
                <p className="text-[11px] text-indigo-650 leading-relaxed">
                  您的关键词命中历史重大 AI 技术舆论节点，可以直接点击穿梭回到特定时空观测深度剖析：
                </p>
                <div className="space-y-1.5 mt-1">
                  {matchedLandmarks.map((landmark) => (
                    <button
                      key={landmark.date}
                      type="button"
                      onClick={() => {
                        onNavigateToDate(landmark.date);
                        setIsOpen(false);
                      }}
                      className="w-full text-left bg-white hover:bg-indigo-100/40 p-2 rounded border border-indigo-200/50 hover:border-indigo-300 transition-all flex items-center justify-between text-xs cursor-pointer group"
                    >
                      <div>
                        <div className="font-bold text-indigo-900 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-500" />
                          {landmark.title}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                          {landmark.description}
                        </p>
                      </div>
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1 rounded inline-flex items-center gap-0.5 shrink-0 border border-indigo-100 font-bold group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        穿越观测
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categorized Matching Columns */}
            {searchResults.totalCount === 0 ? (
              <div className="text-center py-10 space-y-2">
                <HelpCircle className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-500">
                  当前时空 ({selectedDate || "LIVE"}) 暂未搜到包含 <strong className="text-indigo-600">"{query}"</strong> 的条目。
                </p>
                <p className="text-[10px] text-gray-400">
                  可以尝试更改输入或点击下方预设进行历史溯源。
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Academic Column */}
                <div className="space-y-2">
                  <div className="bg-blue-50 border-b border-blue-100 text-blue-850 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-blue-600" />
                    学术研究 / Academic ({searchResults.academic.length})
                  </div>
                  {searchResults.academic.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic py-2 px-1">无匹配学术论文/理论</p>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {searchResults.academic.map((item) => (
                        <div key={item.id} className="bg-slate-50 border border-slate-100 rounded p-1.5 hover:border-blue-300 hover:bg-white transition-all space-y-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="referrer"
                            className="text-[11px] font-bold text-gray-800 hover:text-blue-600 block leading-tight break-words"
                          >
                            {highlightText(item.title, query)}
                            <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-60" />
                          </a>
                          {item.aiSummary && (
                            <p className="text-[10px] text-gray-500 bg-white/70 border border-slate-100 p-1 rounded font-normal leading-normal">
                              {highlightText(item.aiSummary, query)}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1">
                            <span>by {item.author}</span>
                            <span className="font-bold text-slate-500">{item.points} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Technical Column */}
                <div className="space-y-2">
                  <div className="bg-amber-50 border-b border-amber-100 text-amber-850 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-amber-600" />
                    技术架构 / Technical ({searchResults.technical.length})
                  </div>
                  {searchResults.technical.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic py-2 px-1">无匹配技术架构/工具</p>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {searchResults.technical.map((item) => (
                        <div key={item.id} className="bg-slate-50 border border-slate-100 rounded p-1.5 hover:border-amber-300 hover:bg-white transition-all space-y-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="referrer"
                            className="text-[11px] font-bold text-gray-800 hover:text-amber-600 block leading-tight break-words"
                          >
                            {highlightText(item.title, query)}
                            <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-60" />
                          </a>
                          {item.aiSummary && (
                            <p className="text-[10px] text-gray-500 bg-white/70 border border-slate-100 p-1 rounded font-normal leading-normal">
                              {highlightText(item.aiSummary, query)}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1">
                            <span>by {item.author}</span>
                            <span className="font-bold text-slate-500">{item.points} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Marketing Column */}
                <div className="space-y-2">
                  <div className="bg-teal-50 border-b border-teal-100 text-teal-850 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-teal-600" />
                    商业市场 / Marketing ({searchResults.marketing.length})
                  </div>
                  {searchResults.marketing.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic py-2 px-1">无匹配商业投融资/趋势</p>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {searchResults.marketing.map((item) => (
                        <div key={item.id} className="bg-slate-50 border border-slate-100 rounded p-1.5 hover:border-teal-300 hover:bg-white transition-all space-y-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="referrer"
                            className="text-[11px] font-bold text-gray-800 hover:text-teal-600 block leading-tight break-words"
                          >
                            {highlightText(item.title, query)}
                            <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-60" />
                          </a>
                          {item.aiSummary && (
                            <p className="text-[10px] text-gray-500 bg-white/70 border border-slate-100 p-1 rounded font-normal leading-normal">
                              {highlightText(item.aiSummary, query)}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1">
                            <span>by {item.author}</span>
                            <span className="font-bold text-slate-500">{item.points} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Prompt search footer */}
          <div className="bg-slate-50 px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
            <span>💡 提示：命中标题/总结后会自动高亮标识匹配词根</span>
            <span className="font-mono text-indigo-500">HN Hotspot AI Search Engine</span>
          </div>
        </div>
      )}
    </div>
  );
}
