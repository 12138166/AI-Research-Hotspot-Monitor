import React, { useState, useMemo } from "react";
import { Flame, LayoutGrid, TrendingUp, HelpCircle, Activity, Sparkles, Filter, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { MonitorData, HNStory } from "../types";

interface HeatmapProps {
  currentData: MonitorData;
  onKeywordSelect: (category: "academic" | "technical" | "marketing", keyword: string) => void;
}

interface HeatmapItem {
  keyword: string;
  category: "academic" | "technical" | "marketing";
  mentionCount: number;
  totalPoints: number;
  totalComments: number;
  activityScore: number;
  matchingStories: HNStory[];
}

export default function KeywordActivityHeatmap({ currentData, onKeywordSelect }: HeatmapProps) {
  const [filterCategory, setFilterCategory] = useState<"all" | "academic" | "technical" | "marketing">("all");
  const [sortBy, setSortBy] = useState<"activity" | "mentions" | "points">("activity");
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);
  const [selectedKeywordDetail, setSelectedKeywordDetail] = useState<HeatmapItem | null>(null);

  // Parse and calculate metrics for every keyword across categories
  const heatmapData = useMemo(() => {
    if (!currentData || !currentData.categories) return [];

    const items: HeatmapItem[] = [];
    const categoriesKeys: ("academic" | "technical" | "marketing")[] = ["academic", "technical", "marketing"];

    categoriesKeys.forEach((category) => {
      const catData = currentData.categories[category];
      if (!catData) return;

      // Extract hotspots or top entities relevant to this category
      const keywordsSet = new Set<string>();
      if (catData.hotspots) {
        catData.hotspots.forEach((hs) => keywordsSet.add(hs));
      }

      // Add category items title parsed words if hotspots are low
      if (keywordsSet.size === 0) {
        keywordsSet.add(category === "academic" ? "LLM Reason" : category === "technical" ? "RAG Engine" : "Product AI");
      }

      keywordsSet.forEach((kw) => {
        // Scan matching articles
        const matchingStories = catData.items?.filter((story) => {
          const titleMatch = story.title?.toLowerCase().includes(kw.toLowerCase());
          const summaryMatch = story.aiSummary?.toLowerCase().includes(kw.toLowerCase());
          return titleMatch || summaryMatch;
        }) || [];

        const mentionCount = matchingStories.length;
        const totalPoints = matchingStories.reduce((acc, story) => acc + (story.points || 0), 0);
        const totalComments = matchingStories.reduce((acc, story) => acc + (story.commentsCount || 0), 0);
        
        // Activity score formula weights mention frequency, total upvotes, and comments.
        // If there are no direct mentions because the hotspot query is a generic concept,
        // we provide a healthy foundation score (e.g. based on category and static rank) to ensure beautiful rendering.
        const baseWeight = mentionCount === 0 ? 150 : 0;
        const activityScore = Math.max(
          120,
          mentionCount * 120 + totalPoints + totalComments * 2.5 + baseWeight
        );

        items.push({
          keyword: kw,
          category,
          mentionCount,
          totalPoints,
          totalComments,
          activityScore: Math.round(activityScore),
          matchingStories,
        });
      });
    });

    return items;
  }, [currentData]);

  // Filter & Sort Heatmap Matrix elements
  const processedData = useMemo(() => {
    let list = [...heatmapData];

    // Category Filter
    if (filterCategory !== "all") {
      list = list.filter((item) => item.category === filterCategory);
    }

    // Sorting
    if (sortBy === "activity") {
      list.sort((a, b) => b.activityScore - a.activityScore);
    } else if (sortBy === "mentions") {
      list.sort((a, b) => b.mentionCount - a.mentionCount || b.activityScore - a.activityScore);
    } else if (sortBy === "points") {
      list.sort((a, b) => b.totalPoints - a.totalPoints || b.activityScore - a.activityScore);
    }

    return list;
  }, [heatmapData, filterCategory, sortBy]);

  // Style configurations for heat nodes
  const categoryStyles = {
    academic: {
      border: "border-blue-200/60 hover:border-blue-400",
      bgBase: "from-blue-50 to-blue-100/70",
      bgHot: "from-blue-600 to-indigo-800 text-white",
      bgWarm: "from-blue-500/90 to-indigo-650 text-white",
      bgMild: "from-blue-200/80 to-blue-300 text-blue-900 border-blue-300/60",
      textAccent: "text-blue-700",
      badge: "bg-blue-100 text-blue-800",
      tagLabel: "学术研究",
    },
    technical: {
      border: "border-amber-200/60 hover:border-amber-400",
      bgBase: "from-amber-50 to-amber-100/70",
      bgHot: "from-amber-600 to-red-650 text-white",
      bgWarm: "from-amber-500 to-orange-550 text-white",
      bgMild: "from-amber-200/80 to-amber-300 text-amber-900 border-amber-300/60",
      textAccent: "text-amber-750",
      badge: "bg-amber-105 text-amber-850",
      tagLabel: "开源研制",
    },
    marketing: {
      border: "border-emerald-200/60 hover:border-emerald-400",
      bgBase: "from-emerald-50 to-emerald-100/70",
      bgHot: "from-emerald-600 to-teal-850 text-white",
      bgWarm: "from-emerald-500 to-teal-700 text-white",
      bgMild: "from-emerald-200/80 to-emerald-300 text-emerald-900 border-emerald-300/50",
      textAccent: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-800",
      tagLabel: "业界市场",
    },
  };

  // Determine which visual styling node block owns based on activity ranking
  const maxScore = useMemo(() => {
    if (processedData.length === 0) return 1000;
    return Math.max(...processedData.map((d) => d.activityScore), 1);
  }, [processedData]);

  const handleTileClick = (item: HeatmapItem) => {
    setSelectedKeywordDetail(item);
    onKeywordSelect(item.category, item.keyword);
  };

  return (
    <div id="keyword-heatmap-plugin" className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm my-6 transition-all duration-300">
      
      {/* 1. Header with interactive title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-150 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-600">
              <Flame className="w-5 h-5 animate-pulse text-rose-500 fill-rose-50" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                AI 热门潮汐关键词「讨论活跃度」空间热力图
                <span className="text-[10px] bg-red-100 text-rose-600 font-extrabold px-1.5 py-0.5 rounded-full uppercase animate-pulse">
                  Live Matrix
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                实时评估 HN 点击量、评论极化与 AI 引流权重，通过空间色阶映射呈现话题密集度。点击区块深度下网穿透。
              </p>
            </div>
          </div>
        </div>

        {/* Legend of Heat Level */}
        <div className="flex items-center gap-3 self-end md:self-auto bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-[10px] font-semibold text-gray-400">热力能阶 Index:</span>
          <div className="flex items-center gap-1.5 text-[9px] font-bold">
            <span className="w-3.5 h-3.5 rounded bg-gray-100 border border-gray-200"></span>
            <span className="text-gray-400">常规温</span>
            <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-indigo-300 via-orange-400 to-rose-600"></div>
            <span className="text-rose-600">超高沸点 🔥</span>
          </div>
        </div>
      </div>

      {/* 2. Advanced Control Bar Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 p-3 rounded-lg border border-gray-100 my-4 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-500 font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            分类视角:
          </span>
          <div className="inline-flex rounded-lg bg-gray-200/50 p-0.5 border border-gray-150">
            <button
              type="button"
              onClick={() => { setFilterCategory("all"); setSelectedKeywordDetail(null); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-black cursor-pointer transition-colors ${
                filterCategory === "all" ? "bg-white text-gray-800 shadow-xs" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              全部
            </button>
            <button
              type="button"
              onClick={() => { setFilterCategory("academic"); setSelectedKeywordDetail(null); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-black cursor-pointer transition-colors ${
                filterCategory === "academic" ? "bg-blue-600 text-white shadow-xs" : "text-blue-600/70 hover:text-blue-600"
              }`}
            >
              论文学术
            </button>
            <button
              type="button"
              onClick={() => { setFilterCategory("technical"); setSelectedKeywordDetail(null); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-black cursor-pointer transition-colors ${
                filterCategory === "technical" ? "bg-amber-500 text-white shadow-xs" : "text-amber-600/70 hover:text-amber-600"
              }`}
            >
              代码架构
            </button>
            <button
              type="button"
              onClick={() => { setFilterCategory("marketing"); setSelectedKeywordDetail(null); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-black cursor-pointer transition-colors ${
                filterCategory === "marketing" ? "bg-teal-600 text-white shadow-xs" : "text-teal-600/70 hover:text-teal-600"
              }`}
            >
              商业市场
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-bold flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            排布归算:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-700"
          >
            <option value="activity">按「综合讨论活跃评分」</option>
            <option value="mentions">按「高赞主题提及频次」</option>
            <option value="points">按「HN 累计获赞数」</option>
          </select>
        </div>
      </div>

      {/* 3. Heatmap Area Grid mapping */}
      {processedData.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-gray-200 rounded-xl text-center bg-gray-50/50">
          <Activity className="w-8 h-8 text-slate-300 animate-spin" />
          <p className="text-xs text-slate-400 mt-2 font-medium">当前查询的选定时间段内暂无热力密度分布。请换回其它观测归卷。</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 min-h-[180px]">
          {processedData.map((item, index) => {
            const ratio = item.activityScore / maxScore;
            const style = categoryStyles[item.category];
            const isHovered = hoveredKeyword === item.keyword;
            const isSelected = selectedKeywordDetail?.keyword === item.keyword && selectedKeywordDetail?.category === item.category;

            // Compute background classes based on heat density ratio
            // Higher ratio = hotter gradient or full colored matrix cell
            let bgClass = "";
            let textClass = "";
            if (ratio > 0.7) {
              bgClass = style.bgHot;
              textClass = "text-white";
            } else if (ratio > 0.4) {
              bgClass = style.bgWarm;
              textClass = "text-white";
            } else if (ratio > 0.2) {
              bgClass = style.bgMild;
              textClass = style.textAccent;
            } else {
              bgClass = `bg-gradient-to-br ${style.bgBase} border ${style.border}`;
              textClass = style.textAccent;
            }

            // Determine arbitrary tile weight sizes simulating treemapping aspects
            const isBig = index === 0 || index === 1;
            const sizeClass = isBig 
              ? "col-span-2 row-span-1 md:col-span-2" 
              : "col-span-1";

            return (
              <div
                key={`${item.category}-${item.keyword}`}
                onClick={() => handleTileClick(item)}
                onMouseEnter={() => setHoveredKeyword(item.keyword)}
                onMouseLeave={() => setHoveredKeyword(null)}
                className={`relative px-4 py-4 rounded-xl flex flex-col justify-between cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.025] hover:-translate-y-0.5 shadow-xs hover:shadow-md ${sizeClass} ${bgClass} ${
                  isSelected ? "ring-2 ring-rose-500 ring-offset-2 scale-[1.01]" : ""
                }`}
              >
                {/* Micro particle overlay for extremely top hot keywords */}
                {ratio > 0.7 && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                  </span>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide font-sans ${
                      ratio > 0.4 
                        ? "bg-white/25 text-white" 
                        : "bg-slate-200/90 text-slate-800"
                    }`}>
                      {style.tagLabel}
                    </span>
                    <span className={`text-[9px] font-mono leading-none ${ratio > 0.4 ? "text-white/80" : "text-gray-400"}`}>
                      #{index + 1}
                    </span>
                  </div>

                  <p className={`text-xs font-black tracking-tight leading-snug pt-1 truncate break-words ${
                    isBig ? "text-sm md:text-[14px]" : ""
                  }`}>
                    {item.keyword}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between text-[10px] font-mono">
                  <span className={ratio > 0.4 ? "text-white/70" : "text-gray-400 font-medium"}>
                    {item.mentionCount > 0 ? `${item.mentionCount} 篇提及` : "概念提及"}
                  </span>
                  <span className={`font-black flex items-center gap-0.5 ${ratio > 0.4 ? "text-white font-extrabold" : "text-rose-600"}`}>
                    {ratio > 0.7 && <Flame className="w-3 h-3 inline text-red-100 fill-red-100 animate-bounce" />}
                    {item.activityScore} 🔥
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Deep-dive Interactive Discussion Detail Sub-Panel (renders immediately when clicked on a tile area) */}
      {selectedKeywordDetail && (
        <div className="mt-5 p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100/60 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-605" />
              <h4 className="text-xs font-bold uppercase text-indigo-900 tracking-wide">
                已经下网联动：发现 <strong>{selectedKeywordDetail.keyword}</strong> 的关联研讨明细 ({selectedKeywordDetail.matchingStories.length}条符合)
              </h4>
            </div>
            
            <a
              href={`#category-section-${selectedKeywordDetail.category}`}
              className="text-[11px] font-black text-white bg-indigo-650 hover:bg-indigo-700 px-3 py-1 rounded-md flex items-center gap-1 transition-colors shadow-xs"
              onClick={() => {
                const element = document.getElementById(`category-section-${selectedKeywordDetail.category}`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              <span>顺滑滚动至列表</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>

          {selectedKeywordDetail.matchingStories.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">
              该词主要来自于本期 AI 核心宏观总结中提取的概念，暂无完全匹配的直属 H.N. 帖子。您可以通过双语问答进一步交互问询。
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedKeywordDetail.matchingStories.map((story) => (
                <div key={story.id} className="bg-white border border-slate-100 rounded-lg p-3 shadow-2xs hover:border-indigo-200 transition-all flex flex-col justify-between">
                  <div>
                    <a
                      href={story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-gray-800 hover:text-indigo-600 block line-clamp-2 leading-relaxed"
                    >
                      {story.title}
                    </a>
                    {story.aiSummary && (
                      <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed italic bg-slate-50 p-2 rounded">
                        <span className="font-semibold text-indigo-700">精炼：</span>
                        {story.aiSummary}
                      </p>
                    )}
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[9px] text-gray-400">
                    <span className="bg-amber-50 text-amber-600 px-1 rounded font-bold">
                      {story.points} Points
                    </span>
                    <span>评论: {story.commentsCount} 回复</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
