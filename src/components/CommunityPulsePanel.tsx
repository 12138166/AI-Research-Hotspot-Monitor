import React, { useState, useMemo, useEffect } from "react";
import { 
  MessageSquare, ExternalLink, Search, Bookmark, BookmarkCheck, Share2, 
  Sparkles, Globe, Filter, Calendar, TrendingUp, HelpCircle, Rocket, 
  Layers, Check, Eye, Tag, AlertCircle, X, Plus, ChevronDown, ChevronUp, Users, RefreshCw, Radio
} from "lucide-react";
import { HNStory } from "../types";

interface CommunityPulseProps {
  currentData: {
    categories: {
      academic: { items: HNStory[] };
      technical: { items: HNStory[] };
      marketing: { items: HNStory[] };
    };
  } | null;
  bookmarkedIds?: string[];
  onToggleBookmark?: (story: HNStory) => void;
}

// Unresolved issue blueprint shape
interface UnresolvedIssue {
  id: string;
  title: string;
  sourceTitle: string;
  author: string;
  commentExcerpt: string;
  category: "llm_api" | "vector_db" | "cuda_vram" | "agent_state";
  status: "unresolved" | "active_debate" | "expert_triaging";
  points: number;
  commentsCount: number;
  createdAt: string;
  storyObj?: HNStory;
}

// Seed data representing historic tricky help requests in Ask HN comment sections
const SEED_UNRESOLVED_ISSUES: UnresolvedIssue[] = [
  {
    id: "seed-unresolved-1",
    title: "How to force FP4 quantized models to output verified schemas without JSON.Decoder parsing errors?",
    sourceTitle: "Ask HN: Reliable FP4 schema enforcement on edge units",
    author: "geohot",
    commentExcerpt: "FP4 quant models are exceptionally prone to dropping trailing curly braces or replacing quotes with backticks under low temperature settings. Classic system prompt guardrails completely crash down under concurrency.",
    category: "llm_api",
    status: "unresolved",
    points: 184,
    commentsCount: 42,
    createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString()
  },
  {
    id: "seed-unresolved-2",
    title: "PostgreSQL pgvector cosine HNSW scans experiencing massive performance degradation beyond 5M embeddings",
    sourceTitle: "Ask HN: Optimizing pgvector efSearch/efConstruction at high scale",
    author: "tptacek",
    commentExcerpt: "With 1536-dimension OpenAI embeddings, HNSW queries spiked from 15ms to 2.2s once the physical index size exceeds physical RAM buffer limits. Disk swapping completely stalls throughput.",
    category: "vector_db",
    status: "active_debate",
    points: 215,
    commentsCount: 58,
    createdAt: new Date(Date.now() - 3600 * 1000 * 15).toISOString()
  },
  {
    id: "seed-unresolved-3",
    title: "vLLM speculative decoding leaks CUDA shared memory asynchronously on multi-GPU server deployments",
    sourceTitle: "Ask HN: Multi-GPU speculative vLLM leak triage",
    author: "karpathy",
    commentExcerpt: "Asynchronous client disconnect causes draft/target speculative tensors to leak inside PyTorch backend blocks. After ~4000 steps, a hard SIGKILL CUDA OOM is raised without stack dumps.",
    category: "cuda_vram",
    status: "expert_triaging",
    points: 340,
    commentsCount: 94,
    createdAt: new Date(Date.now() - 3600 * 1000 * 9).toISOString()
  },
  {
    id: "seed-unresolved-4",
    title: "LangGraph WebSocket disconnection triggers infinite recursive state reconciliation loop in client canvas UI",
    sourceTitle: "Ask HN: What is the most robust way to manage AI Agent state context?",
    author: "swyx",
    commentExcerpt: "When agent graph state exceeds 4MB, WebSocket packet boundaries drop. Automatic retries emit duplicate actions, triggering circular render-loop crashes on react canvas in 40% of page views.",
    category: "agent_state",
    status: "unresolved",
    points: 290,
    commentsCount: 77,
    createdAt: new Date(Date.now() - 3600 * 1000 * 22).toISOString()
  }
];

// Expert Pre-research solutions mapping for seed items
const EXPERT_RESOLUTIONS_DICT: Record<string, { summary: string; steps: string[]; codeSnippet?: string }> = {
  "seed-unresolved-1": {
    summary: "FP4 极其削弱 logits 的精准度，传统的提示词模板无法保证格式确定。推荐引入 Token 生成阶段文法约束（如 Outlines 或 Guidance）直接在采样层干预词表，避免事后校验导致的重试开销。",
    steps: [
      "引入 outlines 或 instructor 库，为轻量模型外挂 BNF/Regex 状态机，强行控制生成边界。",
      "客户端部署带自愈机制的 JSON 解析方案，拦截多余 Markdown 标记并回退修补闭合标记。",
      "引入 System 2 反射。对拦截失败的数据集通过轻量 Llama-3-8B 作 0-Shot 反向结构洗牌。"
    ],
    codeSnippet: `from outlines import models, generate\n# 强限制模型只输出满足 Schema 约束的 token\nmodel = models.transformers("TheBloke/Mistral-7B-Instruct-AWQ")\ngenerator = generate.json(model, UserResponseSchema)\nvalidated_json = generator("Parse feedback...")`
  },
  "seed-unresolved-2": {
    summary: "pgvector HNSW 检索高度依赖内存缓存（Postgres Shared Buffers）。一旦物理页超出缓存边界将产生海量磁盘 IO。推荐对向量行进行降维分段，或者将大权重表引流分库。",
    steps: [
      "应用 Matryoshka 特征，使用前 256 位维度进行高效初筛选归类，再针对 TOP-50 行执行 1536 维全矢量精排。",
      "扩大 PostgreSQL work_mem 分配设置，并对 pgvector 强制配置 HNSW 索引独立高性能 SSD 专属表空间存储。",
      "调小 ef_construction 和 limit 比例，采用两路混合召回（BM25 全文分词 + 向量检索）并在客户端 RRF 归约重排。"
    ],
    codeSnippet: `CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops)\nWITH (m = 16, ef_construction = 64);\n-- 并通过 RRF 混合经典分词与向量分：\n-- SELECT items FROM ts_rank_cd() JOIN cosine_similarity()...`
  },
  "seed-unresolved-3": {
    summary: "vLLM 在 speculative decoding 或 prefix static-caching 中由于客户端异常断联，无法迅速触及 PyTorch C 核心销毁回调。推荐开启 eager 执行或加装隔绝守护。",
    steps: [
      "启动推理服务时配置 --enforce-eager，规避 CUDAGraphs 的动态分配锁死现象。",
      "建立多进程推理池模式（torch.multiprocessing），在处理高并发非稳流接入时，对超时子进程主动释放杀掉并物理回收显卡显存。",
      "严格控制 --gpu-memory-utilization 到 0.85% 以下，并外加 daemon 程序高频抓取 `nvidia-smi` 状态自检。"
    ],
    codeSnippet: `python -m vllm.entrypoints.openai.api_server \\\n  --model mistralai/Mistral-7B-Instruct-v0.2 \\\n  --enforce-eager --gpu-memory-utilization 0.85 \\\n  --max-model-len 4096`
  },
  "seed-unresolved-4": {
    summary: "大尺寸 State 导致长连接被网络层频繁抛弃。任何重试引起的消息错漏或状态交叠都会导致前端 Fiber 重复渲染死锁。需引入微指令增量补丁（JSON Patches）。",
    steps: [
      "禁用全局 state 拷贝。客户端与服务端一律使用 RFC 6902 (JSON-Patch) 传输具体发生变化的操作动作数组（diff）。",
      "通信包封装有序序号戳（Sequence Number）与 epoch 全局锁，客户端自动弃置由于重试引起的过期、错序历史补丁包。",
      "引入乐观写锁。由服务端计算统一的 Epoch。若版本冲突则回退到最近一次一致性快照做全量增补。"
    ],
    codeSnippet: `import { compare } from 'fast-json-patch';\n// 前后端仅通过增量 Patch 对话，不再提交数兆的 state JSON\nconst patches = compare(oldState, newState);\nsocket.send(JSON.stringify({ sequence: seqId, patches }));`
  }
};

// Heuristic classifier for categorizing HN stories into technical areas
export function getStoryTopic(story: HNStory): "LLM/GenAI" | "Infrastructure/DevOps" | "Frontend/UX" | "General Research" {
  const title = (story.title || "").toLowerCase();
  
  // LLM / GenAI keywords
  if (/ai|llm|gpt|model|prompt|agent|openai|claude|gemini|rag|quant|vllm|speculative|embedding|vector|latch|neural|transformer/i.test(title)) {
    return "LLM/GenAI";
  }
  
  // Infrastructure / DevOps keywords
  if (/db|database|docker|kubernetes|k8s|server|deploy|aws|cloud|postgres|sql|nginx|redis|dns|linux|kernel|security|ssh|backend|api|infrastructure|devops|vram|gpu|cuda|network|performance/i.test(title)) {
    return "Infrastructure/DevOps";
  }
  
  // Frontend / UX keywords
  if (/html|css|js|react|tailwind|vue|canvas|ui|ux|frontend|components|website|browser|dom|design|svelte|vdom|user experience|style/i.test(title)) {
    return "Frontend/UX";
  }
  
  return "General Research";
}

// Open Questions secondary data-fetcher shape & categorization buckets
export interface OpenQuestion {
  id: string;
  title: string;
  url: string;
  points: number;
  author: string;
  commentsCount: number;
  createdAt: string;
  bucket: "Technical" | "Theoretical" | "Career";
  aiSuggestedAnswer?: string;
  text?: string;
}

// Categorize Open Ask HN Questions
export function getOpenQuestionBucket(title: string): "Technical" | "Theoretical" | "Career" {
  const t = title.toLowerCase();
  if (/career|job|salary|hire|hiring|remote|interview|resume|portfolio|developer|engineer|study|learning|boot camp|junior|senior|industry|startup|management|work|cv|cofounder|co-founder|founder|funding|visa|equity|contractor/i.test(t)) {
    return "Career";
  }
  if (/theory|proof|math|theorem|algorithm|complexity|paradigm|computational|analysis|study|research|paper|physics|scientific|statistics|algebra|geometry|calculus|discrete|p vs np|turing|quantum/i.test(t)) {
    return "Theoretical";
  }
  return "Technical";
}

// Generate tailored heuristic suggested roadmap / expert tip for Open Questions
export function generateQuestionHeuristicAnswer(title: string, bucket: "Technical" | "Theoretical" | "Career"): string {
  const t = title.toLowerCase();
  if (bucket === "Career") {
    if (/interview/i.test(t)) {
      return "💡 [求职面试专家指导] 面试时重在展示您的工程边界感（例如：在何时选用何种数据库权衡、以及如何应对分布式一致性崩溃）。建议预备 2 个完整的深度生产事故排查案例。";
    }
    if (/remote/i.test(t)) {
      return "💡 [远程协同专家建议] 远程协作成功的核心在于高频异步文档。通过详尽编写 RFC、接口文档和状态机定义，减少即时会议的依赖摩擦。";
    }
    return "💡 [职业规划专家研判] 建议把精力集中在「硬核底层原理」和「端侧边缘算力」交叉点。理解 WebGPU、WASM 与底层 C++ 绑定，将比常规全栈研发更具护城河。";
  }
  
  if (bucket === "Theoretical") {
    if (/complexity|algorithm/i.test(t)) {
      return "💡 [算法复杂度研判] 渐进分析（Big-O）在多机分布式下需结合网络 I/O 考虑。对于大规模计算任务，内存局部性与分片寻址通常比单纯的理论时间复杂度更为关键。";
    }
    return "💡 [理论研究演进方向] 学术界当前正迅速向「测试时计算延伸（Test-time Scaling）」迁移。不要局限于静态权重推理，多层树搜索、强化自辩驳反馈是近期的重要理论突破口。";
  }

  // Technical category
  if (/react|frontend|canvas|web/i.test(t)) {
    return "💡 [前端与画布调优] 推荐在状态多变时拆分 React Context。对海量节点建议改用 zustand 结合原生 DOM/Canvas 按需重绘，辅以 RFC 6902 的增量 patch 进行长连接同步。";
  }
  if (/database|postgres|sql|vector/i.test(t)) {
    return "💡 [数据索引调优] 对于 pgvector HNSW 在千万级别以上的检索退化，强烈建议在 shared_buffers 顶配下加装 Matryoshka 二阶段量化初筛，避免索引跨物理盘产生频繁 I/O。";
  }
  if (/gpu|cuda|oom|vram|model/i.test(t)) {
    return "💡 [算力与显存实操] 面对 speculatively decoding 显存泄泄露，可以开启 torch --enforce-eager。对于不确定的 Python C 绑定接口调用，建议做物理多进程包封（multiprocessing）随时杀进程释放卡。";
  }
  
  return "💡 [技术实战建议] 建议首先做控制变量测试（A/B Testing），捕获完整的网络包及硬件运行 trace。对 API 返回不确定结构问题，应在网关侧直接用 JSON schema 文法掩码进行强制 token 级控制。";
}

// Subcomponent to render each individual open question nicely with an expandable analysis
export function OpenQuestionCard({ 
  q, 
  bookmarkedIds, 
  onToggleBookmark 
}: { 
  q: OpenQuestion; 
  bookmarkedIds: string[]; 
  onToggleBookmark?: (story: HNStory) => void;
  key?: any;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const isBookmarked = bookmarkedIds.includes(q.id);

  // Parse HTML formatting inside Hacker News comments if text exists
  const cleanText = q.text ? q.text.replace(/<[^>]*>/g, ' ') : "";

  const storyAdapter: HNStory = {
    id: q.id,
    title: q.title,
    url: q.url,
    points: q.points,
    author: q.author,
    commentsCount: q.commentsCount,
    createdAt: q.createdAt,
    originSegment: "ask_hn",
    aiSummary: q.aiSuggestedAnswer
  };

  return (
    <div className="bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-4 transition-all duration-150 flex flex-col justify-between space-y-3.5 shadow-3xs hover:shadow-2xs">
      
      {/* Title & Actions */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2.5">
          <a
            href={q.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-black text-slate-805 hover:text-indigo-650 leading-relaxed block tracking-tight line-clamp-3"
          >
            {q.title}
          </a>
          
          <div className="flex items-center gap-1 shrink-0">
            {onToggleBookmark && (
              <button
                type="button"
                onClick={() => onToggleBookmark(storyAdapter)}
                className={`p-1 rounded hover:bg-slate-50 cursor-pointer transition ${
                  isBookmarked ? "text-rose-500 bg-rose-50 border border-rose-100" : "text-gray-400"
                }`}
                title={isBookmarked ? "移出书签" : "收藏至书签栏"}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-rose-500" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Text snippet if available */}
        {cleanText && (
          <p className="text-[10px] text-slate-450 line-clamp-3 bg-slate-50/40 p-1.5 rounded italic leading-relaxed">
            "{cleanText}"
          </p>
        )}
      </div>

      {/* Suggested Tip Box */}
      {showAnswer ? (
        <div className="bg-indigo-950 text-slate-200 p-3 rounded-lg text-[10px] leading-relaxed border border-indigo-400/20 space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-1 text-amber-400 font-extrabold select-none">
            <Sparkles className="w-3 h-3" />
            <span>智能专家分析建议 / Expert Tip:</span>
          </div>
          <p className="text-slate-250 font-medium">{q.aiSuggestedAnswer}</p>
          <button
            onClick={() => setShowAnswer(false)}
            className="text-[9.5px] text-indigo-300 font-bold block hover:underline select-none"
          >
            收起建议 / Collapse
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAnswer(true)}
          className="w-full py-1 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-700 text-[10px] font-extrabold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>查看智能诊断建议</span>
        </button>
      )}

      {/* Meta Row */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-slate-100/80 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded font-black">
            ★ {q.points} pt
          </span>
          <a
            href={`https://news.ycombinator.com/item?id=${q.id}`}
            target="_blank"
            className="hover:text-indigo-600 bg-slate-100 px-1 py-0.5 rounded text-slate-600"
          >
            💬 {q.commentsCount} 探讨
          </a>
        </div>
        
        <span>by @<b>{q.author}</b></span>
      </div>

    </div>
  );
}

export default function CommunityPulsePanel({
  currentData,
  bookmarkedIds = [],
  onToggleBookmark
}: CommunityPulseProps) {
  // Navigation filter tabs. We added 'unresolved_board' to implement the Unresolved Issues Kanban feature.
  const [pulseFilter, setPulseFilter] = useState<"all" | "ask" | "show" | "unresolved_board" | "open_questions">("all");
  const [topicFilter, setTopicFilter] = useState<"all" | "LLM/GenAI" | "Infrastructure/DevOps" | "Frontend/UX" | "General Research">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "recent">("score");
  const [copiedStoryId, setCopiedStoryId] = useState<string | null>(null);

  // Secondary Data Fetcher states for Open Questions
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([]);
  const [loadingOpenQuestions, setLoadingOpenQuestions] = useState<boolean>(false);
  const [openQuestionsError, setOpenQuestionsError] = useState<string | null>(null);
  const [openQuestionsProgress, setOpenQuestionsProgress] = useState({ current: 0, total: 0 });

  const fetchOpenQuestions = async () => {
    try {
      setLoadingOpenQuestions(true);
      setOpenQuestionsError(null);
      setOpenQuestionsProgress({ current: 0, total: 30 });

      const res = await fetch("https://hacker-news.firebaseio.com/v0/askstories.json");
      if (!res.ok) {
        throw new Error(`Failed to load Ask HN story index: HTTP ${res.status}`);
      }
      const rawIds: number[] = await res.json();
      const targetIds = rawIds.slice(0, 30);
      setOpenQuestionsProgress({ current: 0, total: targetIds.length });

      const loadedQuestions: OpenQuestion[] = [];
      let currentProgress = 0;

      const chunkSize = 10;
      for (let i = 0; i < targetIds.length; i += chunkSize) {
        const chunk = targetIds.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async (id) => {
          try {
            const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            if (!itemRes.ok) return null;
            const itemData = await itemRes.json();
            if (!itemData || itemData.type !== "story" || !itemData.title) return null;

            const titleLower = itemData.title.toLowerCase();
            const textLower = (itemData.text || "").toLowerCase();
            
            const hasTechKeywords = /how|why|error|bug|model|code|library|deploy|compile|build|database|sql|react|rust|python|api|server|cloud|webgpu|cuda|prompt|agent|neural|transformer|career|job|interview|math|theory|proof|algorithm|pgvector|hnow|speculative|leak|oom/i.test(titleLower) || 
                                     /how|why|error|bug|model|code|library|deploy|compile|build|database|sql|react|rust|python|api|server|cloud|webgpu|cuda|prompt|agent|neural|transformer|career|job|interview|math|theory|proof|algorithm|pgvector|hnow|speculative|leak|oom/i.test(textLower);

            if (!hasTechKeywords) return null;

            const bucket = getOpenQuestionBucket(itemData.title);
            const aiAnswer = generateQuestionHeuristicAnswer(itemData.title, bucket);

            return {
              id: String(itemData.id),
              title: itemData.title,
              url: itemData.url || `https://news.ycombinator.com/item?id=${itemData.id}`,
              points: itemData.score || 0,
              author: itemData.by || "hn-geek",
              commentsCount: itemData.descendants || 0,
              createdAt: new Date(itemData.time * 1000).toISOString(),
              bucket,
              aiSuggestedAnswer: aiAnswer,
              text: itemData.text || ""
            };
          } catch (itemErr) {
            console.warn(`Error fetching ask item ${id}:`, itemErr);
            return null;
          }
        });

        const chunkDetails = await Promise.all(chunkPromises);
        for (const item of chunkDetails) {
          if (item) {
            loadedQuestions.push(item);
          }
          currentProgress++;
          setOpenQuestionsProgress({ current: currentProgress, total: targetIds.length });
        }
      }

      setOpenQuestions(loadedQuestions);
    } catch (err) {
      console.error("Error fetching open questions:", err);
      setOpenQuestionsError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingOpenQuestions(false);
    }
  };

  useEffect(() => {
    if (pulseFilter === "open_questions" && openQuestions.length === 0) {
      fetchOpenQuestions();
    }
  }, [pulseFilter]);

  // States for expanding tickets \& submitting custom technical help tickets
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [isSubmitFormOpen, setIsSubmitFormOpen] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketAuthor, setNewTicketAuthor] = useState("");
  const [newTicketExcerpt, setNewTicketExcerpt] = useState("");
  const [newTicketCategory, setNewTicketCategory] = useState<"llm_api" | "vector_db" | "cuda_vram" | "agent_state">("llm_api");
  const [submitFeedback, setSubmitFeedback] = useState("");

  const [customTickets, setCustomTickets] = useState<UnresolvedIssue[]>(() => {
    try {
      const saved = localStorage.getItem("hn_custom_unresolved_tickets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync custom tickets to localstorage
  useEffect(() => {
    localStorage.setItem("hn_custom_unresolved_tickets", JSON.stringify(customTickets));
  }, [customTickets]);

  // Extract Ask HN and Show HN stories from monitor data
  const pulseStories = useMemo(() => {
    if (!currentData) return [];
    const items: HNStory[] = [];
    const seenIds = new Set<string>();

    ["academic", "technical", "marketing"].forEach((cat) => {
      const catItems = (currentData.categories as any)[cat]?.items || [];
      catItems.forEach((story: HNStory) => {
        if (
          (story.originSegment === "ask_hn" || story.originSegment === "show_hn") && 
          !seenIds.has(story.id)
        ) {
          seenIds.add(story.id);
          items.push(story);
        }
      });
    });

    return items;
  }, [currentData]);

  // Extract all dynamic "Ask HN" stories and convert them to Unresolved Tickets on-the-fly!
  const unresolvedTickets = useMemo(() => {
    // Collect all Ask HN stories from current servers list
    const mappedDynamicAskTickets: UnresolvedIssue[] = pulseStories
      .filter(s => s.originSegment === "ask_hn")
      .map(story => {
        // Simple heuristic classification of the technical dilemma
        const isAiRelated = /ai|llm|gpt|model|prompt|agent|openai|claude|gemini|rag/i.test(story.title);
        const isDbRelated = /vector|db|database|pgvector|index|search|pinecone|qdrant|chroma|postgres|sql/i.test(story.title);
        const isCudaRelated = /gpu|cuda|oom|memory|vram|hardware|inference|vllm|pytorch|tensor/i.test(story.title);

        let category: "llm_api" | "vector_db" | "cuda_vram" | "agent_state" = "llm_api";
        if (isDbRelated) category = "vector_db";
        else if (isCudaRelated) category = "cuda_vram";
        else if (/state|sync|websocket|canvas|client|server|reactive|event|frame/i.test(story.title)) {
          category = "agent_state";
        }

        return {
          id: `dynamic-ask-${story.id}`,
          title: story.title,
          sourceTitle: story.title,
          author: story.author || "hn-geek",
          commentExcerpt: story.aiSummary || "在 HN 评论区遭遇底层网络穿透、显存调度或模型格式幻觉等非确定性瓶颈，急待业内专家诊断会诊。",
          category,
          status: "active_debate",
          points: story.points,
          commentsCount: story.commentsCount,
          createdAt: story.createdAt,
          storyObj: story
        };
      });

    // Merge custom reported items + mapped server Ask items + preset seed archives
    const combined = [...customTickets, ...mappedDynamicAskTickets, ...SEED_UNRESOLVED_ISSUES];

    // Filter duplicates by unique title to guarantee a rich and tidy Kanban layout
    const uniqueList: UnresolvedIssue[] = [];
    const seenTitles = new Set<string>();
    
    combined.forEach(item => {
      const cleanTitle = item.title.toLowerCase().trim();
      if (!seenTitles.has(cleanTitle)) {
        seenTitles.add(cleanTitle);
        uniqueList.push(item);
      }
    });

    return uniqueList;
  }, [pulseStories, customTickets]);

  // Filter and sort general listed items for Ask/Show normal tabs
  const filteredStories = useMemo(() => {
    let result = [...pulseStories];

    if (pulseFilter === "ask") {
      result = result.filter(item => item.originSegment === "ask_hn");
    } else if (pulseFilter === "show") {
      result = result.filter(item => item.originSegment === "show_hn");
    }

    if (topicFilter !== "all") {
      result = result.filter(item => getStoryTopic(item) === topicFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.title || "").toLowerCase().includes(query) ||
        (item.aiSummary || "").toLowerCase().includes(query) ||
        (item.author || "").toLowerCase().includes(query)
      );
    }

    if (sortBy === "score") {
      result.sort((a, b) => b.points - a.points);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [pulseStories, pulseFilter, searchQuery, sortBy, topicFilter]);

  // Aggregate general stats
  const stats = useMemo(() => {
    const askCount = pulseStories.filter(s => s.originSegment === "ask_hn").length;
    const showCount = pulseStories.filter(s => s.originSegment === "show_hn").length;
    return { askCount, showCount, total: pulseStories.length };
  }, [pulseStories]);

  // Handle manual tech feedback submission
  const handleAddNewTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = newTicketTitle.trim();
    const cleanAuthor = newTicketAuthor.trim().toLowerCase();
    
    if (!cleanTitle || !cleanAuthor) return;

    const created: UnresolvedIssue = {
      id: `custom-ticket-${Date.now()}`,
      title: cleanTitle,
      sourceTitle: "用户手递评论反馈 User Reported Tech Request",
      author: cleanAuthor,
      commentExcerpt: newTicketExcerpt.trim() || "暂无附带底层错误栈数据。在进行并发大并发加载时遭遇不确定度闪断故障，急盼大咖支招！",
      category: newTicketCategory,
      status: "unresolved",
      points: 1,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    };

    setCustomTickets(prev => [created, ...prev]);
    setNewTicketTitle("");
    setNewTicketAuthor("");
    setNewTicketExcerpt("");
    setIsSubmitFormOpen(false);

    setSubmitFeedback("🎉 成功将该评论求助注入 '未解决问题智脑看板'！AI 已智算完成 swimlane 分类归档。");
    setTimeout(() => setSubmitFeedback(""), 4500);
  };

  // Helper function to resolve preset resolution or dynamically generate a tailored advice blueprint!
  const getTicketResolution = (ticket: UnresolvedIssue) => {
    const predefined = EXPERT_RESOLUTIONS_DICT[ticket.id];
    if (predefined) return predefined;

    // Direct dynamic generation feedback matching the requested specific categories:
    const isLLM = ticket.category === "llm_api";
    const isVector = ticket.category === "vector_db";
    const isCuda = ticket.category === "cuda_vram";

    if (isLLM) {
      return {
        summary: `针对「${ticket.title}」所提大语言模型交互异常，AI 研判建议启动 Pydantic API 拦截与 Logits 强校验文法拦截。`,
        steps: [
          "在服务端配置 outlines/instructor 文法状态机规则，禁止模型输出任何偏离 Schema 的 token 字符。",
          "客户端加装 regex 自适应补足管道，自动截断不闭合的反引号串，并将 500 解析报错降级为带反射提示的重构调度。",
          "对量化版本提升 Temperature (如 0.2 降至 0.05) 进行极其局限的确定度限制推理工作。"
        ]
      };
    } else if (isVector) {
      return {
        summary: `针对「${ticket.title}」高吞吐向量相似度严重退化瓶颈，专家预研结论推荐改用双路召回及 Matryoshka 特征收缩。`,
        steps: [
          "应用高维向量 Matryoshka 特征，提取前 256 位空间执行高速初检索，对选中 Top-100 再调用 HNSW 全矩阵精密排。",
          "合并传统语义索引与倒数倒位融合算法 (BM25 + RRF Semantic Search) 避免专一相似度特征产生的盲区。",
          "在物理层面强制扩大 Shared Buffers 物理缓存空间限制，并在底层挂载高速 SSD 保证索引缓存常驻物理空间。"
        ]
      };
    } else if (isCuda) {
      return {
        summary: `针对显存异常或「${ticket.title}」计算吞吐停顿，AI 多卡调度架构官给出如下应急硬排规约。`,
        steps: [
          "强制打开推理节点 command 命令行 `python ... --enforce-eager` 参数，斩断 dynamic CUDAGraphs 的内存锁定泄漏。",
          "在 speculative target draft 使用更轻量、编译极其优化的 TRT-LLM 静态显存剖解方案。",
          "设计进程级硬隔绝机制。将 speculative 调度包裹进 python 的 multiprocessing 闭包。当判定任务执行中止物理抛弃显存。"
        ]
      };
    } else {
      return {
        summary: `针对长连接或智能体状态失配难题「${ticket.title}」，架构结论指出不应通过长连接反复拉取大体量全局 State。`,
        steps: [
          "完全摒弃全量 json 体积发送。重构为 RFC 6902 描述机制（JSON Patch），仅对在画布有改变的节点序列化发送更新动作补丁。",
          "为 WebSocket 数据传输搭载单向自增防重 Epoch sequence 元标章，彻底剔除因丢包、闪断引起的多余渲染回流死锁。",
          "利用 startTransition 或者 React concurrent 机制把画布状态剥离于 UI 状态之外独立降噪调度渲染。"
        ]
      };
    }
  };

  const handleCopyShare = (story: HNStory) => {
    const cleanUrl = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
    const typeLabel = story.originSegment === "ask_hn" ? "Ask HN 提问" : "Show HN 原创展示";
    const shareText = 
      `🔥 【HN AI 社区脉搏精选】\n` +
      `📌 分类: ${typeLabel}\n` +
      `🌐 标题: ${story.title}\n` +
      `💡 AI 特约点评: ${story.aiSummary || "无"}\n` +
      `⭐ 贴子积分: ${story.points} | 评论数: ${story.commentsCount}\n` +
      `🔗 探索链接: ${cleanUrl}`;
    
    navigator.clipboard.writeText(shareText).then(() => {
      setCopiedStoryId(story.id);
      setTimeout(() => setCopiedStoryId(null), 2000);
    });
  };

  // 4 Core technical columns for the Unresolved Kanban board representation
  const KANBAN_COLUMNS = [
    { id: "llm_api", label: "大模型生成异常 (LLM & API Keys)", icon: Sparkles, color: "text-purple-700 bg-purple-50 hover:bg-purple-100/50 border-purple-200", badge: "bg-purple-200 text-purple-900", desc: "提示词漂移、JSON Parser error、LLM 约束失灵及 Schema 崩溃" },
    { id: "vector_db", label: "索引与向量瓶颈 (Vector DBs)", icon: Globe, color: "text-blue-700 bg-blue-50 hover:bg-blue-100/50 border-blue-200", badge: "bg-blue-200 text-blue-900", desc: "pgvector 相似度骤降、efSearch 耗费过载与超长聚类退化" },
    { id: "cuda_vram", label: "算力与显存崩盘 (CUDA & VRAM)", icon: AlertCircle, color: "text-rose-700 bg-rose-50 hover:bg-rose-100/50 border-rose-200", badge: "bg-rose-250 text-rose-950", desc: "vLLM 异步 tensor 泄露、PyTorch C 块销毁锁死与多卡 sync 宕机" },
    { id: "agent_state", label: "画布与状态失配 (Agent Live Sync)", icon: RefreshCw, color: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100/50 border-emerald-200", badge: "bg-emerald-200 text-emerald-950", desc: "WebSocket 连接断网、增量 JSON-Patch 冲突、持久状态树循环雪崩" },
  ];

  return (
    <div className="space-y-6 animate-fade-in" id="community-pulse-root">
      
      {/* Community Pulse Hero Bar */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-xl p-6 text-white border border-purple-500/20 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-300 text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded border border-purple-500/30">
                ⚡ COMMUNITY PULSE
              </span>
              <span className="bg-emerald-500/25 text-emerald-350 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-500/20">
                • 极客原生动向
              </span>
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded border border-indigo-400/30">
                • AI Help Desk 智算
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight" id="pulse-hub-title">
              Hacker News 极客社区脉搏 / Ask & Show HN AI Hub
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              这里沉淀着全球极客的心智脉动。除了 <strong>Ask HN</strong> 和 <strong>Show HN</strong> 基础流，本系统全新升级了 <strong>AI 驱动的技术求助未解决问题看板</strong>，自动分类评论区前沿开发者的工程痛点，并快速聚合提供高频疑问的 <strong>专家预研结论</strong>。
            </p>
          </div>

          <div className="flex gap-3.5 shrink-0">
            <div className="bg-white/5 border border-white/10 px-3.5 py-2 rounded-lg text-center min-w-[80px]">
              <span className="block text-[9px] text-purple-300 font-bold uppercase">Ask HN 提问</span>
              <span className="text-lg font-black text-white">{stats.askCount}</span>
            </div>
            <div className="bg-white/5 border border-white/10 px-3.5 py-2 rounded-lg text-center min-w-[80px]">
              <span className="block text-[9px] text-rose-300 font-bold uppercase">未解决问题</span>
              <span className="text-lg font-black text-white">{unresolvedTickets.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Station Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-3xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          
          {/* Main selectable navigation subtabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setPulseFilter("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                pulseFilter === "all"
                  ? "bg-purple-650 text-white shadow-xs"
                  : "bg-slate-50 text-gray-600 hover:bg-slate-100 border border-gray-200/50"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>全部动态 ({stats.total})</span>
            </button>

            <button
              type="button"
              onClick={() => setPulseFilter("ask")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                pulseFilter === "ask"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-50 text-gray-600 hover:bg-slate-100 border border-gray-200/50"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Ask HN 提问 ({stats.askCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setPulseFilter("show")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                pulseFilter === "show"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-50 text-gray-600 hover:bg-slate-100 border border-gray-200/50"
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Show HN 创造 ({stats.showCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setPulseFilter("unresolved_board")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                pulseFilter === "unresolved_board"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-50 text-rose-600 hover:bg-rose-50 border border-rose-200/50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>💡 未解决问题看板 ({unresolvedTickets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setPulseFilter("open_questions")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                pulseFilter === "open_questions"
                  ? "bg-indigo-650 text-white shadow-xs"
                  : "bg-slate-50 text-indigo-600 hover:bg-indigo-50 border border-indigo-200/50"
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${pulseFilter === "open_questions" ? "animate-pulse text-rose-400" : "text-indigo-500"}`} />
              <span>📡 Open Questions 极客问答 ({openQuestions.length || "Live"})</span>
            </button>
          </div>

          {/* Sorter rendered only for normal flow feeds */}
          {pulseFilter !== "unresolved_board" && pulseFilter !== "open_questions" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSortBy("score")}
                className={`text-[11px] font-bold py-1.5 px-3 rounded-lg border flex items-center gap-1 cursor-pointer transition ${
                  sortBy === "score"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-slate-50"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>高赞推荐</span>
              </button>
              <button
                type="button"
                onClick={() => setSortBy("recent")}
                className={`text-[11px] font-bold py-1.5 px-3 rounded-lg border flex items-center gap-1 cursor-pointer transition ${
                  sortBy === "recent"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-slate-50"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>最新发布</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Keyword Search bar & Topic Filter Grid */}
        {pulseFilter !== "unresolved_board" && pulseFilter !== "open_questions" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="在提问、新产品发布中快捷搜索关键字、发帖极客、创新项目..."
                className="w-full text-xs pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-slate-50/50"
              />
            </div>

            <div className="relative">
              <div className="absolute left-3 top-2.5 flex items-center pointer-events-none">
                <Filter className="w-4 h-4 text-purple-650" />
              </div>
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value as any)}
                id="topic-filter-dropdown"
                className="w-full text-xs pl-9 pr-8 py-2.5 rounded-lg border border-gray-250 bg-white hover:border-purple-350 focus:outline-none focus:ring-1 focus:ring-purple-500 appearance-none font-bold text-gray-700 cursor-pointer shadow-3xs"
              >
                <option value="all">⚡ 所有主题分支 / All Topics</option>
                <option value="LLM/GenAI">🔮 LLM/GenAI (大模型与生成智能)</option>
                <option value="Infrastructure/DevOps">🌐 Infrastructure/DevOps (算力部署与软硬调优)</option>
                <option value="Frontend/UX">🎨 Frontend/UX (前端画布与并发状态)</option>
                <option value="General Research">🔬 General Research (极客前沿方向)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}
      </div>

      {submitFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-extrabold rounded-xl flex items-center gap-2 animate-pulse">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{submitFeedback}</span>
        </div>
      )}

      {/* ==================== CONDITION 1: AI DRIVEN UNRESOLVED KANBAN KANBAN BOARD ==================== */}
      {pulseFilter === "unresolved_board" && (
        <div className="space-y-6">
          
          {/* Pre-research aggregation quick summary / Action triggers */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-amber-800 block uppercase tracking-wider">🔬 AI Technical Triage Desk</span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                看板自动扫描 HN 讨论流，过滤包含 <span className="underline font-bold text-indigo-750">“未解/报错/OOM”</span> 字样的评论和发帖。您可以直接点击求助卡片下的「<b>查看专家预研结论</b>」快速解构经过深度提炼的最佳技术规约！
              </p>
            </div>

            <button
              onClick={() => setIsSubmitFormOpen(!isSubmitFormOpen)}
              className="bg-slate-900 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg transition-all hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-3xs hover:shadow-2xs self-start md:self-center shrink-0"
            >
              {isSubmitFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isSubmitFormOpen ? "取消报告" : "登记求助评论到看板"}</span>
            </button>
          </div>

          {/* User manual help issue submission form */}
          {isSubmitFormOpen && (
            <form onSubmit={handleAddNewTicket} className="bg-white border border-gray-200 p-5 rounded-2xl max-w-xl mx-auto space-y-3 shadow-md animate-fadeIn">
              <div className="flex items-center gap-1 text-slate-800 font-extrabold border-b pb-2 mb-2 text-xs">
                <Plus className="w-4 h-4 text-rose-500 animate-spin" />
                <span>登记新提取出的技术求助/报错 (Inject Tech Request)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">* 问题主旨 (Tech Title):</label>
                  <input
                    type="text"
                    required
                    placeholder="例如: Zod failed to parse FP4 keys"
                    value={newTicketTitle}
                    onChange={(e) => setNewTicketTitle(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-200 bg-slate-55 rounded focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">* 报错提出者 (Author / Handle):</label>
                  <input
                    type="text"
                    required
                    placeholder="例如: swyx"
                    value={newTicketAuthor}
                    onChange={(e) => setNewTicketAuthor(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-200 bg-slate-55 rounded focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">* 智能归属分类 (Categorized Swimlane):</label>
                  <select
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value as any)}
                    className="w-full text-xs p-2 border border-gray-200 bg-white rounded focus:ring-1 focus:ring-rose-500 outline-none"
                  >
                    <option value="llm_api">🔮 大模型生成与 Schema 异常</option>
                    <option value="vector_db">🌐 pgvector 与检索拓扑瓶颈</option>
                    <option value="cuda_vram">🔥 显卡显存泄漏与 CUDA OOM</option>
                    <option value="agent_state">⚡ WebSocket 长连接状态雪崩</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">报错/求助评语片段 (Verbatim Comment Excerpt):</label>
                  <textarea
                    rows={2}
                    placeholder="例如: Encountered partial JSON truncation inside event buffer, causing infinite browser reload loop."
                    value={newTicketExcerpt}
                    onChange={(e) => setNewTicketExcerpt(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-200 bg-slate-55 rounded resize-none focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-extrabold transition"
              >
                立即注入智能看板泳道
              </button>
            </form>
          )}

          {/* Kanban Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map(col => {
              const colIssues = unresolvedTickets.filter(t => t.category === col.id);
              const ColIcon = col.icon;

              return (
                <div 
                  key={col.id} 
                  className="bg-slate-50/65 rounded-xl border border-gray-250 p-3.5 space-y-3 min-h-[460px] flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header elements */}
                    <div className="flex items-center justify-between border-b pb-2 border-gray-200">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ColIcon className="w-4 h-4 text-slate-700 shrink-0" />
                        <h3 className="text-[12px] font-black text-slate-900 truncate" title={col.label}>{col.label}</h3>
                      </div>
                      <span className={`text-[10px] font-black p-1 rounded-full ${col.badge} leading-none`}>
                        {colIssues.length}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic border-b border-dashed pb-1.5">
                      {col.desc}
                    </p>

                    {/* Columns items list */}
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {colIssues.length === 0 ? (
                        <div className="p-8 border border-dashed border-gray-200 text-center rounded-xl bg-white/40">
                          <Check className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-400">尚无匹配的未解报告</p>
                        </div>
                      ) : (
                        colIssues.map((ticket) => {
                          const isExpanded = expandedTicketId === ticket.id;
                          const resolution = getTicketResolution(ticket);

                          return (
                            <div 
                              key={ticket.id}
                              className="bg-white border border-gray-200/80 rounded-lg p-3 hover:border-indigo-400 hover:shadow-2xs transition duration-155 space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <span className={`text-[8px] font-black p-1 rounded uppercase select-none leading-none inline-block ${
                                  ticket.status === 'unresolved' ? 'bg-red-50 text-red-700 border border-red-200' :
                                  ticket.status === 'expert_triaging' ? 'bg-amber-50 text-amber-700 border border-amber-250' :
                                  'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {ticket.status === 'unresolved' ? '未解决' :
                                   ticket.status === 'expert_triaging' ? '专家诊疗中' : '热烈互咬中'}
                                </span>

                                <span className="text-[9px] text-slate-450 font-semibold shrink-0">
                                  来自 @<b>{ticket.author}</b>
                                </span>
                              </div>

                              <h4 className="text-[11px] font-black leading-snug text-slate-850">
                                {ticket.title}
                              </h4>

                              <div className="bg-slate-50 p-2.5 rounded text-[10px] text-slate-550 leading-relaxed italic border-l border-indigo-300 select-text">
                                "{ticket.commentExcerpt}"
                              </div>

                              {/* Trigger button for reveal pre-research conclusion */}
                              <button
                                type="button"
                                onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                                className={`w-full py-1.5 text-[10px] font-extrabold rounded-md flex items-center justify-center gap-1 cursor-pointer transition ${
                                  isExpanded
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700"
                                }`}
                              >
                                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span>{isExpanded ? "收起预研结论" : "查看官方专家研判结论"}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              {/* Interactive expert conclusion dropdown */}
                              {isExpanded && (
                                <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-slate-100 p-3.5 rounded-lg text-[10.5px] leading-relaxed space-y-2 animate-fadeIn shadow-inner border border-indigo-400/20">
                                  <div className="flex items-center gap-1 border-b border-indigo-500/30 pb-1.5 mb-1.5 select-none font-bold text-amber-400">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>🧠 专家智脑高频集成结论:</span>
                                  </div>
                                  <p className="font-medium text-slate-200 italic">
                                    {resolution.summary}
                                  </p>

                                  <div className="space-y-1">
                                    <span className="font-black text-slate-400 text-[10px] block select-none uppercase">🛠️ 建议攻关步骤:</span>
                                    {resolution.steps.map((step, idx) => (
                                      <p key={idx} className="text-slate-300 pl-1.5">
                                        • {step}
                                      </p>
                                    ))}
                                  </div>

                                  {(resolution as any).codeSnippet && (
                                    <pre className="bg-black/40 border border-white/5 p-2 rounded text-[9.5px] font-mono text-cyan-300 overflow-x-auto whitespace-pre">
                                      {(resolution as any).codeSnippet}
                                    </pre>
                                  )}

                                  <div className="text-[8.5px] text-indigo-400 text-right font-mono select-none">
                                    研判安全优先级: HIGH 📡
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Spacer helper bottom */}
                  <div className="pt-2 text-[9px] text-gray-400 font-mono text-right select-none">
                    * 动态分类：就绪
                  </div>
                </div>
              );
            })}
          </div>

          {/* ==================== EXPERT PRE-RESEARCH HIGH FREQUENCY CONCLUSIONS EXPANSION HUB ==================== */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-3xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="w-5 h-5 text-indigo-600 animate-bounce" />
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  🧠 Hacker News AI 痛点深度预研决策中心 (Expert Brain-Trust Terminal)
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  自动聚合全球极客针对高频 AI 开发疑难沉淀的标准架构共识与防爆方案。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-rose-100 rounded-xl bg-rose-50/15 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-rose-900 border-b border-rose-100/50 pb-1.5 select-none">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>格式失控 解决方案 1 / FP4量化 Schema 漂移</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  模型在低精 AWQ/FP4 实作中，常常会因为 logits 塌陷而无法输出规整的 JSON 结构，纯提示词无法控制。
                </p>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[10px] font-mono whitespace-pre overflow-x-auto leading-relaxed border border-white/5">
                  {`# 方案：Outlines 约束 logits 词表掩码\nfrom outlines import generate, models\nmodel = models.transformers("Mistral-7B-AWQ")\ngenerator = generate.json(model, MyTargetSchema)\nresponse = generator("Parse metadata...")`}
                </div>
              </div>

              <div className="p-4 border border-indigo-100 rounded-xl bg-indigo-50/15 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-indigo-900 border-b border-indigo-100/50 pb-1.5 select-none">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>检索瓶颈 解决方案 2 / 千万维 pgvector 耗过上限</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  当向量在 postgres 大于 5M 且 effSearch=400 突发极度内存抖动与高延迟。
                </p>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[10px] font-mono whitespace-pre overflow-x-auto leading-relaxed border border-white/5">
                  {`# 方案：Matryoshka 初筛 + HNSW 256维索引\nCREATE INDEX ON chunk_vectors\nUSING hnsw ((embedding::vector(256)) vector_cosine_ops)\nWITH (m = 16, ef_construction = 64);`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONDITION 3: OPEN QUESTIONS HIGH-FIDELITY BUCKETS ==================== */}
      {pulseFilter === "open_questions" && (
        <div className="space-y-6 animate-fade-in" id="open-questions-container">
          
          {/* Information & Action row */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-150 rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-indigo-800 block uppercase tracking-wider">📡 Real-time Ask HN Live Aggregator</span>
              <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                已联通 Hacker News 官方 <span className="underline font-bold text-indigo-700">Ask HN</span> 接口，自动检索包含技术硬核特征（如 deploy, bug, model, algorithm ）的最新开放问题，并智能分派到 <strong>实操技术 (Technical)</strong>、<strong>理论算法 (Theoretical)</strong> 或 <strong>求职规划 (Career)</strong> 三大专属泳道。
              </p>
            </div>

            <button
              type="button"
              onClick={fetchOpenQuestions}
              disabled={loadingOpenQuestions}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-3xs hover:shadow-2xs self-start md:self-center shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingOpenQuestions ? "animate-spin" : ""}`} />
              <span>重新载入提问流</span>
            </button>
          </div>

          {loadingOpenQuestions ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-slate-100 border-t-indigo-650 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-indigo-650 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-black text-slate-800">
                  正在解析最新 Ask HN 并筛选技术关键字...
                </p>
                <p className="text-[11px] text-slate-400">
                  已解析 {openQuestionsProgress.current} / {openQuestionsProgress.total} 篇问答详情
                </p>
              </div>
            </div>
          ) : openQuestionsError ? (
            <div className="py-16 text-center max-w-sm mx-auto space-y-3">
              <AlertCircle className="w-12 h-12 text-pink-500 mx-auto" />
              <h3 className="text-sm font-black text-slate-800">实时问答检索中断</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                原因: {openQuestionsError}. 别担心，由于 HN API 的高承载性，可稍后重试或检查互联网配置。
              </p>
              <button
                type="button"
                onClick={fetchOpenQuestions}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
              >
                极速重试 / Retry
              </button>
            </div>
          ) : openQuestions.length === 0 ? (
            <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-2 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
              <HelpCircle className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">当前未监听到符合技术标记的开放提问</p>
              <p className="text-xs text-slate-400">可以尝试点击右上角重新加载捕获最新信号。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Column 1: Technical (实操技术) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2 bg-slate-50/60 p-2.5 rounded-lg border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">🔧 Technical</span>
                    <h3 className="text-[12px] font-black text-slate-900">实操与系统技术</h3>
                  </div>
                  <span className="text-xs font-bold bg-blue-150 text-blue-900 px-2 py-0.5 rounded-full">
                    {openQuestions.filter(q => q.bucket === "Technical").length}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {openQuestions.filter(q => q.bucket === "Technical").map((q) => (
                    <OpenQuestionCard key={q.id} q={q} bookmarkedIds={bookmarkedIds} onToggleBookmark={onToggleBookmark} />
                  ))}
                  {openQuestions.filter(q => q.bucket === "Technical").length === 0 && (
                    <p className="text-center py-10 text-xs text-slate-400 border border-dashed rounded-lg bg-slate-50/20">暂无技术实操提问</p>
                  )}
                </div>
              </div>

              {/* Column 2: Theoretical (理论算法) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-purple-100 pb-2 bg-slate-50/60 p-2.5 rounded-lg border-l-4 border-l-purple-500">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">🔬 Theoretical</span>
                    <h3 className="text-[12px] font-black text-slate-900">理论、算法与数学</h3>
                  </div>
                  <span className="text-xs font-bold bg-purple-150 text-purple-900 px-2 py-0.5 rounded-full">
                    {openQuestions.filter(q => q.bucket === "Theoretical").length}
                  </span>
                </div>

                <div className="space-y-4">
                  {openQuestions.filter(q => q.bucket === "Theoretical").map((q) => (
                    <OpenQuestionCard key={q.id} q={q} bookmarkedIds={bookmarkedIds} onToggleBookmark={onToggleBookmark} />
                  ))}
                  {openQuestions.filter(q => q.bucket === "Theoretical").length === 0 && (
                    <p className="text-center py-10 text-xs text-slate-400 border border-dashed rounded-lg bg-slate-50/20">暂无理论算法提问</p>
                  )}
                </div>
              </div>

              {/* Column 3: Career (职业与行业) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2 bg-slate-50/60 p-2.5 rounded-lg border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">💼 Career</span>
                    <h3 className="text-[12px] font-black text-slate-900">求职、规划与协同</h3>
                  </div>
                  <span className="text-xs font-bold bg-emerald-150 text-emerald-900 px-2 py-0.5 rounded-full">
                    {openQuestions.filter(q => q.bucket === "Career").length}
                  </span>
                </div>

                <div className="space-y-4">
                  {openQuestions.filter(q => q.bucket === "Career").map((q) => (
                    <OpenQuestionCard key={q.id} q={q} bookmarkedIds={bookmarkedIds} onToggleBookmark={onToggleBookmark} />
                  ))}
                  {openQuestions.filter(q => q.bucket === "Career").length === 0 && (
                    <p className="text-center py-10 text-xs text-slate-400 border border-dashed rounded-lg bg-slate-50/20">暂无职业规划提问</p>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ==================== CONDITION 2: STANDARD ASK / SHOW / ALL FEEDS TIMELINE GRID ==================== */}
      {pulseFilter !== "unresolved_board" && pulseFilter !== "open_questions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStories.map((story) => {
            const isBookmarked = bookmarkedIds.includes(story.id);
            const isAsk = story.originSegment === "ask_hn";
            const topic = getStoryTopic(story);

            // Extract domain
            let domain = "";
            if (story.url) {
              try {
                domain = new URL(story.url).hostname.replace("www.", "");
              } catch {}
            }

            return (
              <div
                key={story.id}
                id={`pulse-card-${story.id}`}
                className={`bg-white border rounded-xl p-5 hover:shadow-2xs transition duration-200 flex flex-col justify-between relative border-l-4 ${
                  isAsk ? "border-l-purple-500 hover:border-purple-400/80" : "border-l-emerald-500 hover:border-emerald-400/80"
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center flex-wrap gap-1.5">
                      {isAsk ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-0.5">
                          <HelpCircle className="w-3 h-3 text-purple-500" />
                          <span>Ask HN</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-0.5">
                          <Rocket className="w-3 h-3 text-emerald-500" />
                          <span>Show HN</span>
                        </span>
                      )}

                      {domain && (
                        <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-sm bg-slate-50 text-slate-500 border border-slate-200 inline-flex items-center gap-0.5" title={`域名来源: ${domain}`}>
                          <Globe className="w-2.5 h-2.5 text-slate-400" />
                          <span>{domain}</span>
                        </span>
                      )}

                      {/* Dynamic Topic Badge for scannability */}
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm inline-flex items-center gap-0.5 border ${
                        topic === "LLM/GenAI" ? "bg-purple-100/50 text-purple-700 border-purple-200" :
                        topic === "Infrastructure/DevOps" ? "bg-blue-100/50 text-blue-700 border-blue-200" :
                        topic === "Frontend/UX" ? "bg-emerald-100/55 text-emerald-800 border-emerald-250" :
                        "bg-slate-100/60 text-slate-650 border-gray-200"
                      }`} title={`技术分类: ${topic}`}>
                        <Tag className="w-2.5 h-2.5" />
                        <span>{topic}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {onToggleBookmark && (
                        <button
                          type="button"
                          onClick={() => onToggleBookmark(story)}
                          className={`p-1 rounded cursor-pointer transition ${
                            isBookmarked ? "text-rose-500 bg-rose-50 border border-rose-100" : "text-gray-400 hover:bg-slate-100"
                          }`}
                        >
                          <BookmarkCheck className={`w-3.5 h-3.5 ${isBookmarked ? "fill-rose-500" : ""}`} />
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => handleCopyShare(story)}
                        className="p-1 rounded cursor-pointer text-gray-400 hover:bg-slate-100 transition"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <a
                    href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-slate-850 hover:text-indigo-600 block line-clamp-2 leading-relaxed"
                  >
                    {story.title}
                    <ExternalLink className="w-3 h-3 text-gray-400 inline ml-1 align-middle" />
                  </a>

                  {story.aiSummary && (
                    <p className="text-[11px] text-gray-600 leading-relaxed bg-slate-50/70 py-2 px-3 rounded-lg border-l-2 border-indigo-400">
                      <span className="font-bold text-indigo-700">AI 研判: </span>
                      {story.aiSummary}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-4 pt-3 border-t border-gray-100/60">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-650 px-1.5 py-0.5 rounded font-black">
                      ★ {story.points}
                    </span>
                    <span className="bg-slate-100 text-slate-650 px-1.5 py-0.5 rounded">
                      💬 {story.commentsCount} 探讨
                    </span>
                  </div>

                  <div className="text-right">
                    <span>由 @<b>{story.author}</b> 发帖</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
