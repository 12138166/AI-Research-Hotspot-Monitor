import React from "react";
import { Bookmark, Trash2, ExternalLink, ArrowUpRight, MessageSquare, Sparkles, HelpCircle, Clock, CheckCircle } from "lucide-react";
import { HNStory } from "../types";

interface SavedInsightsSidebarProps {
  bookmarkedStories: HNStory[];
  onToggleBookmark: (story: HNStory) => void;
  onClearAll: () => void;
  onNavigateToCategory?: (category?: "academic" | "technical" | "marketing") => void;
  onUpdateBookmarkStatus?: (storyId: string, status: "reading" | "completed") => void;
}

export default function SavedInsightsSidebar({
  bookmarkedStories,
  onToggleBookmark,
  onClearAll,
  onNavigateToCategory,
  onUpdateBookmarkStatus,
}: SavedInsightsSidebarProps) {
  
  // Style category mappings
  const categoryStyles = {
    academic: {
      label: "论文学术",
      badge: "bg-blue-50 text-blue-700 border-blue-150",
    },
    technical: {
      label: "代码架构",
      badge: "bg-amber-50 text-amber-700 border-amber-150",
    },
    marketing: {
      label: "商业市场",
      badge: "bg-teal-50 text-teal-700 border-teal-150",
    },
    general: {
      label: "通用智源",
      badge: "bg-slate-50 text-slate-700 border-slate-150",
    },
  };

  const handleScrollToCategory = (category?: "academic" | "technical" | "marketing") => {
    if (!category) return;
    if (onNavigateToCategory) {
      onNavigateToCategory(category);
    } else {
      const element = document.getElementById(`category-section-${category}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  return (
    <div id="saved-insights-panel" className="bg-white rounded-xl border border-gray-250/80 p-4 shadow-sm space-y-4">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-150">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 block shrink-0">
            <Bookmark className="w-4 h-4 fill-rose-500 text-rose-600" />
          </span>
          <div>
            <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
              已存盘智库
              <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-sans font-black">
                {bookmarkedStories.length}
              </span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Saved Insights Database</p>
          </div>
        </div>

        {bookmarkedStories.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="p-1 px-2 text-[10px] font-black text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-md transition-all duration-150 flex items-center gap-1 border border-rose-200 cursor-pointer"
            title="清空全部存盘"
          >
            <Trash2 className="w-3 h-3" />
            <span>清空</span>
          </button>
        )}
      </div>

      {/* Description text */}
      <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
        存盘后的 AI 研判将<b>离线持久化</b>。您可以对高价值技术文章、学术前沿及商业洞察打上书标，构建自己的安全决策微知识库。
      </p>

      {/* Bookmarks List Container */}
      <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
        {bookmarkedStories.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center space-y-2">
            <Bookmark className="w-8 h-8 text-slate-300 animate-pulse" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-500">智库空空如也</p>
              <p className="text-[10px] text-gray-400 max-w-[180px] mx-auto leading-relaxed">
                在下方三栏分类卡片中点击「书签书标」图标，即可实时把对应的精品帖子储存在这里。
              </p>
            </div>
          </div>
        ) : (
          bookmarkedStories.map((story) => {
            const cat = story.categoryTag || "general";
            const style = categoryStyles[cat];

            return (
              <div
                key={story.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-white transition-all space-y-2 group.card"
              >
                {/* Header line with badge and remove button */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-150 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleScrollToCategory(story.categoryTag)}
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${style.badge} cursor-pointer hover:opacity-85`}
                      title="定位并跳转至该分类"
                    >
                      {style.label} ⇄
                    </button>

                    {/* Mini Read Status Badge */}
                    {(story.readStatus || "reading") === "reading" ? (
                      <span className="text-[8px] font-bold bg-sky-50 text-sky-600 border border-sky-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5" title="在读 / Read Later">
                        <Clock className="w-2 h-2" />
                        <span>Read Later</span>
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5" title="已读 / Completed">
                        <CheckCircle className="w-2 h-2" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {onUpdateBookmarkStatus && (
                      <button
                        type="button"
                        onClick={() => onUpdateBookmarkStatus(story.id, (story.readStatus || "reading") === "reading" ? "completed" : "reading")}
                        className="p-1 text-gray-400 hover:text-indigo-650 hover:bg-indigo-50 rounded transition-all cursor-pointer"
                        title={(story.readStatus || "reading") === "reading" ? "切换标记为已读/Completed" : "切换标记为在读/Read Later"}
                      >
                        {(story.readStatus || "reading") === "reading" ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleBookmark(story)}
                      className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                      title="移出此存盘项"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Article Info */}
                <div className="space-y-1">
                  <a
                    href={story.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-gray-800 hover:text-indigo-650 leading-relaxed block break-words"
                  >
                    {story.title}
                    <ExternalLink className="w-3 h-3 text-gray-450 inline ml-1 shrink-0" />
                  </a>
                  
                  <span className="text-[9px] text-gray-405 block">由 @{story.author} 发起讨论</span>
                </div>

                {/* AI Summary Highlight if present */}
                {story.aiSummary && (
                  <div className="bg-indigo-50/50 p-2 rounded text-[10px] text-indigo-900 border-l border-indigo-400 leading-relaxed italic">
                    <span className="font-bold flex items-center gap-0.5 text-indigo-750 mb-0.5">
                      <Sparkles className="w-3 h-3 text-indigo-550" />
                      已存盘极简摘要：
                    </span>
                    {story.aiSummary}
                  </div>
                )}

                {/* Metrics */}
                <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1 border-t border-gray-150">
                  <span className="font-semibold text-amber-600 bg-amber-50 px-1 rounded-sm">
                    {story.points} HN Score
                  </span>
                  <span className="flex items-center gap-0.5 font-medium">
                    <MessageSquare className="w-2.5 h-2.5" />
                    {story.commentsCount}条
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer details */}
      <div className="bg-slate-50 p-2.5 rounded-lg text-[9px] text-gray-400 leading-relaxed flex items-start gap-1">
        <HelpCircle className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
        <span>
          此模块与底层安全数据沙盒解耦，仅在您的本地安全浏览器内离线存盘，不会往外泄露任何敏感研读日志。
        </span>
      </div>
    </div>
  );
}
