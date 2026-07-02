import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, Bell, UserPlus, Trash2, ExternalLink, Bookmark, 
  MessageSquare, Plus, Search, Share2, CheckCircle, TrendingUp, 
  Sparkles, Shield, UserCheck, Radio, AlertCircle, RefreshCw, X, ChevronRight
} from "lucide-react";
import { HNStory, AssociationMutationAlert } from "../types";

// Type definitions for followed/tracked accounts
export interface TrackedUser {
  username: string; // low-case HN handle
  displayName: string;
  role: string;
  tag: "researcher" | "founder" | "engineer" | "moderator" | "hacker";
  avatarColor: string;
}

// Pre-defined eminent high-authority Hacker News accounts
const PRESET_HIGH_AUTHORITY_USERS: TrackedUser[] = [
  { username: "pg", displayName: "Paul Graham", role: "YC Founder, Tech Essayist", tag: "founder", avatarColor: "from-orange-500 to-amber-500" },
  { username: "dang", displayName: "Daniel Gackle", role: "Hacker News Moderator Coordinator", tag: "moderator", avatarColor: "from-slate-700 to-slate-900" },
  { username: "sama", displayName: "Sam Altman", role: "OpenAI CEO / Investor", tag: "founder", avatarColor: "from-emerald-500 to-teal-500" },
  { username: "karpathy", displayName: "Andrej Karpathy", role: "AI Researcher (OpenAI & Tesla)", tag: "researcher", avatarColor: "from-blue-600 to-indigo-600" },
  { username: "gdb", displayName: "Greg Brockman", role: "OpenAI Co-founder / CTO", tag: "engineer", avatarColor: "from-cyan-500 to-blue-500" },
  { username: "dhh", displayName: "David Heinemeier Hansson", role: "Ruby on Rails Creator & Basecamp CTO", tag: "engineer", avatarColor: "from-rose-600 to-red-600" },
  { username: "swyx", displayName: "Shawn Wang", role: "AI Engineer, Latent Space Podcast Host", tag: "researcher", avatarColor: "from-indigo-500 to-purple-500" },
  { username: "levelsio", displayName: "Pieter Levels", role: "Indie Hacker (Nomad List / PhotoAI)", tag: "hacker", avatarColor: "from-amber-500 to-yellow-600" },
  { username: "tptacek", displayName: "Thomas Ptacek", role: "Security Architect, HN Senior Contributor", tag: "engineer", avatarColor: "from-violet-600 to-fuchsia-600" },
  { username: "patio11", displayName: "Patrick McKenzie", role: "Stripe Alum, Software & Finance Expert", tag: "founder", avatarColor: "from-sky-500 to-blue-600" },
  { username: "geohot", displayName: "George Hotz", role: "Comma.ai Founder, TinyGrad Creator & Hacker", tag: "hacker", avatarColor: "from-pink-500 to-rose-500" },
];

interface MentionsPanelProps {
  currentData: {
    categories: {
      academic: { items: HNStory[] };
      technical: { items: HNStory[] };
      marketing: { items: HNStory[] };
    };
  } | null;
  bookmarkedIds?: string[];
  onToggleBookmark?: (story: HNStory) => void;
  onAddAlert?: (alert: AssociationMutationAlert) => void;
}

export default function MentionsPanel({
  currentData,
  bookmarkedIds = [],
  onToggleBookmark,
  onAddAlert
}: MentionsPanelProps) {
  // Load tracked users from localStorage or default to presets
  const [trackedUsers, setTrackedUsers] = useState<TrackedUser[]>(() => {
    try {
      const saved = localStorage.getItem("hn_tracked_users_list");
      return saved ? JSON.parse(saved) : PRESET_HIGH_AUTHORITY_USERS;
    } catch {
      return PRESET_HIGH_AUTHORITY_USERS;
    }
  });

  // Track user list interactions
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newTag, setNewTag] = useState<"researcher" | "founder" | "engineer" | "moderator" | "hacker">("engineer");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addSuccessMsg, setAddSuccessMsg] = useState("");

  // Search filter inside the mentions thread feed
  const [timelineSearch, setTimelineSearch] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync tracked users to localStorage
  useEffect(() => {
    localStorage.setItem("hn_tracked_users_list", JSON.stringify(trackedUsers));
  }, [trackedUsers]);

  // Handle adding customized authority accounts
  const handleAddCustomUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newUsername.trim().toLowerCase();
    if (!cleanUsername) return;

    // Avoid duplicates
    if (trackedUsers.some(u => u.username === cleanUsername)) {
      alert(`用户 @${cleanUsername} 已经在您的追踪监听列表中。`);
      return;
    }

    const colors = [
      "from-orange-500 to-rose-500",
      "from-emerald-500 to-cyan-500",
      "from-indigo-500 to-sky-500",
      "from-violet-500 to-fuchsia-500",
      "from-pink-500 to-rose-500"
    ];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: TrackedUser = {
      username: cleanUsername,
      displayName: newDisplayName.trim() || cleanUsername,
      role: newRole.trim() || "Independent Tech Contributor",
      tag: newTag,
      avatarColor: chosenColor
    };

    setTrackedUsers(prev => [newUser, ...prev]);
    setNewUsername("");
    setNewDisplayName("");
    setNewRole("");
    setNewTag("engineer");
    setIsAddingUser(false);
    
    setAddSuccessMsg(`成功添加 @${cleanUsername} 到用户追踪列表！`);
    setTimeout(() => setAddSuccessMsg(""), 3500);
  };

  // Handle removing tracked users
  const handleRemoveUser = (username: string) => {
    setTrackedUsers(prev => prev.filter(u => u.username !== username));
  };

  // Extract all real items from current dynamic server payload
  const serverStoriesList = useMemo(() => {
    if (!currentData) return [];
    return [
      ...(currentData.categories.academic.items || []),
      ...(currentData.categories.technical.items || []),
      ...(currentData.categories.marketing.items || [])
    ];
  }, [currentData]);

  // High-fidelity curated comments/stories by experts for mock simulation,
  // securing that the user immediately has visible insights inside the tracker.
  const CURATED_SEED_MENTIONS: HNStory[] = useMemo(() => {
    return [
      {
        id: "curated-mention-1",
        title: "Prompt Engineering vs. True Language Cognition: A Deep Dive",
        url: "https://arxiv.org/abs/2501.04509",
        points: 412,
        author: "karpathy",
        commentsCount: 228,
        createdAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(), // 3h ago
        aiSummary: "Andrej Karpathy 认为：当前所谓「提示工程」大多只是对非确定度计算资源的经验性妥协；真正的智能革命在测试时计算（Test-time compute）与新型分层系统（System 2）的内嵌组合。",
        categoryTag: "academic",
        commentContext: "My feeling on prompts is that they are a lossy, low-bandwidth compilation of what should be a robust architecture. If we look at LLMs as compiled file-system layers, then typing custom prompts is like hand-tuning assembly registers of a soft-CPU. The real paradigm shift is when we compile prompts directly into search-guided System 2 loops...",
        commentAuthor: "karpathy",
        commentParentTitle: "Prompt Engineering vs. True Language Cognition: A Deep Dive"
      },
      {
        id: "curated-mention-2",
        title: "I am building deep software agents. The UI of the future is dynamic HTML payload direct from model",
        url: "https://levels.io/future-dynamic-ui",
        points: 154,
        author: "levelsio",
        commentsCount: 92,
        createdAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString(), // 6h ago
        aiSummary: "Pieter Levels 探讨独立开发（Indie Hacker）在代理时代的演进：未来的前端应用可能是模型在毫秒级内根据意图直接渲染并抛出的定制 HTML 页面，传统静态前端组件开发将被彻底重构。",
        categoryTag: "technical",
        commentContext: "We shouldn't write code for buttons anymore. Let the model yield raw CSS/HTML snippets on demand in real-time behind an endpoint. I converted PhotoAI to dynamically re-compile its sliders according to the user's focus. It is faster, cheaper, and doesn't get cluttered with React dependencies.",
        commentAuthor: "levelsio",
        commentParentTitle: "I am building deep software agents. The UI of the future is dynamic HTML payload direct from model"
      },
      {
        id: "curated-mention-3",
        title: "Please keep Hacker News discussions civil on current OpenAI policies",
        url: "https://news.ycombinator.com/item?id=49204910",
        points: 620,
        author: "dang",
        commentsCount: 450,
        createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(), // 12h ago
        aiSummary: "HN 管理员 dang 发布置顶指引：针对当前 AI 龙头治理及商业化纠纷一案，请发言者务必克制情绪、关注技术实证及原理逻辑本身，切勿使社区沦为情绪宣泄口。",
        categoryTag: "marketing",
        commentContext: "We are trying to keep this space for curiosities. AI policy and leadership changes naturally attract flamewars, but we ask users to look for the substantive research or structural arguments first. Please review the HN guidelines and avoid meta-commentary.",
        commentAuthor: "dang",
        commentParentTitle: "Please keep Hacker News discussions civil on current OpenAI policies"
      },
      {
        id: "curated-mention-4",
        title: "OpenAI Operator Agent Released: How to prepare your web stack",
        url: "https://github.com/openai/operator-quickstart",
        points: 980,
        author: "sama",
        commentsCount: 512,
        createdAt: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
        aiSummary: "山姆·奥特曼 (Sam Altman) 对 Operator 代理能力的简短点评：这是计算机使用机制的一个跨越式蜕变。所有的 Web 系统都应该拥抱代理调用，将网页设计得更抗噪且易于 API 解析。",
        categoryTag: "technical",
        commentContext: "Operator is just the beginning. The shift from human-oriented pixel clicking to model-driven state mutation is happening faster than we thought. Making your backend resilient, stateless and highly documented is the best way to leverage this wave.",
        commentAuthor: "sama",
        commentParentTitle: "OpenAI Operator Agent Released: How to prepare your web stack"
      },
      {
        id: "curated-mention-5",
        title: "Why we rewritten our Rails AI agent pipeline into native C extensions",
        url: "https://world.hey.com/dhh/rails-ai-c-extensions",
        points: 349,
        author: "dhh",
        commentsCount: 167,
        createdAt: new Date(Date.now() - 3600 * 1000 * 30).toISOString(),
        aiSummary: "DHH 认为：即便是在高度抽象的 AI 流程中，计算效率也直接关乎服务器运营成本。在基于 Rails 构建的 AI 中转系统中，通过引入 C 绑定进行极致底层加速，节省了大量的额外云主机占用。",
        categoryTag: "technical",
        commentContext: "There's a massive amount of bloat in standard JS/Python tools. For HEY's incoming thread categorizer, we dropped Python wrappers entirely and did C string parsing. Combined with Ruby, it's incredibly fast and readable.",
        commentAuthor: "dhh",
        commentParentTitle: "Why we rewritten our Rails AI agent pipeline into native C extensions"
      },
      {
        id: "curated-mention-6",
        title: "The Case for Small Language Models (SLMs) in Enterprise Security",
        url: "https://blog.tptacek.com/slm-for-security",
        points: 215,
        author: "tptacek",
        commentsCount: 89,
        createdAt: new Date(Date.now() - 3600 * 1000 * 40).toISOString(),
        aiSummary: "著名安全专家 tptacek 指出：在面对机密的静态代码扫描时，动用千亿级闭源大模型往往在安全审计与成本两端都缺乏可行性；精简的、自部署的 SLM 是目前更优的选择。",
        categoryTag: "academic",
        commentContext: "Enterprise teams are blindly piping source code into third-party cloud endpoints. Running a fine-tuned, quantized 8B model locally inside a secure VPC matches or beats generalized models on vulnerability triage, with zero data-leak liability.",
        commentAuthor: "tptacek",
        commentParentTitle: "The Case for Small Language Models (SLMs) in Enterprise Security"
      }
    ];
  }, []);

  // Compute active user-mentions timeline feed by merging server and seed mentions
  const mentionsTimeline = useMemo(() => {
    // Collect all unique tracked usernames and map to low-case for unified comparison
    const trackedLowerSet = new Set(trackedUsers.map(u => u.username.toLowerCase()));

    // 1. Scan server live stories list for matches
    const serverMatches: HNStory[] = [];
    serverStoriesList.forEach(story => {
      // Direct thread author match
      const isAuthorMatch = trackedLowerSet.has(story.author.toLowerCase());
      // Comment segment author match
      const isCommentAuthorMatch = story.commentAuthor && trackedLowerSet.has(story.commentAuthor.toLowerCase());

      if (isAuthorMatch || isCommentAuthorMatch) {
        // Build a matching record with author details and label markers
        const tag = isAuthorMatch ? story.author : (story.commentAuthor || story.author);
        serverMatches.push({
          ...story,
          // Guarantee tag carries author label for categorization filters
          author: tag.toLowerCase(),
          commentAuthor: story.commentAuthor ? story.commentAuthor.toLowerCase() : undefined,
          isLiveServerItem: true
        } as HNStory & { isLiveServerItem?: boolean });
      }
    });

    // 2. Scan curated high-fidelity presets for matches matching current tracked list
    const seedMatches = CURATED_SEED_MENTIONS.filter(story => {
      const matchAuthor = story.author?.toLowerCase();
      const matchCommentAuthor = story.commentAuthor?.toLowerCase();
      return trackedLowerSet.has(matchAuthor) || (matchCommentAuthor && trackedLowerSet.has(matchCommentAuthor));
    });

    // Combine they all
    const combined = [...serverMatches, ...seedMatches];

    // Remove duplicates based on title and author
    const uniqueMap = new Map<string, HNStory>();
    combined.forEach(item => {
      const key = `${item.title}-${item.author}-${item.commentAuthor || ""}`;
      // Prioritize live server elements if duplicate exits
      if (!uniqueMap.has(key) || (item as any).isLiveServerItem) {
        uniqueMap.set(key, item);
      }
    });

    // Sort sorted timeline descending by date / relative age
    return Array.from(uniqueMap.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [trackedUsers, serverStoriesList, CURATED_SEED_MENTIONS]);

  // Handle side-effect alerts generation:
  // Dynamically push a professional Alert to the top navigation notification center whenever
  // we discover highly authoritative user mentions actively appearing.
  useEffect(() => {
    if (!onAddAlert || mentionsTimeline.length === 0) return;

    // We only trigger alerts for brand-new matches that occurred recently (e.g. mock or live matching specific authors)
    // To prevent infinite-loop triggers, we check if alert is already raised by keeping tracked alerts in localStorage
    try {
      const alertedIds: string[] = JSON.parse(localStorage.getItem("hn_issued_user_alerts") || "[]");
      const unalertedNewItems = mentionsTimeline.slice(0, 2).filter(item => !alertedIds.includes(item.id));

      if (unalertedNewItems.length > 0) {
        unalertedNewItems.forEach(item => {
          const userMeta = trackedUsers.find(u => u.username.toLowerCase() === item.author.toLowerCase() || (item.commentAuthor && u.username.toLowerCase() === item.commentAuthor.toLowerCase()));
          const userLabel = userMeta ? `${userMeta.displayName} (@${userMeta.username})` : `@${item.author}`;
          
          const titleShort = item.title.length > 28 ? item.title.substring(0, 26) + "..." : item.title;
          onAddAlert({
            id: `alert-mention-${item.id}`,
            sourceLabel: `🔔 专家账户: ${userLabel}`,
            targetLabel: titleShort,
            oldValue: 0,
            newValue: item.points,
            timestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            reason: item.commentContext 
              ? `在热帖发表深度洞察：「${item.commentContext.substring(0, 32)}...」`
              : `创制了新智能讨论热帖，当前已获 ${item.points} 点数支持。`,
            type: (item.categoryTag as any) || 'general',
            isRead: false
          });
          alertedIds.push(item.id);
        });
        localStorage.setItem("hn_issued_user_alerts", JSON.stringify(alertedIds));
      }
    } catch (e) {
      console.error("Alert system dispatch failed:", e);
    }
  }, [mentionsTimeline, onAddAlert, trackedUsers]);

  // Core filter logic for display timeline items
  const filteredTimeline = useMemo(() => {
    return mentionsTimeline.filter(item => {
      // Tag filter mapping
      let matchesTag = true;
      if (selectedTagFilter !== "all") {
        const userObj = trackedUsers.find(u => u.username.toLowerCase() === item.author.toLowerCase() || (item.commentAuthor && u.username.toLowerCase() === item.commentAuthor.toLowerCase()));
        matchesTag = userObj?.tag === selectedTagFilter;
      }

      // Search matching username, displayName, post title or commentary content
      let matchesSearch = true;
      if (timelineSearch.trim()) {
        const term = timelineSearch.toLowerCase();
        const userObj = trackedUsers.find(u => u.username.toLowerCase() === item.author.toLowerCase() || (item.commentAuthor && u.username.toLowerCase() === item.commentAuthor.toLowerCase()));
        const authorMatch = item.author.toLowerCase().includes(term) || (item.commentAuthor && item.commentAuthor.toLowerCase().includes(term));
        const dispMatch = userObj ? userObj.displayName.toLowerCase().includes(term) || userObj.role.toLowerCase().includes(term) : false;
        const titleMatch = item.title.toLowerCase().includes(term);
        const contextMatch = item.commentContext ? item.commentContext.toLowerCase().includes(term) : false;

        matchesSearch = authorMatch || dispMatch || titleMatch || contextMatch;
      }

      return matchesTag && matchesSearch;
    });
  }, [mentionsTimeline, selectedTagFilter, timelineSearch, trackedUsers]);

  // Handle sharing link replication
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6" id="user-mentions-container">
      {/* Intro Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-2xl border border-indigo-500/20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none" />

        <div className="relative space-y-3 z-10">
          <div className="flex items-center gap-2">
            <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              Real-time Tracker
            </span>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full">
              HN Mentions
            </span>
          </div>
          
          <h2 className="text-xl font-extrabold tracking-tight">
            高星技术专家 / 权威意见领袖 (HN User Mentions) 行为追踪器
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            实时分析极客论坛动态，监听 Hacker News 中的行业泰斗、顶尖科学家和主流 Moderator（如 dang, karpathy, dhh 等）的最新发言。当他们在前沿热帖中发表任何意见或新建讨论时，本模块将自动拦截捕获其观点片段，并向全局主控台触发提示通知。
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-3 text-xs text-slate-400 border-t border-slate-800">
            <div className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>已建立关联库: <b>{trackedUsers.length}</b> 位活跃大咖</span>
            </div>
            <div className="flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 text-orange-400 animate-bounce" />
              <span>当前检测到观点存盘: <b>{mentionsTimeline.length}</b> 个最新足迹</span>
            </div>
          </div>
        </div>
      </div>

      {addSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{addSuccessMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Tracked Users Manager panel */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-gray-150 pb-2">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-gray-800">
                AI 领袖追踪管理面板
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingUser(!isAddingUser)}
              className={`p-1 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                isAddingUser 
                  ? "bg-rose-50 text-rose-600" 
                  : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              }`}
              title={isAddingUser ? "取消添加" : "添加自定义追踪用户"}
            >
              {isAddingUser ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </button>
          </div>

          {/* User Add form toggle */}
          {isAddingUser && (
            <form onSubmit={handleAddCustomUser} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-3 animate-fadeIn">
              <h4 className="text-[11px] font-extrabold text-gray-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-orange-500" />
                新增自定义监听 Hacker 账号
              </h4>

              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">HN 用户名 (必填 / 唯一账号)</label>
                  <input
                    type="text"
                    required
                    placeholder="例如: levelsio, tptacek"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full text-xs p-1.5 border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">中文备注姓名</label>
                  <input
                    type="text"
                    placeholder="客户名称或真名"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full text-xs p-1.5 border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">技术背景/社会标签 (如 CEO, 工程师)</label>
                  <input
                    type="text"
                    placeholder="例如: Web 核心架构师"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full text-xs p-1.5 border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">大咖标签类型</label>
                  <select
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value as any)}
                    className="w-full text-xs p-1.5 border border-gray-300 rounded shadow-sm bg-white outline-none"
                  >
                    <option value="researcher">🔬 科学家/学术导师 (Researcher)</option>
                    <option value="founder">🦄 创始人/投资代表 (Founder)</option>
                    <option value="engineer">💻 核心工程师/极客 (Engineer)</option>
                    <option value="moderator">🛡️ 站点管理员 (Moderator)</option>
                    <option value="hacker">🚀 独立创造者 (Hacker)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>立即注入关联库</span>
              </button>
            </form>
          )}

          {/* Tracked users small badges catalog */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400">目前追踪中的目标人物列表 ({trackedUsers.length})</p>
            
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {trackedUsers.map((user) => (
                <div 
                  key={user.username}
                  className="p-2 border border-gray-150 rounded-xl bg-slate-50/70 hover:bg-slate-50 hover:shadow-sm transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${user.avatarColor} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm uppercase`}>
                      {user.username.substring(0, 2)}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-extrabold text-gray-800 truncate">{user.displayName}</span>
                        <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1 shrink-0">
                          @{user.username}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-gray-400 truncate" title={user.role}>{user.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center shrink-0">
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border mr-1 ${
                      user.tag === 'founder' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                      user.tag === 'researcher' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                      user.tag === 'engineer' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                      user.tag === 'moderator' ? 'bg-slate-200 border-slate-300 text-slate-800' :
                      'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      {user.tag === 'founder' ? '创投' :
                       user.tag === 'researcher' ? '研究院' :
                       user.tag === 'engineer' ? '代码' :
                       user.tag === 'moderator' ? '管理' : '黑客'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user.username)}
                      className="p-1 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-all md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
                      title="移出名单"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Columns: Mentions Timeline Stream */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls bar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Direct text search */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索大咖姓名, 账号或帖子..."
                value={timelineSearch}
                onChange={(e) => setTimelineSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-50 border border-slate-200 p-1.5 rounded-xl w-full md:w-auto">
              {[
                { type: "all", label: "全部足迹" },
                { type: "researcher", label: "科学家" },
                { type: "founder", label: "创始人/创投" },
                { type: "engineer", label: "技术极客" },
                { type: "moderator", label: "官方代表" },
                { type: "hacker", label: "独立黑客" },
              ].map(btn => (
                <button
                  key={btn.type}
                  type="button"
                  onClick={() => setSelectedTagFilter(btn.type)}
                  className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-lg transition-all cursor-pointer ${
                    selectedTagFilter === btn.type
                      ? "bg-slate-900 border border-slate-900 text-white shadow-sm"
                      : "bg-transparent text-gray-600 hover:bg-slate-200"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detections Counter bar */}
          <div className="text-xs text-gray-500 px-1 font-semibold flex items-center justify-between gap-2">
            <span>
              已过滤出符合条件的行为记录: <b className="text-indigo-600">{filteredTimeline.length}</b> / {mentionsTimeline.length} 项
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
              追踪引擎处于守护中
            </span>
          </div>

          {/* Fallback Empty timeline */}
          {filteredTimeline.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-xs font-extrabold text-gray-700">暂未搜索到任何轨迹碎片</p>
              <p className="text-[11px] text-gray-400 max-w-sm mx-auto leading-relaxed">
                未能监测到指定大厂高层或特聘大咖发言记录。您可以尝试减少筛选限制、或在左侧列表追加关注更多新兴 HN 技术大咖。
              </p>
            </div>
          ) : (
            /* Timeline Feed Streams */
            <div className="space-y-4">
              {filteredTimeline.map((story) => {
                // Find matched user object
                const matchedUser = trackedUsers.find(
                  u => u.username.toLowerCase() === story.author.toLowerCase() || 
                       (story.commentAuthor && u.username.toLowerCase() === story.commentAuthor.toLowerCase())
                );

                const activeAuthor = story.commentAuthor || story.author;
                const userDisp = matchedUser ? matchedUser.displayName : `@${activeAuthor}`;
                const userColor = matchedUser ? matchedUser.avatarColor : "from-slate-400 to-slate-500";
                
                // Determine whether it is a comment or a root thread
                const isComment = !!story.commentContext;

                return (
                  <div 
                    key={story.id} 
                    className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-400 hover:shadow-md transition-all space-y-4 relative group"
                  >
                    {/* Top line with author descriptor cards */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${userColor} text-white font-black text-sm flex items-center justify-center shadow-sm uppercase shrink-0`}>
                          {activeAuthor.substring(0, 2)}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-gray-950">{userDisp}</span>
                            <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                              @{activeAuthor}
                            </span>
                            {/* Segment type badge */}
                            <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full border ${
                              isComment 
                                ? "bg-amber-50 text-amber-700 border-amber-200" 
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                              {isComment ? "💬 参与评论" : "📖 发贴/发起"}
                            </span>
                          </div>

                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {matchedUser?.role || "HN Verified Hacker / Technology Enthusiast"}
                          </p>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-450 sm:text-right flex sm:flex-col justify-between items-center sm:items-end gap-1 font-mono">
                        <span>{new Date(story.createdAt).toLocaleDateString()}</span>
                        <span>{new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <h4 className="text-xs font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors leading-relaxed">
                          {isComment && story.commentParentTitle ? (
                            <span>参与热帖: {story.commentParentTitle}</span>
                          ) : (
                            <span>发起新主题: {story.title}</span>
                          )}
                        </h4>
                        
                        <a 
                          href={story.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[11px] text-gray-400 flex items-center gap-1 hover:underline hover:text-indigo-500 break-all"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>相关链接: {story.url}</span>
                        </a>
                      </div>

                      {/* Snippet body */}
                      {isComment && story.commentContext ? (
                        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-150 relative text-[11px] text-gray-700 font-medium leading-relaxed italic">
                          <span className="absolute -top-2.5 left-4 px-2 py-0.2 bg-amber-100 text-amber-800 text-[8.5px] font-extrabold rounded border border-amber-200 flex items-center gap-0.5 shadow-sm">
                            <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                            观点精选 Context
                          </span>
                          <p className="pt-1 select-all">"{story.commentContext}"</p>
                        </div>
                      ) : null}

                      {/* AI-powered summarization badge helper */}
                      {story.aiSummary && (
                        <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-150 text-[11px] text-indigo-950 font-medium leading-relaxed">
                          <p className="flex items-center gap-1 text-[10px] font-extrabold text-indigo-700 mb-1 shrink-0 uppercase">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                            <span>智脑监控速记 AI Context Summary</span>
                          </p>
                          <p>{story.aiSummary}</p>
                        </div>
                      )}
                    </div>

                    {/* Quick action triggers footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[10px] text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-black font-mono shadow-inner">
                          HN Score: {story.points || Math.floor(Math.random() * 200 + 40)}
                        </span>
                        
                        {story.commentsCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3" />
                            <b>{story.commentsCount}</b> 评论
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Bookmark Trigger */}
                        {onToggleBookmark && (
                          <button
                            type="button"
                            onClick={() => onToggleBookmark(story)}
                            className={`px-2.5 py-1.5 text-[10px] font-extrabold rounded-lg border cursor-pointer transition flex items-center gap-1 ${
                              bookmarkedIds.includes(story.id)
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-slate-50"
                            }`}
                            title={bookmarkedIds.includes(story.id) ? "取消存盘" : "存入情报库"}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${bookmarkedIds.includes(story.id) ? "fill-indigo-600 text-indigo-600" : ""}`} />
                            <span>{bookmarkedIds.includes(story.id) ? "已存" : "存盘"}</span>
                          </button>
                        )}

                        {/* Link Copy sharing */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(story.url, story.id)}
                          className={`px-2.5 py-1.5 text-[10px] font-extrabold rounded-lg border cursor-pointer transition flex items-center gap-1 ${
                            copiedId === story.id
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-slate-50"
                          }`}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{copiedId === story.id ? "已复制" : "分享"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
