import { useEffect, useState, useMemo } from "react";
import DashboardHeader from "./components/DashboardHeader";
import BentoStats from "./components/BentoStats";
import HotspotCategoryCard from "./components/HotspotCategoryCard";
import TrendAnalystChat from "./components/TrendAnalystChat";
import TimeTravelNavigator from "./components/TimeTravelNavigator";
import TrendSummaryBoard from "./components/TrendSummaryBoard";
import NetworkAssociationGraph from "./components/NetworkAssociationGraph";
import TrendComparisonPanel from "./components/TrendComparisonPanel";
import KeywordActivityHeatmap from "./components/KeywordActivityHeatmap";
import SavedInsightsSidebar from "./components/SavedInsightsSidebar";
import NewCommentsPanel from "./components/NewCommentsPanel";
import CommunityPulsePanel from "./components/CommunityPulsePanel";
import CareersJobsPanel from "./components/CareersJobsPanel";
import MentionsPanel from "./components/MentionsPanel";
import HNLiveFeedPanel from "./components/HNLiveFeedPanel";
import TrendAlertManager, { TrendAlertCriterion, TriggeredAlertLog, playAlertChime } from "./components/TrendAlertManager";
import TrendAlertToastContainer, { TrendToast } from "./components/TrendAlertToastContainer";
import { MonitorData, AssociationMutationAlert, HNStory } from "./types";
import { Sparkles, BrainCircuit, RefreshCw, AlertTriangle, ArrowDown, History, Rewind, Bookmark, Trash2, ExternalLink, HelpCircle, LayoutDashboard, Compass, TrendingUp, Newspaper, FolderHeart, X, BookOpen, Clock, CheckCircle, Users, Radio } from "lucide-react";

export default function App() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(""); // empty means live latest
  const [activeTab, setActiveTab] = useState<"dashboard" | "feeds" | "analyst" | "saved">("dashboard");
  const [feedSubTab, setFeedSubTab] = useState<"all" | "academic" | "technical" | "marketing" | "newcomments" | "community_pulse" | "careers_jobs" | "user_mentions" | "hn_live_feed">("all");
  const [researchFilter, setResearchFilter] = useState<"all" | "reading" | "completed">("all");

  // Subscription Alert Monitoring State
  const [alerts, setAlerts] = useState<AssociationMutationAlert[]>([]);

  const handleClearAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const handleMarkAlertRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, isRead: true } : alert))
    );
  };

  const handleClearAllAlerts = () => {
    setAlerts([]);
  };

  const handleAddAlert = (alert: AssociationMutationAlert) => {
    setAlerts((prev) => [alert, ...prev]);
  };

  // Persistent Bookmarked AI insights
  const [bookmarkedStories, setBookmarkedStories] = useState<HNStory[]>(() => {
    try {
      const saved = localStorage.getItem("hn_bookmarked_stories");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const bookmarkedIds = useMemo(() => {
    return bookmarkedStories.map((story) => story.id);
  }, [bookmarkedStories]);

  const handleToggleBookmark = (story: HNStory) => {
    setBookmarkedStories((prev) => {
      const exists = prev.find((s) => s.id === story.id);
      let updated;
      if (exists) {
        updated = prev.filter((s) => s.id !== story.id);
      } else {
        updated = [{ ...story, readStatus: story.readStatus || "reading" }, ...prev];
      }
      localStorage.setItem("hn_bookmarked_stories", JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateBookmarkStatus = (storyId: string, status: "reading" | "completed") => {
    setBookmarkedStories((prev) => {
      const updated = prev.map((s) =>
        s.id === storyId ? { ...s, readStatus: status } : s
      );
      localStorage.setItem("hn_bookmarked_stories", JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllBookmarks = () => {
    setBookmarkedStories([]);
    localStorage.removeItem("hn_bookmarked_stories");
  };

  // Trend alerts monitoring state
  const [alertCriteria, setAlertCriteria] = useState<TrendAlertCriterion[]>(() => {
    try {
      const saved = localStorage.getItem("hn_trend_alert_criteria");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: "1", keyword: "AGI", isActive: true, createdAt: new Date().toISOString(), matchCount: 0, minPoints: 100 },
      { id: "2", keyword: "LLM scaling", isActive: true, createdAt: new Date().toISOString(), matchCount: 0, minPoints: 100 },
      { id: "3", keyword: "DeepSeek", isActive: true, createdAt: new Date().toISOString(), matchCount: 0, minPoints: 150 },
      { id: "4", keyword: "o1", isActive: true, createdAt: new Date().toISOString(), matchCount: 0, minPoints: 200 }
    ];
  });

  const [alertLogs, setAlertLogs] = useState<TriggeredAlertLog[]>(() => {
    try {
      const saved = localStorage.getItem("hn_triggered_alerts_log");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeToasts, setActiveToasts] = useState<TrendToast[]>([]);

  const runKeywordScan = (stories: HNStory[], currentCriteria = alertCriteria, currentLogs = alertLogs) => {
    if (!stories || stories.length === 0) return;
    const activeCriteria = currentCriteria.filter(c => c.isActive);
    if (activeCriteria.length === 0) return;

    let updatedLogs = [...currentLogs];
    let logsChanged = false;
    let criteriaChanged = false;
    const newToasts: TrendToast[] = [];

    const updatedCriteria = currentCriteria.map(c => {
      if (!c.isActive) return c;
      
      let matchInc = 0;
      stories.forEach(story => {
        if (!story.title) return;
        const lowerTitle = story.title.toLowerCase();
        const lowerKeyword = c.keyword.toLowerCase();

        if (lowerTitle.includes(lowerKeyword)) {
          // Check HN points threshold
          const threshold = c.minPoints || 0;
          if (story.points < threshold) return;

          const alreadyTriggered = updatedLogs.some(
            log => log.storyId === story.id && log.keyword.toLowerCase() === lowerKeyword
          );
          if (!alreadyTriggered) {
            matchInc++;
            logsChanged = true;
            
            const logId = `${story.id}-${c.keyword}-${Date.now()}`;
            const newLog: TriggeredAlertLog = {
              id: logId,
              storyId: story.id,
              storyTitle: story.title,
              storyUrl: story.url,
              points: story.points,
              keyword: c.keyword,
              timestamp: new Date().toISOString()
            };
            updatedLogs.unshift(newLog);

            const toastId = `${story.id}-${c.keyword}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            newToasts.push({
              id: toastId,
              story,
              keyword: c.keyword,
              timestamp: new Date().toISOString()
            });
          }
        }
      });

      if (matchInc > 0) {
        criteriaChanged = true;
        return { ...c, matchCount: c.matchCount + matchInc };
      }
      return c;
    });

    if (logsChanged) {
      setAlertLogs(updatedLogs);
      localStorage.setItem("hn_triggered_alerts_log", JSON.stringify(updatedLogs));
    }

    if (criteriaChanged) {
      setAlertCriteria(updatedCriteria);
      localStorage.setItem("hn_trend_alert_criteria", JSON.stringify(updatedCriteria));
    }

    if (newToasts.length > 0) {
      setActiveToasts(prev => [...prev, ...newToasts].slice(-5));
      const soundOn = localStorage.getItem("hn_trend_alert_sound_enabled") !== "false";
      if (soundOn) {
        playAlertChime();
      }
    }
  };

  const handleCheckTrendAlerts = (stories: HNStory[]) => {
    let currentCriteria = alertCriteria;
    try {
      const saved = localStorage.getItem("hn_trend_alert_criteria");
      if (saved) currentCriteria = JSON.parse(saved);
    } catch {}
    
    let currentLogs = alertLogs;
    try {
      const savedLogs = localStorage.getItem("hn_triggered_alerts_log");
      if (savedLogs) currentLogs = JSON.parse(savedLogs);
    } catch {}

    runKeywordScan(stories, currentCriteria, currentLogs);
  };

  const handleAddCriterion = (keyword: string, minPoints: number = 0) => {
    const newCriterion: TrendAlertCriterion = {
      id: String(Date.now()),
      keyword,
      isActive: true,
      createdAt: new Date().toISOString(),
      matchCount: 0,
      minPoints
    };
    const updated = [...alertCriteria, newCriterion];
    setAlertCriteria(updated);
    localStorage.setItem("hn_trend_alert_criteria", JSON.stringify(updated));

    if (data) {
      const allStories: HNStory[] = [];
      if (data.categories) {
        if (data.categories.academic && data.categories.academic.items) {
          allStories.push(...data.categories.academic.items);
        }
        if (data.categories.technical && data.categories.technical.items) {
          allStories.push(...data.categories.technical.items);
        }
        if (data.categories.marketing && data.categories.marketing.items) {
          allStories.push(...data.categories.marketing.items);
        }
      }

      let matchCount = 0;
      let updatedLogs = [...alertLogs];
      let logsChanged = false;

      allStories.forEach(story => {
        if (!story.title) return;
        const lowerTitle = story.title.toLowerCase();
        if (lowerTitle.includes(keyword.toLowerCase())) {
          // Verify points threshold
          if (story.points < minPoints) return;

          const alreadyTriggered = updatedLogs.some(
            log => log.storyId === story.id && log.keyword.toLowerCase() === keyword.toLowerCase()
          );
          if (!alreadyTriggered) {
            matchCount++;
            logsChanged = true;
            const newLog: TriggeredAlertLog = {
              id: `${story.id}-${keyword}-${Date.now()}`,
              storyId: story.id,
              storyTitle: story.title,
              storyUrl: story.url,
              points: story.points,
              keyword: keyword,
              timestamp: new Date().toISOString()
            };
            updatedLogs.unshift(newLog);
          }
        }
      });

      if (matchCount > 0) {
        setAlertCriteria(updated.map(c => c.id === newCriterion.id ? { ...c, matchCount } : c));
        localStorage.setItem("hn_trend_alert_criteria", JSON.stringify(updated.map(c => c.id === newCriterion.id ? { ...c, matchCount } : c)));
      }

      if (logsChanged) {
        setAlertLogs(updatedLogs);
        localStorage.setItem("hn_triggered_alerts_log", JSON.stringify(updatedLogs));
      }
    }
  };

  const handleSimulateTrigger = (keyword: string) => {
    // Play alert sound if enabled
    const soundOn = localStorage.getItem("hn_trend_alert_sound_enabled") !== "false";
    if (soundOn) {
      playAlertChime();
    }

    const mockTitles = [
      `How we integrated ${keyword} into our live-stream recommendation loop`,
      `Show HN: A secure low-latency platform built for distributed ${keyword}`,
      `Is ${keyword} really ready to replace classical deep learning methods?`,
      `The next paradigm shift: Why ${keyword} changes general purpose computing`
    ];
    const randomTitle = mockTitles[Math.floor(Math.random() * mockTitles.length)];
    const mockId = `mock-${Date.now()}`;
    const mockStory: HNStory = {
      id: mockId,
      title: randomTitle,
      url: "https://news.ycombinator.com",
      points: Math.floor(Math.random() * 250) + 75,
      author: "cyber-alchemist",
      commentsCount: 15,
      createdAt: new Date().toISOString()
    };

    // Push toast
    const toastId = `mock-toast-${Date.now()}`;
    setActiveToasts(prev => [{
      id: toastId,
      story: mockStory,
      keyword,
      timestamp: new Date().toISOString(),
      duration: 8000
    }, ...prev].slice(-5));

    // Also insert into alert history logs for feedback
    const newLog: TriggeredAlertLog = {
      id: `mock-log-${Date.now()}`,
      storyId: mockStory.id,
      storyTitle: mockStory.title,
      storyUrl: mockStory.url,
      points: mockStory.points,
      keyword,
      timestamp: new Date().toISOString()
    };
    setAlertLogs(prev => [newLog, ...prev]);

    // Increment criteria matchCount for visual satisfaction
    setAlertCriteria(prev => prev.map(c => c.keyword.toLowerCase() === keyword.toLowerCase() ? { ...c, matchCount: c.matchCount + 1 } : c));
  };

  const handleToggleCriterion = (id: string) => {
    const updated = alertCriteria.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c);
    setAlertCriteria(updated);
    localStorage.setItem("hn_trend_alert_criteria", JSON.stringify(updated));
  };

  const handleDeleteCriterion = (id: string) => {
    const updated = alertCriteria.filter(c => c.id !== id);
    setAlertCriteria(updated);
    localStorage.setItem("hn_trend_alert_criteria", JSON.stringify(updated));
  };

  const handleDismissToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleClearLogs = () => {
    setAlertLogs([]);
    localStorage.removeItem("hn_triggered_alerts_log");
  };

  const handleDeleteLog = (id: string) => {
    const updated = alertLogs.filter(log => log.id !== id);
    setAlertLogs(updated);
    localStorage.setItem("hn_triggered_alerts_log", JSON.stringify(updated));
  };

  // Multi-date comparison state
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareDate, setCompareDate] = useState<string>("2026-06-15");
  const [compareData, setCompareData] = useState<MonitorData | null>(null);
  const [compareLoading, setCompareLoading] = useState<boolean>(false);

  // Category search states for coordinated link routing from Heatmap
  const [academicSearch, setAcademicSearch] = useState("");
  const [technicalSearch, setTechnicalSearch] = useState("");
  const [marketingSearch, setMarketingSearch] = useState("");

  const handleKeywordSelect = (category: "academic" | "technical" | "marketing", keyword: string) => {
    if (category === "academic") {
      setAcademicSearch(keyword);
    } else if (category === "technical") {
      setTechnicalSearch(keyword);
    } else if (category === "marketing") {
      setMarketingSearch(keyword);
    }

    setActiveTab("feeds");
    setFeedSubTab(category);

    // Scroll to the targeted category card
    setTimeout(() => {
      const element = document.getElementById(`category-section-${category}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  };

  // Fetch telemetry comparison monitor data for Date B
  const fetchComparePayload = async (targetDateB: string) => {
    if (!targetDateB) {
      setCompareData(null);
      return;
    }
    setCompareLoading(true);
    try {
      let url = `/api/monitor-data?date=${targetDateB}`;
      const response = await fetch(url);
      if (response.ok) {
        const json = await response.json();
        setCompareData(json);
      }
    } catch (err) {
      console.error("Comparison fetch failed:", err);
    } finally {
      setCompareLoading(false);
    }
  };

  // Fetch telemetry monitor data with date supporting historical archives
  const fetchMonitorPayload = async (forceRefresh = false, targetDate = selectedDate) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      let url = "/api/monitor-data";
      const params = new URLSearchParams();
      if (forceRefresh) {
        params.append("refresh", "true");
      }
      if (targetDate) {
        params.append("date", targetDate);
      }
      
      const queryStr = params.toString();
      if (queryStr) {
        url += `?${queryStr}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to communicate with hotspot API layer.");
      }
      const json = await response.json();
      setData(json);

      // Process trend alerts matching
      if (json && json.categories) {
        const allStories: HNStory[] = [];
        if (json.categories.academic && json.categories.academic.items) {
          allStories.push(...json.categories.academic.items);
        }
        if (json.categories.technical && json.categories.technical.items) {
          allStories.push(...json.categories.technical.items);
        }
        if (json.categories.marketing && json.categories.marketing.items) {
          allStories.push(...json.categories.marketing.items);
        }
        
        if (allStories.length > 0) {
          let currentCriteria = alertCriteria;
          try {
            const saved = localStorage.getItem("hn_trend_alert_criteria");
            if (saved) currentCriteria = JSON.parse(saved);
          } catch {}
          
          let currentLogs = alertLogs;
          try {
            const savedLogs = localStorage.getItem("hn_triggered_alerts_log");
            if (savedLogs) currentLogs = JSON.parse(savedLogs);
          } catch {}

          runKeywordScan(allStories, currentCriteria, currentLogs);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "未知网络连接错误");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    fetchMonitorPayload(false, date);
  };

  const handleCompareDateChange = (date: string) => {
    setCompareDate(date);
    fetchComparePayload(date);
  };

  useEffect(() => {
    fetchMonitorPayload(false);
  }, []);

  useEffect(() => {
    if (compareMode && !compareData) {
      fetchComparePayload(compareDate);
    }
  }, [compareMode, compareDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md max-w-md w-full flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500"></span>
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900">正在分析 Hacker News 本期 AI 潮汐数据...</h2>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            系统正在并发抓取 HN Algolia 近期高热度 AI 原始条目，并调用 Gemini 3.5 智能引擎进行降维和标签划分（学术、工程开发、业绩市场），请耐心等候十几秒。
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-6 max-w-md w-full rounded-2xl border border-red-100 shadow-lg text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-900">初始化智源大盘失败</h3>
          <p className="text-xs text-gray-500 mt-2">{error || "数据初始化异常"}</p>
          <button
            onClick={() => fetchMonitorPayload(false)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            重试加载
          </button>
        </div>
      </div>
    );
  }

  const handleNavigateToCategory = (category?: "academic" | "technical" | "marketing") => {
    if (!category) return;
    setActiveTab("feeds");
    setFeedSubTab(category);
    setTimeout(() => {
      const element = document.getElementById(`category-section-${category}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 selection:bg-indigo-100 flex flex-col font-sans">
      {/* 1. Dashboard Header Navigation */}
      <DashboardHeader
        lastUpdated={data.lastUpdated}
        isCached={data.isCached}
        isRefreshing={refreshing}
        onRefresh={() => fetchMonitorPayload(true)}
        postCount={data.postCount}
        currentData={data}
        onNavigateToDate={handleDateChange}
        selectedDate={selectedDate}
        alerts={alerts}
        onClearAlert={handleClearAlert}
        onMarkAlertRead={handleMarkAlertRead}
        onClearAllAlerts={handleClearAllAlerts}
      />

      {/* 2. Sticky Website Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[72px] z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-2">
            {/* Tabs Row */}
            <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl" role="tablist">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  activeTab === "dashboard"
                    ? "bg-white text-indigo-700 shadow-sm border border-gray-100"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
                role="tab"
                aria-selected={activeTab === "dashboard"}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>趋势宏观大盘 / Dashboard</span>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab("feeds")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all relative ${
                  activeTab === "feeds"
                    ? "bg-white text-indigo-700 shadow-sm border border-gray-100"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
                role="tab"
                aria-selected={activeTab === "feeds"}
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span>分类流动情报 / Segmented Feeds</span>
                <span className="bg-indigo-600 text-white font-mono text-[9px] font-black h-4 px-1.5 rounded-full flex items-center justify-center scale-90">
                  {data.categories.academic.count + data.categories.technical.count + data.categories.marketing.count}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("analyst")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  activeTab === "analyst"
                    ? "bg-white text-indigo-700 shadow-sm border border-gray-100"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
                role="tab"
                aria-selected={activeTab === "analyst"}
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>AI 研判智囊 / AI Analyst</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("saved")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all relative ${
                  activeTab === "saved"
                    ? "bg-white text-indigo-700 shadow-sm border border-gray-100"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
                role="tab"
                aria-selected={activeTab === "saved"}
              >
                <FolderHeart className="w-3.5 h-3.5" />
                <span>存盘智库 / Research Box</span>
                {bookmarkedStories.length > 0 && (
                  <span className="bg-rose-500 text-white font-mono text-[9px] font-black h-4 px-1.5 rounded-full flex items-center justify-center scale-90 animate-pulse">
                    {bookmarkedStories.length}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Helper Tip */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
              <span>多维降维视图已启用 · 无限翻流</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 font-sans">
        
        {/* Core Global Controller (Time Navigator is sticky across pages to keep alignment) */}
        <div className="mb-6">
          <TimeTravelNavigator
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            isRefreshing={refreshing}
            compareMode={compareMode}
            setCompareMode={setCompareMode}
            compareDate={compareDate}
            onCompareDateChange={handleCompareDateChange}
            compareLoading={compareLoading}
          />
        </div>

        {/* Temporal Overlaid Comparison Panel */}
        {compareMode && (
          <div className="mb-6">
            <TrendComparisonPanel
              dataA={data}
              dataB={compareData}
              dateA={selectedDate}
              dateB={compareDate}
              loadingB={compareLoading}
            />
          </div>
        )}

        {/* CONDITIONALLY RENDER TAB VIEWPORT (No generic long scrolling!) */}
        
        {/* VIEW 1: MACRO TRENDS DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Intro Pitch */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  研究观测站核心理念 / Executive Strategy
                </h2>
                <p className="text-xs text-gray-500 max-w-3xl leading-relaxed">
                  这里是针对 AI 开发、学术及商业决策者的专用热点面板。普通舆情监测由于没有领域视角而常常杂乱无章，我们通过 <strong>学术研究 (Academic)</strong>、
                  <strong>技术架构 (Technical)</strong> 以及 <strong>业界市场 (Marketing)</strong> 三分流向，对 Hacker News 所有人工智能相关高赞帖子进行智能归类与摘要提炼，辅以后台大模型辅助问答。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("analyst")}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-150 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-all duration-150 cursor-pointer"
              >
                直接咨询 AI 智囊 <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              </button>
            </div>

            {/* Bento Macro Stats Grid */}
            <BentoStats
              academicCount={data.categories.academic.count}
              technicalCount={data.categories.technical.count}
              marketingCount={data.categories.marketing.count}
              topEntities={data.globalStats.topEntities}
              generalInsights={data.globalStats.generalInsights}
              communitySentiment={data.communitySentiment}
            />

            {/* Matrix & Canvas Row */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              {/* Keywords Discussion Activity Heatmap Matrix */}
              <KeywordActivityHeatmap currentData={data} onKeywordSelect={handleKeywordSelect} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Weekly & Monthly Macro summary and Keyword Trend Tracker */}
              <div className="lg:col-span-2">
                <TrendSummaryBoard />
              </div>
              
              {/* Dynamic Keyword Link/Network Topology Canvas */}
              <div className="lg:col-span-1">
                <NetworkAssociationGraph currentData={data} onAddAlert={handleAddAlert} />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DYNAMIC CLASSIFIED FEEDS */}
        {activeTab === "feeds" && (
          <div className="space-y-6">
            {/* Feed Tab Sub-navigation Bar */}
            <div className="bg-slate-100 p-1.5 rounded-xl border border-gray-200 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2.5">
                🔎 分流筛选 / Focus Category:
              </span>
              <button
                type="button"
                onClick={() => setFeedSubTab("all")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all ${
                  feedSubTab === "all"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-transparent text-gray-600 hover:bg-slate-200"
                }`}
              >
                📂 汇总透视 / Show All
              </button>
              <button
                type="button"
                onClick={() => setFeedSubTab("academic")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                  feedSubTab === "academic"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-transparent text-gray-600 hover:bg-blue-50"
                }`}
              >
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block" />
                论文学术 ({data.categories.academic.count})
              </button>
              <button
                type="button"
                onClick={() => setFeedSubTab("technical")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                  feedSubTab === "technical"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-transparent text-gray-600 hover:bg-amber-50"
                }`}
              >
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block" />
                代码硬件 ({data.categories.technical.count})
              </button>
              <button
                type="button"
                onClick={() => setFeedSubTab("marketing")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                  feedSubTab === "marketing"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-transparent text-gray-600 hover:bg-teal-50"
                }`}
              >
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full inline-block" />
                商业市场 ({data.categories.marketing.count})
              </button>

              <button
                type="button"
                onClick={() => setFeedSubTab("newcomments")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                  feedSubTab === "newcomments"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-transparent text-gray-600 hover:bg-indigo-50"
                }`}
              >
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full inline-block animate-pulse" />
                💬 评论外链精选 ({
                  [
                    ...(data.categories.academic.items || []),
                    ...(data.categories.technical.items || []),
                    ...(data.categories.marketing.items || [])
                  ].filter(item => item.originSegment === "newcomments").length
                })
              </button>

              <button
                type="button"
                onClick={() => setFeedSubTab("community_pulse")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                  feedSubTab === "community_pulse"
                    ? "bg-purple-650 text-white shadow-sm"
                    : "bg-transparent text-gray-600 hover:bg-purple-50"
                }`}
              >
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full inline-block" />
                ⚡ 社区脉搏 (Ask & Show) ({
                  [
                    ...(data.categories.academic.items || []),
                    ...(data.categories.technical.items || []),
                    ...(data.categories.marketing.items || [])
                  ].filter(item => item.originSegment === "ask_hn" || item.originSegment === "show_hn").length
                })
              </button>

              <button
                type="button"
                onClick={() => setFeedSubTab("careers_jobs")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                  feedSubTab === "careers_jobs"
                    ? "bg-teal-650 text-white shadow-sm"
                    : "bg-transparent text-gray-600 hover:bg-teal-50"
                }`}
              >
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full inline-block" />
                💼 智能 AI 投递 Careers
              </button>

              <button
                type="button"
                onClick={() => setFeedSubTab("user_mentions")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                  feedSubTab === "user_mentions"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-transparent text-gray-600 hover:bg-rose-50"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>🔔 极客发言预警 Mentions</span>
              </button>

              <button
                type="button"
                id="hn-live-feed-button"
                onClick={() => setFeedSubTab("hn_live_feed")}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                  feedSubTab === "hn_live_feed"
                    ? "bg-rose-650 text-white shadow-sm"
                    : "bg-transparent text-gray-600 hover:bg-rose-50"
                }`}
              >
                <Radio className={`w-3.5 h-3.5 text-rose-500 ${feedSubTab === "hn_live_feed" ? "animate-pulse" : ""}`} />
                <span>📡 HN 极客实时直达 Live</span>
              </button>
            </div>

            {/* Dynamic Grid Column Count and Card rendering based on feedSubTab choice */}
            {feedSubTab === "all" ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <HotspotCategoryCard
                  type="academic"
                  title="Academic Academic 论文学术"
                  count={data.categories.academic.count}
                  hotspots={data.categories.academic.hotspots}
                  executiveSummary={data.categories.academic.executiveSummary}
                  items={data.categories.academic.items}
                  searchQuery={academicSearch}
                  onSearchQueryChange={setAcademicSearch}
                  bookmarkedIds={bookmarkedIds}
                  onToggleBookmark={handleToggleBookmark}
                />

                <HotspotCategoryCard
                  type="technical"
                  title="Technical Engineering 架构与技术"
                  count={data.categories.technical.count}
                  hotspots={data.categories.technical.hotspots}
                  executiveSummary={data.categories.technical.executiveSummary}
                  items={data.categories.technical.items}
                  searchQuery={technicalSearch}
                  onSearchQueryChange={setTechnicalSearch}
                  bookmarkedIds={bookmarkedIds}
                  onToggleBookmark={handleToggleBookmark}
                />

                <HotspotCategoryCard
                  type="marketing"
                  title="Marketing Business 商业与市场"
                  count={data.categories.marketing.count}
                  hotspots={data.categories.marketing.hotspots}
                  executiveSummary={data.categories.marketing.executiveSummary}
                  items={data.categories.marketing.items}
                  searchQuery={marketingSearch}
                  onSearchQueryChange={setMarketingSearch}
                  bookmarkedIds={bookmarkedIds}
                  onToggleBookmark={handleToggleBookmark}
                />
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {feedSubTab === "academic" && (
                  <HotspotCategoryCard
                    type="academic"
                    title="Academic Academic 论文学术"
                    count={data.categories.academic.count}
                    hotspots={data.categories.academic.hotspots}
                    executiveSummary={data.categories.academic.executiveSummary}
                    items={data.categories.academic.items}
                    searchQuery={academicSearch}
                    onSearchQueryChange={setAcademicSearch}
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={handleToggleBookmark}
                  />
                )}

                {feedSubTab === "technical" && (
                  <HotspotCategoryCard
                    type="technical"
                    title="Technical Engineering 架构与技术"
                    count={data.categories.technical.count}
                    hotspots={data.categories.technical.hotspots}
                    executiveSummary={data.categories.technical.executiveSummary}
                    items={data.categories.technical.items}
                    searchQuery={technicalSearch}
                    onSearchQueryChange={setTechnicalSearch}
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={handleToggleBookmark}
                  />
                )}

                {feedSubTab === "marketing" && (
                  <HotspotCategoryCard
                    type="marketing"
                    title="Marketing Business 商业与市场"
                    count={data.categories.marketing.count}
                    hotspots={data.categories.marketing.hotspots}
                    executiveSummary={data.categories.marketing.executiveSummary}
                    items={data.categories.marketing.items}
                    searchQuery={marketingSearch}
                    onSearchQueryChange={setMarketingSearch}
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={handleToggleBookmark}
                  />
                )}

                {feedSubTab === "newcomments" && (
                  <NewCommentsPanel
                    currentData={data}
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={handleToggleBookmark}
                  />
                )}

                {feedSubTab === "community_pulse" && (
                  <CommunityPulsePanel
                    currentData={data}
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={handleToggleBookmark}
                  />
                )}

                {feedSubTab === "careers_jobs" && (
                  <CareersJobsPanel />
                )}

                {feedSubTab === "user_mentions" && (
                  <MentionsPanel
                    currentData={data}
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={handleToggleBookmark}
                    onAddAlert={handleAddAlert}
                  />
                )}

                {feedSubTab === "hn_live_feed" && (
                  <HNLiveFeedPanel
                    bookmarkedIds={bookmarkedIds}
                    onToggleBookmark={handleToggleBookmark}
                    onNewStoriesLoaded={handleCheckTrendAlerts}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: EXPERT AI ANALYSIS CHAT */}
        {activeTab === "analyst" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-400/20 text-white shadow-xl">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-400 animate-pulse" />
                24/7 AI 趋势报告智能研判助手
              </h3>
              <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                基于 Hacker News 收集的现场原帖，AI 智脑助手已预加载了当前所选日期 ({selectedDate || "Live Realtime"}) 的全部上下文标签、高热词以及分布密度。您可以通过简单的中文提问，来让它帮您降维提炼当前的行业剧变。
              </p>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-2">
              <TrendAnalystChat selectedDate={selectedDate} />
            </div>
          </div>
        )}

        {/* VIEW 4: PERSONAL RESEARCH DATABASE (SAVED) */}
        {activeTab === "saved" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Main bookmarked analytical workspace */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-rose-500 fill-rose-500" />
                  已存盘的研究决策卡片 ({bookmarkedStories.length} 篇)
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  此处是您筛选储蓄的重要人工智能情报归档。当您在大盘或分类流动源中看到任何高价值的技术、商业、或者是学术大作，标记星签即可在此形成您自有的<b>离线不泄露安全决策沙盒</b>。
                </p>

                {bookmarkedStories.length === 0 ? (
                  <div className="text-center py-16 border rounded-xl bg-gray-50/50 border-dashed border-gray-300">
                    <FolderHeart className="w-12 h-12 text-gray-350 mx-auto stroke-1" />
                    <p className="text-xs font-bold text-gray-500 mt-3">研究库当前没有星标精品</p>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      请前往<b>分类流动情报</b>或<b>趋势宏观大盘</b>卡片，直接在感兴趣的文章下方点击书旗星标即可储存在这里。
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("feeds")}
                      className="mt-4 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      前往情报分类分流
                    </button>
                  </div>
                ) : (() => {
                  const filteredResearchStories = bookmarkedStories.filter((story) => {
                    const status = story.readStatus || "reading";
                    if (researchFilter === "all") return true;
                    return status === researchFilter;
                  });

                  return (
                    <div className="space-y-4">
                      {/* Research Task Status Filter Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-1.5 min-w-fit">
                          <BookOpen className="w-4 h-4 text-indigo-550" />
                          <span className="text-xs font-extrabold text-slate-700">阅读研究监控:</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                          <button
                            type="button"
                            onClick={() => setResearchFilter("all")}
                            className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition flex items-center gap-1 border ${
                              researchFilter === "all"
                                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-slate-100/80"
                            }`}
                          >
                            <span>全部 ({bookmarkedStories.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setResearchFilter("reading")}
                            className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition flex items-center gap-1.5 border ${
                              researchFilter === "reading"
                                ? "bg-sky-600 border-sky-600 text-white shadow-xs"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>在读/待阅 ({bookmarkedStories.filter(s => (s.readStatus || "reading") === "reading").length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setResearchFilter("completed")}
                            className={`px-3 py-1.5 text-xs font-extrabold rounded-lg cursor-pointer transition flex items-center gap-1.5 border ${
                              researchFilter === "completed"
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-emerald-50 hover:text-emerald-750 hover:border-emerald-300"
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>已读完 ({bookmarkedStories.filter(s => s.readStatus === "completed").length})</span>
                          </button>
                        </div>
                      </div>

                      {/* Filter fallback empty state */}
                      {filteredResearchStories.length === 0 ? (
                        <div className="text-center py-16 border rounded-xl bg-slate-50/50 border-dashed border-gray-200 flex flex-col items-center justify-center space-y-2">
                          <BookOpen className="w-10 h-10 text-slate-300 animate-pulse" />
                          <p className="text-xs font-bold text-gray-500">此分类状态下空空如也</p>
                          <p className="text-[11px] text-gray-400 max-w-sm mx-auto leading-relaxed">
                            您还没有将任何存盘卡片置于该分类，或者目前尚无对应阅读状态的文章。您可以在下方卡片中点击「标记已读」或者「重回阅读」来调整它们的进度。
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredResearchStories.map((story) => (
                            <div
                              key={story.id}
                              className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2 border-b border-gray-150 pb-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                      story.categoryTag === "academic" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                      story.categoryTag === "technical" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                      story.categoryTag === "marketing" ? "bg-teal-50 text-teal-700 border-teal-200" :
                                      "bg-slate-50 text-slate-700 border-slate-200"
                                    }`}>
                                      {story.categoryTag === "academic" ? "论文学术" :
                                       story.categoryTag === "technical" ? "代码架构" :
                                       story.categoryTag === "marketing" ? "商业市场" : "通用综合"}
                                    </span>

                                    {/* Read Status Badge */}
                                    {(story.readStatus || "reading") === "reading" ? (
                                      <span className="text-[9px] font-extrabold bg-sky-50 text-sky-700 border border-sky-150 px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse" title="在读 / Read Later">
                                        <Clock className="w-2.5 h-2.5 text-sky-550 shrink-0" />
                                        <span>Read Later</span>
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full inline-flex items-center gap-1" title="已读 / Completed">
                                        <CheckCircle className="w-2.5 h-2.5 text-emerald-550 shrink-0" />
                                        <span>Completed</span>
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleBookmark(story)}
                                    className="text-gray-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                                    title="取消存盘"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                <a
                                  href={story.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-gray-800 hover:text-indigo-600 leading-normal block group-hover:underline"
                                >
                                  {story.title}
                                  <ExternalLink className="w-3 h-3 text-gray-400 inline ml-1 shrink-0" />
                                </a>

                                <p className="text-[10px] text-gray-450">由 @{story.author} 提交讨论</p>

                                {story.aiSummary && (
                                  <div className="bg-indigo-50/80 p-2.5 rounded-lg text-[10.5px] leading-relaxed text-indigo-950 border-l-2 border-indigo-500 italic mt-2">
                                    <b>🧠 摘要提炼:</b> {story.aiSummary}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-gray-150 text-[10px] text-gray-450 gap-2">
                                <span className="font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                                  {story.points} HN Score
                                </span>

                                {/* Status Switch trigger */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBookmarkStatus(story.id, (story.readStatus || "reading") === "reading" ? "completed" : "reading")}
                                  className={`px-2 py-1 text-[9px] font-extrabold rounded-md cursor-pointer transition-all border inline-flex items-center gap-1 shrink-0 ${
                                    (story.readStatus || "reading") === "reading"
                                      ? "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"
                                      : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                  title={(story.readStatus || "reading") === "reading" ? "点击标记为已读完" : "点击标回正在阅读"}
                                >
                                  {(story.readStatus || "reading") === "reading" ? (
                                    <>
                                      <CheckCircle className="w-3 h-3 text-sky-650" />
                                      <span>标记已读 (Read ☑)</span>
                                    </>
                                  ) : (
                                    <>
                                      <BookOpen className="w-3 h-3 text-emerald-650" />
                                      <span>重回阅读 (Recheck 📖)</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right sidebar quick summary component */}
            <div className="lg:col-span-1 space-y-6">
              <SavedInsightsSidebar
                bookmarkedStories={bookmarkedStories}
                onToggleBookmark={handleToggleBookmark}
                onClearAll={handleClearAllBookmarks}
                onNavigateToCategory={handleNavigateToCategory}
                onUpdateBookmarkStatus={handleUpdateBookmarkStatus}
              />
              <TrendAlertManager
                criteria={alertCriteria}
                onAddCriterion={handleAddCriterion}
                onToggleCriterion={handleToggleCriterion}
                onDeleteCriterion={handleDeleteCriterion}
                alertLogs={alertLogs}
                onClearLogs={handleClearLogs}
                onDeleteLog={handleDeleteLog}
                bookmarkedIds={bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
                onSimulateTrigger={handleSimulateTrigger}
              />
            </div>
          </div>
        )}

      </main>

      {/* Footer System Credits */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-16 text-center text-xs text-gray-400">
        <p>© 2026 AI Hotspot Monitor. 基于 Hacker News 全网实时数据精炼渲染。</p>
        <p className="mt-1 font-mono text-[10px]">Cloud Run Sandboxed Container Port 3000 Node Pipeline via Tailwind CSS 4.x</p>
      </footer>

      {/* Global Trend Alert Toasts */}
      <TrendAlertToastContainer
        toasts={activeToasts}
        onDismiss={handleDismissToast}
        bookmarkedIds={bookmarkedIds}
        onToggleBookmark={handleToggleBookmark}
      />
    </div>
  );
}
