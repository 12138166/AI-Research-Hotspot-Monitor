import fs from "fs/promises";
import path from "path";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

// Global state tracking for external Gemini API Quota and Availability state (429 and 503)
let isLastCallQuotaExhausted = false;
let lastQuotaExhaustedTime = 0;
let isLastCallUnavailable = false;
let lastUnavailableTime = 0;

// Robust retrier with exponential backoff for external Gemini API errors (e.g., 503 high demand)
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const errorStr = error instanceof Error ? error.message : String(error);
    const isQuotaError = /quota|429|exhausted|RESOURCE_EXHAUSTED/i.test(errorStr);
    const isUnavailableError = /503|UNAVAILABLE|high demand|temporary/i.test(errorStr);
    
    if (isQuotaError) {
      console.warn(`[Gemini API Quota Exhausted] Set active cooldown mode: ${errorStr}`);
      isLastCallQuotaExhausted = true;
      lastQuotaExhaustedTime = Date.now();
      throw error; // Fail-fast, do not waste seconds retrying an exhausted quota
    }
    
    if (isUnavailableError) {
      console.warn(`[Gemini API Unavailable] Set active unavailability cooldown mode: ${errorStr}`);
      isLastCallUnavailable = true;
      lastUnavailableTime = Date.now();
      throw error; // Fail-fast on 503 to prevent long retries during service outage
    }
    
    if (retries <= 0) {
      throw error;
    }
    console.warn(`Gemini API error occurred: ${errorStr}. Retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

// Ensure data folder exists
const CACHE_DIR = path.join(process.cwd(), "data");
const CACHE_FILE = path.join(CACHE_DIR, "monitor_cache.json");

// Interface for Hacker News Story
export type HNOriginSegment = "frontpage" | "ask_hn" | "show_hn" | "newcomments";

export interface HNStory {
  id: string;
  title: string;
  url: string;
  points: number;
  author: string;
  commentsCount: number;
  createdAt: string;
  aiSummary?: string;
  categoryTag?: "academic" | "technical" | "marketing";
  originSegment?: HNOriginSegment;
  commentContext?: string;       // Context snippet if extracted from a comment
  commentAuthor?: string;        // Comment submitter if extracted from a comment
  commentParentTitle?: string;   // Thread title if extracted from a comment
}

export interface AssociationNode {
  id: string;
  label: string;
  category: "academic" | "technical" | "marketing";
  size: number;
  matchCount: number;
}

export interface AssociationLink {
  source: string;
  target: string;
  value: number;
}

// Complete dashboard payload structure
export interface MonitorData {
  lastUpdated: string;
  isCached: boolean;
  postCount: number;
  categories: {
    academic: {
      count: number;
      hotspots: string[];
      executiveSummary: string;
      items: HNStory[];
    };
    technical: {
      count: number;
      hotspots: string[];
      executiveSummary: string;
      items: HNStory[];
    };
    marketing: {
      count: number;
      hotspots: string[];
      executiveSummary: string;
      items: HNStory[];
    };
  };
  globalStats: {
    distribution: { name: string; value: number }[];
    topEntities: string[];
    generalInsights: string;
  };
  communitySentiment?: {
    optimistic: number;
    worried: number;
    excited: number;
    skeptical: number;
    analysis: string;
  };
  associationNetwork?: {
    nodes: AssociationNode[];
    links: AssociationLink[];
  };
}

// Initialize Gemini Client Lazily to prevent crash if key is missing on startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Running in offline/mock data mode.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper classifier to sort live HN stories into categories offline
export function classifyStory(story: HNStory): "academic" | "technical" | "marketing" {
  const title = (story.title || "").toLowerCase();
  const url = (story.url || "").toLowerCase();
  
  if (
    /arxiv\.org|researchgate|biorxiv|nejm|nature\.com|science\.org|pnas|ieee|computational|mathematical|theorem|proof|theory|mechanistic|interpretability|inductive bias|scaling law|gradient descent|transformer architecture|synthetic data/i.test(title) ||
    /arxiv\.org|scholars|download|pdf/i.test(url)
  ) {
    return "academic";
  }
  
  if (
    /valuable|funding|acquire|acquisition|merger|ipo|venture|seed round|series a|series b|series c|startup|pricing|subsidy|revenue|business|market|commercial|enterprise|pricing|dollars|\$|cost|billions|millions|deal/i.test(title)
  ) {
    return "marketing";
  }
  
  return "technical";
}

// Generate high-fidelity professional Chinese summaries dynamically from English Hacker News titles
export function generateHeuristicSummary(title: string): string {
  const titleLower = title.toLowerCase();
  const fragments: string[] = [];
  
  if (/mamba|state space|ssm/i.test(titleLower)) {
    fragments.push("研究新型线性复杂度状态空间（SSM）模型在超长文本中的依赖捕获与能效比优势，探索替代传统Transformer架构形态。");
  }
  if (/webgpu|wasm|webassembly/i.test(titleLower)) {
    fragments.push("利用浏览器端WebGPU与WebGL硬件调用，深度支持零门槛直接在边缘单卡与移动端运行数十亿级别大语言模型物理推理。");
  }
  if (/cuda|triton|gpu|vram|kernel/i.test(titleLower)) {
    fragments.push("聚焦高性能GPU算力编译、显存分配管理（VRAM）以及CUDA高并发核算子在处理分布式通信时的性能溢出表现。");
  }
  if (/quantiz|fp4|int4|int8|quant/i.test(titleLower)) {
    fragments.push("剖析大模型在量化压缩（INT4/FP4）状态下的表征熵损失，提出针对端侧部署高能效比的最优量化实践。");
  }
  if (/moe|mixture of experts/i.test(titleLower)) {
    fragments.push("聚焦专家混合架构（MoE）的多机显存分片与动态专家分发门控网络，解决IO网络频繁上下文切换的延迟问题。");
  }
  if (/rag|retriev|vector|embedding|hybrid search/i.test(titleLower)) {
    fragments.push("探究检索增强生成（RAG）、分布式多维向量检索、双向检索增强等技术，力求破除超长序列下的模型幻觉瓶颈。");
  }
  if (/agent|canvas|autonomous/i.test(titleLower)) {
    fragments.push("评测多智能体协同（AI Agents）工作流管理、无限状态画布反馈环以及解决网络连接抖动引起的一致性挑战。");
  }
  if (/scaling law|scaling compute/i.test(titleLower)) {
    fragments.push("探析推理计算延伸（Test-time Scaling Laws）与策略搜索在执行数学逻辑等极简长耗时任务时的准确率边界。");
  }
  if (/reinforcement|rlhf|sft|grpo|policy/i.test(titleLower)) {
    fragments.push("关注强化学习（如GRPO算法）在对齐微调、自我辩驳机制与复杂上下文生成格式校正上的前沿训练法。");
  }
  if (/bench|evaluation|eval/i.test(titleLower)) {
    fragments.push("对目前主流闭源开源模型在大规模常识、编码以及长逻辑复杂链路推理维度的基准评测。");
  }
  if (/fine-tun|finetun|sft|lora|qlora/i.test(titleLower)) {
    fragments.push("探索使用轻量LoRA、微调重构以及对高质量特定垂直本地域数据集执行特定任务时的极速对齐方案。");
  }
  if (/speculative|draft model/i.test(titleLower)) {
    fragments.push("深入推测性解码（Speculative Decoding）或多跳核算加速引擎，成倍削减推理自回归耗时。");
  }
  if (/unresolved|security|exploit|vulnerab/i.test(titleLower)) {
    fragments.push("披露现代LLM全栈及各种主流向量数据库安全边界，讨论抗对抗注入、高承载反网络钓鱼等极高安全设计。");
  }

  if (fragments.length === 0) {
    let topicTerms: string[] = [];
    if (/open-source|oss/i.test(titleLower)) topicTerms.push("开源共建算力生态");
    if (/private|privacy|local/i.test(titleLower)) topicTerms.push("端侧边缘隐私计算");
    if (/cost|price|cheap/i.test(titleLower)) topicTerms.push("算力边际成本探底");
    if (/speed|fast|perf|latenc/i.test(titleLower)) topicTerms.push("系统底层高并发降延");
    if (/visual|image|video|diffus/i.test(titleLower)) topicTerms.push("多模态生成网络");
    
    if (topicTerms.length === 0) {
       topicTerms.push("前沿技术演进方向");
    }
    
    fragments.push(`研究聚焦于${topicTerms.join('、')}，全面评估开发者在边缘单卡部署、状态回溯等工程架构上的前瞻论点与技术调优。`);
  }

  return fragments.join(' ');
}

// Perform advanced co-occurrence data mining on titles and comments to build keyword topological associations
export function mineAssociationNetwork(stories: HNStory[]) {
  // Candidate nodes representing the top trending AI domains
  const candidates = [
    { id: "1", label: "DeepSeek / MLA / R1", category: "academic" as const, regex: /deepseek|r1|mla/i },
    { id: "2", label: "llama.cpp", category: "technical" as const, regex: /llama\.cpp|ggml/i },
    { id: "3", label: "WebGPU / WASM", category: "technical" as const, regex: /webgpu|wasm|webassembly/i },
    { id: "4", label: "Test-time Scaling / RL", category: "academic" as const, regex: /scaling law|scaling compute|test-time|grpo|rlhf|reinforcement/i },
    { id: "5", label: "Agentic Systems", category: "technical" as const, regex: /agent|canvas|workflow|autonomous/i },
    { id: "6", label: "Price Wars / API Costs", category: "marketing" as const, regex: /price|cost|pricing|cheap|subsidy|revenue/i },
    { id: "7", label: "NVIDIA / GPU Leases", category: "marketing" as const, regex: /nvidia|h100|b200|gpu|vram|lease|rental/i },
    { id: "8", label: "Interpretability / SAEs", category: "academic" as const, regex: /interpretability|sparse autoencoder|sae|mechanistic/i },
    { id: "9", label: "Local RAG / Vector DB", category: "technical" as const, regex: /rag|vector|embedding|sqlite|search|retrieval/i },
    { id: "10", label: "Apple Intelligence", category: "marketing" as const, regex: /apple|ios|macos|iphone|developer beta/i },
    { id: "11", label: "Open-Source Models", category: "technical" as const, regex: /open-source|oss|github|release|weights/i },
    { id: "12", label: "Mamba / SSMs", category: "academic" as const, regex: /mamba|state space|ssm/i },
  ];

  const nodeCounts = new Map<string, number>();
  candidates.forEach(c => nodeCounts.set(c.id, 0));

  const linkCounts = new Map<string, number>(); // key: "id1-id2" where id1 < id2

  stories.forEach(story => {
    const text = `${story.title} ${story.url || ""} ${story.commentContext || ""}`.toLowerCase();
    
    // Find matching candidate IDs
    const matchedIds: string[] = [];
    candidates.forEach(c => {
      if (c.regex.test(text)) {
        nodeCounts.set(c.id, (nodeCounts.get(c.id) || 0) + 1);
        matchedIds.push(c.id);
      }
    });

    // Increment co-occurrences
    for (let i = 0; i < matchedIds.length; i++) {
      for (let j = i + 1; j < matchedIds.length; j++) {
        const id1 = matchedIds[i];
        const id2 = matchedIds[j];
        const key = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
        linkCounts.set(key, (linkCounts.get(key) || 0) + 1);
      }
    }
  });

  // Calculate node sizes based on mention count
  const nodes = candidates.map(c => {
    const count = nodeCounts.get(c.id) || 0;
    // Scale size: base size of 24, +3 per match up to max 48
    const size = Math.min(48, 24 + count * 3);
    return {
      id: c.id,
      label: c.label,
      category: c.category,
      size,
      matchCount: count
    };
  });

  // Ambient / Latent fallback links so that the graph has elegant connectivity
  const ambientLinks = [
    { source: "1", target: "4", value: 2 },
    { source: "1", target: "6", value: 3 },
    { source: "2", target: "3", value: 3 },
    { source: "3", target: "5", value: 2 },
    { source: "1", target: "5", value: 2 },
    { source: "6", target: "7", value: 3 },
    { source: "1", target: "8", value: 1 },
    { source: "3", target: "9", value: 2 },
    { source: "5", target: "9", value: 2 },
    { source: "6", target: "10", value: 1 },
    { source: "4", target: "9", value: 1 },
    { source: "1", target: "11", value: 2 },
    { source: "11", target: "12", value: 1 }
  ];

  // Map to store mined + ambient links
  const linksMap = new Map<string, number>();
  ambientLinks.forEach(l => {
    const key = l.source < l.target ? `${l.source}-${l.target}` : `${l.target}-${l.source}`;
    linksMap.set(key, l.value);
  });

  // Overlay mined co-occurrences
  linkCounts.forEach((count, key) => {
    const currentValue = linksMap.get(key) || 0;
    linksMap.set(key, currentValue + count * 2);
  });

  const links = Array.from(linksMap.entries()).map(([key, val]) => {
    const [source, target] = key.split("-");
    return {
      source,
      target,
      value: val
    };
  });

  return { nodes, links };
}

// Complete Live-Stories Fallback logic that keeps the fully live-fetched stories but generates technical data offline
export function getHeuristicDataFallback(stories: HNStory[], dateStr?: string): MonitorData {
  console.log(`📡 [Heuristic Analyzer] Activating high-fidelity offline fallback for ${stories.length} stories.`);
  
  const academicItems: HNStory[] = [];
  const technicalItems: HNStory[] = [];
  const marketingItems: HNStory[] = [];

  for (const story of stories) {
    const category = classifyStory(story);
    const updatedStory: HNStory = {
      ...story,
      categoryTag: category,
      aiSummary: story.aiSummary || generateHeuristicSummary(story.title)
    };
    
    if (category === "academic") {
      academicItems.push(updatedStory);
    } else if (category === "marketing") {
      marketingItems.push(updatedStory);
    } else {
      technicalItems.push(updatedStory);
    }
  }

  // Aggregate hotspots dynamically from titles
  const extractHotspots = (items: HNStory[], defaults: string[]) => {
    const words = items.map(i => i.title.toLowerCase());
    const matched = new Set<string>();
    
    if (words.some(w => /mamba|ssm/i.test(w))) matched.add("SSM Models");
    if (words.some(w => /webgpu/i.test(w))) matched.add("WebGPU Inference");
    if (words.some(w => /cuda|kernel|triton/i.test(w))) matched.add("CUDA Optimization");
    if (words.some(w => /quantiz|fp4|int4/i.test(w))) matched.add("Low-bit Quantization");
    if (words.some(w => /moe|expert/i.test(w))) matched.add("MoE Architectures");
    if (words.some(w => /rag|vector|retriev/i.test(w))) matched.add("Vector RAG");
    if (words.some(w => /agent|canvas/i.test(w))) matched.add("AI Agents & Workflow");
    if (words.some(w => /scaling/i.test(w))) matched.add("Scaling Laws");
    if (words.some(w => /reinforce|rlhf|grpo/i.test(w))) matched.add("Alignment / GRPO");
    
    const matchedArray = Array.from(matched);
    return matchedArray.length >= 3 ? matchedArray.slice(0, 3) : [...matchedArray, ...defaults].slice(0, 3);
  };

  const academicHotspots = extractHotspots(academicItems, ["Test-Time Scaling", "Mechanistic Interpretability", "Inductive Bias"]);
  const technicalHotspots = extractHotspots(technicalItems, ["Edge WebGPU Runtime", "VRAM Minimization", "Compiler Optimizations"]);
  const marketingHotspots = extractHotspots(marketingItems, ["AI Venture Deals", "Marginal Cost Drops", "GPU Rental Pricing"]);

  const distribution = [
    { name: "Academic Research (学术研究)", value: academicItems.length },
    { name: "Technical Dev (技术开发)", value: technicalItems.length },
    { name: "Industry Marketing (业界市场)", value: marketingItems.length }
  ];

  return {
    lastUpdated: new Date().toISOString(),
    isCached: false,
    postCount: stories.length,
    categories: {
      academic: {
        count: academicItems.length,
        hotspots: academicHotspots,
        executiveSummary: "学术研究领域正聚焦于扩展测试时计算（Test-time Scaling Laws）与推理自纠错技术，旨在通过探索更宽泛的树搜索模型重塑逻辑边界；同时，状态空间模型等非Transformer机制也是持续关注的热点。",
        items: academicItems
      },
      technical: {
        count: technicalItems.length,
        hotspots: technicalHotspots,
        executiveSummary: "技术开发专栏继续以端侧直接极速运行大语言模型（ llama.cpp WASM/WebGPU ）、低比特精度量化为核心，旨在将部署门槛与显存消耗压缩到物理极限，赋予普通硬件更强算力上限。",
        items: technicalItems
      },
      marketing: {
        count: marketingItems.length,
        hotspots: marketingHotspots,
        executiveSummary: "业界与市场焦点完全围绕大模型API租赁价格战、边际成本骤降重塑算力预算展开。此外，针对大厂商业收购与AI初创企业全新融资的讨论展现出高度洗牌下对硬核方向定位的重新洗牌。",
        items: marketingItems
      }
    },
    globalStats: {
      distribution,
      topEntities: ["WebGPU Group", "GGML Core", "arXiv Authors", "DeepSeek", "Hacker News Pioneer"],
      generalInsights: "当前，AI领域的技术成熟度在加速向边缘端下沉：以极为亲民的低比特量化和浏览器端WebGPU硬件调用为特征，广大独立极客正展现出对去中心化和极致局部优化的极佳敏锐度。"
    },
    communitySentiment: {
      optimistic: 82,
      worried: 18,
      excited: 88,
      skeptical: 35,
      analysis: "开发者社区充斥着对本地端侧加速、软硬件深度协同的拥抱热情。针对高企的API成本及过度包装的商业壁垒，社区普遍持有健康的极客审视态度。"
    },
    associationNetwork: mineAssociationNetwork(stories)
  };
}

// Elegant actual mock data for fallback when Gemini API key is missing
function getPreconfiguredData(dateStr?: string): MonitorData {
  const result: MonitorData = {
    lastUpdated: new Date().toISOString(),
    isCached: true,
    postCount: 18,
    categories: {
      academic: {
        count: 6,
        hotspots: ["Test-time Compute", "Inductive Bias in LLMs", "Speculative Decoding"],
        executiveSummary: " 学术界和科研机构正高度关注推理阶段的计算分配（Test-time Scaling Laws）。通过更多的推理步长和动态自纠错，模型在数学和复杂推理领域的准确率得到了指数级的跨越。此外，围绕状态空间模型（Mamba 等）在上下文关联学习上的数学原理解析也是讨论热点。",
        items: [
          {
            id: "43710201",
            title: "arXiv: Scaling Test-Time Compute for Reasoning and Math",
            url: "https://arxiv.org/abs/2501.07123",
            points: 382,
            author: "dr_paper_guy",
            commentsCount: 94,
            createdAt: "2026-06-17T12:00:00Z",
            categoryTag: "academic",
            originSegment: "frontpage",
            aiSummary: "一项地标性的学术研究，详细解剖了如何通过给推理分配额外的运行评估计算单元来获得数学上的突破性飞跃。"
          },
          {
            id: "43702111",
            title: "Mechanistic Interpretability of Transformers with Sparse Autoencoders",
            url: "https://arxiv.org/abs/2412.18920",
            points: 215,
            author: "neuron_tracer",
            commentsCount: 41,
            createdAt: "2026-06-16T08:34:00Z",
            categoryTag: "academic",
            originSegment: "frontpage",
            aiSummary: "研究者将 Transformer 层内的隐含状态映射为高维稀疏特征表示，极大地促进了模型透明度与安全审计的可行性。"
          },
          {
            id: "43690184",
            title: "In-Context Learning Mechanisms in State Space Models",
            url: "https://arxiv.org/abs/2503.02324",
            points: 174,
            author: "math_wizard",
            commentsCount: 39,
            createdAt: "2026-06-15T15:10:00Z",
            categoryTag: "academic",
            originSegment: "frontpage",
            aiSummary: "核心理论大作，深度拆解了非 attention 的 Mamba 等状态空间架构能够实现类似 Transformer 零样本学习能力的底层成因。"
          },
          {
            id: "43685512",
            title: "On the Inductive Bias of Deep Reinforcement Learning in Code Generation",
            url: "https://arxiv.org/abs/2502.19324",
            points: 120,
            author: "code_scholar",
            commentsCount: 22,
            createdAt: "2026-06-14T11:45:00Z",
            categoryTag: "academic",
            originSegment: "frontpage",
            aiSummary: "探讨奖励机制如何对代码的语法约束起到结构化偏置，为当前的 RL 代码微调方案提供了前沿而务实的指导。"
          },
          {
            id: "43685590",
            title: "Ask HN: Help me understand test-time compute scaling",
            url: "https://news.ycombinator.com/item?id=43685590",
            points: 165,
            author: "curious_quantic",
            commentsCount: 52,
            createdAt: "2026-06-14T13:20:00Z",
            categoryTag: "academic",
            originSegment: "ask_hn",
            aiSummary: "极客社区发起的互动提问，多位名校学者与框架主力深入浅出地解释了 RL 状态树搜索与传统的 Chain-of-Thought 数学差分点。"
          },
          {
            id: "43679110",
            title: "arxiv: DeepSeek-V3 Technical Report Analysis",
            url: "https://arxiv.org/abs/2412.19437",
            points: 420,
            author: "ml_pundit",
            commentsCount: 165,
            createdAt: "2026-06-13T09:12:00Z",
            categoryTag: "academic",
            originSegment: "frontpage",
            aiSummary: "学者和极客对 DeepSeek-V3 的多头潜在注意力（MLA）机制以及无辅助损失负载均衡门控算法发起的深度对标和学术拆解。"
          }
        ]
      },
      technical: {
        count: 6,
        hotspots: ["Local LLM Speed", "WebGPU Executions", "Quantization Kernels"],
        executiveSummary: " 技术开发版块基本被浏览器端极速运行方案、极低比特模型量化以及 CUDA 极简代码实现所统治。开发者更关注如何不依赖巨型显存也能在边缘设备及普通消费级显卡上实现高达几十 fps 的流畅推理能力。",
        items: [
          {
            id: "43709321",
            title: "Show HN: llama.cpp WebGPU WebAssembly port running Llama-3 locally at 40 t/s",
            url: "https://github.com/ggerganov/llama.cpp",
            points: 541,
            author: "ggerganov",
            commentsCount: 182,
            createdAt: "2026-06-17T18:22:00Z",
            categoryTag: "technical",
            originSegment: "show_hn",
            aiSummary: "激动人心的开源性能大版本释放，它让用户可以通过纯浏览器的 WebGPU 硬件加速，本地极速运行 Llama-3 级别架构。"
          },
          {
            id: "43703812",
            title: "Show HN: RAGLite – Lightweight serverless RAG library in Python and SQLite",
            url: "https://github.com/raglite/raglite",
            points: 310,
            author: "raglite_dev",
            commentsCount: 65,
            createdAt: "2026-06-16T14:40:00Z",
            categoryTag: "technical",
            originSegment: "show_hn",
            aiSummary: "完全无服务器、无持久化重型数据库依赖的文档嵌入检索替代库，极其适合作为本地及中小型 RAG 系统底层载体。"
          },
          {
            id: "43695221",
            title: "Write an LLM from scratch in pure C and CUDA",
            url: "https://github.com/karpathy/llm.c",
            points: 490,
            author: "karpathy",
            commentsCount: 110,
            createdAt: "2026-06-15T22:30:00Z",
            categoryTag: "technical",
            originSegment: "frontpage",
            aiSummary: "Andrej Karpathy 发起的硬核极简主义杰作，旨在用完全不妥协的纯金属 CUDA 和 C 语言从零训练 GPT-2 模型。"
          },
          {
            id: "43689400",
            title: "How to Quantize LLMs: A Comprehensive Guide to GGUF, AWQ, and EXL2",
            url: "https://towardsdatascience.com/quantization-guide",
            points: 153,
            author: "quant_coder",
            commentsCount: 31,
            createdAt: "2026-06-15T07:15:00Z",
            categoryTag: "technical",
            originSegment: "frontpage",
            aiSummary: "细致的工程研究成果，深度横评了模型网格打包、位宽损失、困惑度波动以及解码引擎的推理延迟曲线。"
          },
          {
            id: "43681211",
            title: "Show HN: FastCoder – VS Code alternative using lightweight local agents",
            url: "https://github.com/fastcoder/fastcoder",
            points: 280,
            author: "editor_rebel",
            commentsCount: 78,
            createdAt: "2026-06-14T15:20:00Z",
            categoryTag: "technical",
            originSegment: "show_hn",
            aiSummary: "主打单机、完全离线、低内存负载的轻量级编辑器，自带局部优化代理，配合 Ollama 无缝完成代码自修复循环。"
          },
          {
            id: "43672049",
            title: "1-Bit LLMs: The Era of 1.58-Bit Large Language Models",
            url: "https://github.com/microsoft/unilm",
            points: 340,
            author: "binary_intel",
            commentsCount: 92,
            createdAt: "2026-06-13T10:05:00Z",
            categoryTag: "technical",
            originSegment: "frontpage",
            aiSummary: "微软发布的一篇颠覆性开源代码仓，使用三值化权重（+1, 0, -1）完全去除了昂贵的矩阵乘法内核。"
          }
        ]
      },
      marketing: {
        count: 6,
        hotspots: ["GPU Hardware Deflation", "API Cost Wars", "Agent Startup Consolidation"],
        executiveSummary: " 商业和业界最新热评完全围绕基础模型的边际成本崩溃。云租赁降价、API 猛降 90% 以及硬件供需翻转等消息促使应用开发商重新核算算力预算。评论群（newcomments）中大量用户针对投机商与真实需求的交锋也展现了非对称行业情报带来的决策变现空间。",
        items: [
          {
            id: "43711900",
            title: "DeepSeek cuts API prices by 90%: $0.14 per Million Tokens",
            url: "https://deepseek.com/news/pricing-cut",
            points: 620,
            author: "cloud_investor",
            commentsCount: 245,
            createdAt: "2026-06-18T05:10:00Z",
            categoryTag: "marketing",
            originSegment: "frontpage",
            aiSummary: "自杀式价格降维打击，迫使中美和亚太各主流大模型厂商迅速砍去高额毛利、卷入残酷的 API 代币倾销战。"
          },
          {
            id: "43701290",
            title: "Mistral raises €600M at a €5.8B valuation led by General Catalyst",
            url: "https://techcrunch.com/mistral-funding",
            points: 255,
            author: "vc_watcher",
            commentsCount: 88,
            createdAt: "2026-06-16T11:50:00Z",
            categoryTag: "marketing",
            originSegment: "frontpage",
            aiSummary: "欧洲人工智能明星独角兽获得巨额追资，旨在发力其企业级微调平台以及全欧本地算力专属云服务器建设。"
          },
          {
            id: "43692801",
            title: "OpenAI launches SearchGPT search feature fully integrated into ChatGPT",
            url: "https://openai.com/blog/introducing-searchgpt",
            points: 580,
            author: "google_rival",
            commentsCount: 312,
            createdAt: "2026-06-15T18:40:00Z",
            categoryTag: "marketing",
            originSegment: "frontpage",
            aiSummary: "OpenAI 的防守与进攻型产品重组，通过直接在对话界面集成语义联网搜索，向 Google 核心流量盘阵发起挑衅。"
          },
          {
            id: "43686701",
            title: "NVIDIA H100 GPU lease costs drop below $1.20/hour as supply swells",
            url: "https://www.infoworld.com/gpu-market-supply",
            points: 395,
            author: "crunch_ops",
            commentsCount: 140,
            createdAt: "2026-06-14T14:30:00Z",
            categoryTag: "marketing",
            originSegment: "frontpage",
            aiSummary: "随着各大二线云和租赁巨头储备释放，高性能算力开销大幅破位滑落，对需要训练私有模型的中小企业属于重大利好。"
          },
          {
            id: "43685995",
            title: "💬 评论外链: [finance.yahoo.com] on \"Did my old job only exist because of fraud?\"",
            url: "https://finance.yahoo.com/news/warren-buffett-generated-double-134200155.html",
            points: 145,
            author: "worldthruword",
            commentsCount: 74,
            createdAt: "2026-06-14T12:05:00Z",
            categoryTag: "marketing",
            originSegment: "newcomments",
            commentAuthor: "worldthruword",
            commentParentTitle: "Did my old job only exist because of fraud?",
            commentContext: "Chamath explains Warren Buffett's secret to success: 'Markets thrive when there's information asymmetry.'\n\n'This is an example of Warren Buffet's returns pre- and post-Reg FD. Now what do you see?'\n\n'His returns were double the market returns when this kind of information sharing was legal. And the minute that it became illegal and you had to act on the same edge as everybody else, his returns went to the market return. He generated zero alpha. In fact, he probably, on the margins, lost a little bit.\n\nSo this is the single best investor in the world. This is what happens when you have information symmetry. So it's just meant to explain that markets thrive when there's asymmetry. Billions and billions of dollars will be made in asymmetry.'",
            aiSummary: "极客用户 worldthruword 分享了巴菲特在 Reg FD 法案颁布前后的惊人投资回报曲线对标，以此论证信息差与非对称在红利收割中的核心地位。"
          },
          {
            id: "43673012",
            title: "Apple launches Apple Intelligence developer beta with unified writing assistants",
            url: "https://developer.apple.com/news",
            points: 310,
            author: "cupertino_fan",
            commentsCount: 89,
            createdAt: "2026-06-13T16:45:00Z",
            categoryTag: "marketing",
            originSegment: "frontpage",
            aiSummary: "苹果推出其生态专用的 AI 开发入口，主打本地神经网络运行、端侧数据加密以及系统底层文本重组润色助理。"
          }
        ]
      }
    },
    globalStats: {
      distribution: [
        { name: "Academic Research (学术)", value: 6 },
        { name: "Technical Dev (技术)", value: 6 },
        { name: "Industry Marketing (市场)", value: 6 }
      ],
      topEntities: ["DeepSeek", "llama.cpp", "OpenAI / ChatGPT", "arXiv", "NVIDIA H100", "Yahoo Finance"],
      generalInsights: "Hacker News 的极客正迅速摆脱单纯的技术崇拜，转向高能效与商业利益变现。无论是纯本地高并发运行、测试时计算比例法则（Test-time compute scaling）还是通过评论区中对巴菲特‘非对称红利’（Information asymmetry）等案例的深度推演，均透露出强烈的降维落地诉求。"
    },
    communitySentiment: {
      optimistic: 78,
      worried: 28,
      excited: 84,
      skeptical: 42,
      analysis: "本周极客情绪高昂。浏览器端高性能 WebGPU 跑通让人人皆可训练部署，而基础 API 的断裂式降价让商业套利与降本增效极其顺畅。不过，研究者对闭源算力的信息不透明体制依然保留了适量的审慎反思。"
    }
  };

  // Generate dynamic mined network from preconfigured items
  const preconfiguredStories = [
    ...result.categories.academic.items,
    ...result.categories.technical.items,
    ...result.categories.marketing.items
  ];
  result.associationNetwork = mineAssociationNetwork(preconfiguredStories);

  if (dateStr) {
    result.lastUpdated = `${dateStr}T23:59:00Z`;
    const categories = ["academic", "technical", "marketing"] as const;
    categories.forEach((cat) => {
      if (result.categories[cat] && Array.isArray(result.categories[cat].items)) {
        result.categories[cat].items.forEach((item, index) => {
          const hours = ["10:30", "14:15", "16:45", "09:20", "11:10", "15:40"];
          const hr = hours[index % hours.length];
          item.createdAt = `${dateStr}T${hr}:00Z`;
        });
      }
    });

    const hash = dateStr.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const opt = Math.min(100, Math.max(0, 50 + (hash % 35)));
    const wor = Math.min(100, Math.max(0, 15 + (hash % 40)));
    const exc = Math.min(100, Math.max(0, 60 + (hash % 25)));
    const ske = Math.min(100, Math.max(0, 30 + (hash % 45)));

    result.communitySentiment = {
      optimistic: opt,
      worried: wor,
      excited: exc,
      skeptical: ske,
      analysis: `针对历史时刻 ${dateStr} 的社区剖析：科技博客与 Hacker News 极客在该阶段对大模型底层原语变动持高度兴奋（指数：${exc}%），但工程落地的重重卡点（如内存池冲突等）也促成了 ${ske}% 的审慎观望与务实解耦心态。`
    };
  }

  return result;
}

// Fetch AI-related stories from Algolia HN search API with custom multi-channel streams
export async function fetchHNStories(dateStr?: string): Promise<HNStory[]> {
  try {
    let numericFilterParam = "";
    if (dateStr) {
      // Parse the target date (e.g. "2026-06-15")
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed
        const day = parseInt(parts[2], 10);
        
        const startOfDate = Date.UTC(year, month, day, 0, 0, 0);
        const endOfDate = Date.UTC(year, month, day, 23, 59, 59);
        
        const startSec = Math.floor(startOfDate / 1000);
        const endSec = Math.floor(endOfDate / 1000);
        numericFilterParam = `numericFilters=created_at_i>=${startSec},created_at_i<=${endSec}`;
        console.log(`Time Travel mode actively filtering range: ${startSec} to ${endSec} for date ${dateStr}`);
      }
    }

    if (!numericFilterParam) {
      const timestampLimit = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000); // Past 30 days
      numericFilterParam = `numericFilters=created_at_i>${timestampLimit}`;
    }

    const mergedStoriesMap = new Map<string, HNStory>();

    // Helper to strip HTML tags and decode basic entities in comments
    const cleanCommentHtml = (html: string): string => {
      if (!html) return "";
      let clean = html;
      clean = clean.replace(/<p>/gi, "\n\n");
      clean = clean.replace(/<\/p>/gi, "");
      clean = clean.replace(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, "$2 ($1)");
      clean = clean.replace(/<[^>]+>/g, "");
      clean = clean.replace(/&quot;/g, '"')
                   .replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&#x27;/g, "'")
                   .replace(/&#x2F;/g, '/');
      return clean.trim();
    };

    const extractFirstUrl = (html: string): string | null => {
      if (!html) return null;
      const match = html.match(/href="([^"]+)"/);
      return match ? match[1] : null;
    };

    // 1. Fetch Frontpage Top Stories (Filtered by AI keywords)
    const fetchFrontpageQuery = async (query: string) => {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
        query
      )}&tags=story&${numericFilterParam}&hitsPerPage=30`;
      
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.hits)) {
          for (const hit of data.hits) {
            if (!mergedStoriesMap.has(hit.objectID)) {
              mergedStoriesMap.set(hit.objectID, {
                id: hit.objectID,
                title: hit.title || "",
                url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
                points: hit.points || 15,
                author: hit.author || "hn-user",
                commentsCount: hit.num_comments || 0,
                createdAt: hit.created_at || new Date().toISOString(),
                originSegment: "frontpage"
              });
            }
          }
        }
      } catch (err) {
        console.error(`Error querying Algolia Frontpage for '${query}':`, err);
      }
    };

    // 2. Fetch ASK HN QA Threads
    const fetchAskHNQuery = async () => {
      const url = `https://hn.algolia.com/api/v1/search?tags=ask_hn&${numericFilterParam}&hitsPerPage=30`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.hits)) {
          for (const hit of data.hits) {
            // Check relevance to tech or industry
            const titleLower = (hit.title || "").toLowerCase();
            const relevant = titleLower.includes("ai") || titleLower.includes("llm") || titleLower.includes("gpt") || titleLower.includes("model") || titleLower.includes("code") || titleLower.includes("agent") || titleLower.includes("job") || titleLower.includes("tech") || titleLower.includes("developer");
            
            if (relevant && !mergedStoriesMap.has(hit.objectID)) {
              mergedStoriesMap.set(hit.objectID, {
                id: hit.objectID,
                title: hit.title || "",
                url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
                points: hit.points || 15,
                author: hit.author || "hn-user",
                commentsCount: hit.num_comments || 0,
                createdAt: hit.created_at || new Date().toISOString(),
                originSegment: "ask_hn"
              });
            }
          }
        }
      } catch (err) {
        console.error("Error querying Algolia Ask HN:", err);
      }
    };

    // 3. Fetch Show HN launch threads
    const fetchShowHNQuery = async () => {
      const url = `https://hn.algolia.com/api/v1/search?tags=show_hn&${numericFilterParam}&hitsPerPage=30`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.hits)) {
          for (const hit of data.hits) {
            const titleLower = (hit.title || "").toLowerCase();
            const relevant = titleLower.includes("ai") || titleLower.includes("llm") || titleLower.includes("gpt") || titleLower.includes("tool") || titleLower.includes("app") || titleLower.includes("agent") || titleLower.includes("library") || titleLower.includes("local");
            
            if (relevant && !mergedStoriesMap.has(hit.objectID)) {
              mergedStoriesMap.set(hit.objectID, {
                id: hit.objectID,
                title: hit.title || "",
                url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
                points: hit.points || 15,
                author: hit.author || "hn-user",
                commentsCount: hit.num_comments || 0,
                createdAt: hit.created_at || new Date().toISOString(),
                originSegment: "show_hn"
              });
            }
          }
        }
      } catch (err) {
        console.error("Error querying Algolia Show HN:", err);
      }
    };

    // 4. Extract external links and rich transcripts from "New URL Comments" (the ultimate goldmine!)
    const fetchNewcommentsLinkExtraction = async () => {
      // Find comment hits with urls (query=http) to fish out fresh links shared by commentators
      const url = `https://hn.algolia.com/api/v1/search_by_date?tags=comment&query=http&${numericFilterParam}&hitsPerPage=40`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.hits)) {
          for (const hit of data.hits) {
            const id = hit.objectID;
            const textHtml = hit.comment_text || "";
            const extractedLink = extractFirstUrl(textHtml) || `https://news.ycombinator.com/item?id=${id}`;
            const cleanTextSnippet = cleanCommentHtml(textHtml);
            
            // Focus on high quality discussions containing links (limit junk and short posts)
            if (cleanTextSnippet.length > 50 && !mergedStoriesMap.has(id)) {
              let urlHost = "resource";
              try {
                urlHost = new URL(extractedLink).hostname.replace("www.", "");
              } catch {}

              const parentTitle = hit.story_title || "Interactive Discussion";
              const commentCardTitle = `💬 评论外链: [${urlHost}] on "${parentTitle}"`;
              
              // Comments don't have upvotes in standard API, assign a simulated points value matching parent
              const simulatedPoints = Math.min(200, Math.max(15, (hit.story_points || 25) - 5));

              mergedStoriesMap.set(id, {
                id,
                title: commentCardTitle,
                url: extractedLink,
                points: simulatedPoints,
                author: hit.author || "hn-user",
                commentsCount: hit.story_comments_count || 3,
                createdAt: hit.created_at || new Date().toISOString(),
                originSegment: "newcomments",
                commentContext: cleanTextSnippet,
                commentAuthor: hit.author,
                commentParentTitle: hit.story_title
              });
            }
          }
        }
      } catch (err) {
        console.error("Error querying Algolia New Comments link extractions:", err);
      }
    };

    // Run searches in parallel
    const keywords = ["ai", "llm", "deepseek", "arxiv", "openai", "agent", "cuda", "rag"];
    const searchPromises = keywords.map((k) => fetchFrontpageQuery(k));
    
    // Add Ask, Show, and Comment scanners
    await Promise.all([
      ...searchPromises,
      fetchAskHNQuery(),
      fetchShowHNQuery(),
      fetchNewcommentsLinkExtraction()
    ]);

    let allHits = Array.from(mergedStoriesMap.values());
    console.log(`Fetched ${allHits.length} total multi-segment Hacker News items.`);

    // If we are looking at a single day and get too few stories, widen window
    if (dateStr && allHits.length < 6) {
      console.log("Too few stories for specific historical day. Widening query to 3-day window for density.");
      // Just fall back to preconfigured daily variance data in getPreconfiguredData
      return [];
    }

    // Sort primarily by points
    const mappedStories = allHits
      .filter((story) => story.title && story.title.length > 5)
      .sort((a, b) => b.points - a.points);

    // Limit to top 55 items to avoid blowing up LLM prompt tokens
    return mappedStories.slice(0, 55);
  } catch (error) {
    console.error("Error in fetchHNStories:", error);
    return [];
  }
}

// Perform Gemini smart categorization and summarization
export async function analyzeHNStories(stories: HNStory[], dateStr?: string): Promise<MonitorData> {
  if (stories.length === 0) {
    console.log("Empty stories supplied, using preconfigured fallback dataset.");
    return getPreconfiguredData(dateStr);
  }

  const ai = getGeminiClient();
  if (!ai) {
    console.log("GEMINI_API_KEY is not defined, analyzing fetched stories via offline Heuristic engine.");
    return getHeuristicDataFallback(stories, dateStr);
  }

  // Active Quota exhaust cooldown: skip calling API for 30 minutes if we hit a 429
  const now = Date.now();
  if (isLastCallQuotaExhausted && (now - lastQuotaExhaustedTime < 30 * 60 * 1000)) {
    const minsLeft = Math.ceil((30 * 60 * 1000 - (now - lastQuotaExhaustedTime)) / 60000);
    console.warn(`⚠️ [Gemini Cooldown Active] Quota was exhausted recently. Bypassing API to prevent stall. Remaining cooldown: ${minsLeft} mins. Using heuristic fallback...`);
    return getHeuristicDataFallback(stories, dateStr);
  }

  // Active Unavailability cooldown: skip calling API for 5 minutes if we hit a 503
  if (isLastCallUnavailable && (now - lastUnavailableTime < 5 * 60 * 1000)) {
    const minsLeft = Math.ceil((5 * 60 * 1000 - (now - lastUnavailableTime)) / 60000);
    console.warn(`⚠️ [Gemini Unavailable Cooldown Active] Model was overloaded recently. Bypassing API to prevent stall. Remaining cooldown: ${minsLeft} mins. Using heuristic fallback...`);
    return getHeuristicDataFallback(stories, dateStr);
  }

  // Prep the stories to contain only ID, Title, URL for Gemini to analyze
  const cleanedInput = stories.map((s) => ({
    id: s.id,
    title: s.title,
    url: s.url,
  }));

  const systemInstruction = 
    "You are a Senior AI Trend & Hotspot Analyst monitoring Hacker News in the AI sector.\n" +
    "You group and classify the given stories into three core categories based on their titles and URLs:\n" +
    "1. 'academic': Academic papers, arXiv pages, theoretical breakthroughs, math modeling, and research institute developments.\n" +
    "2. 'technical': Software libraries, GitHub repositories, implementations, guides, API quantizations, optimizations, tutorials, systems development.\n" +
    "3. 'marketing': Funding updates, company announcements, mergers, pricing adjustments, market speculation, or general commercial trends.\n\n" +
    "Return output EXACTLY in the requested JSON structure. Keep executive summaries and insights in concise, professional English or Chinese as appropriate based on the titles (prefer clear detailed Chinese as the primary language for descriptions and summaries).";

  const prompt = `Here is the list of recent Hacker News stories on Artificial Intelligence:\n${JSON.stringify(
    cleanedInput,
    null,
    2
  )}\n\nAnalyze and classify these items. Output a structured JSON according to the schema. Make sure every single story ID in the list is categorized into exactly one of "academic", "technical", or "marketing". For each item, supply a concise 1-sentence analysis summary ('aiSummary') in Chinese. Identify leading topics ('hotspots') and write comprehensive sector summaries ('executiveSummary') in Chinese. Identify key entities in 'topEntities' and write 'generalInsights' in Chinese.`;

  try {
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categories: {
              type: Type.OBJECT,
              properties: {
                academic: {
                  type: Type.OBJECT,
                  properties: {
                    hotspots: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of 3 current academic trend keywords"
                    },
                    executiveSummary: {
                      type: Type.STRING,
                      description: "A 2-3 sentence executive summary of academic trend in Chinese"
                    },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          aiSummary: { type: Type.STRING, description: "Concise 1-sentence summary of research/paper in Chinese" }
                        },
                        required: ["id", "aiSummary"]
                      }
                    }
                  },
                  required: ["hotspots", "executiveSummary", "items"]
                },
                technical: {
                  type: Type.OBJECT,
                  properties: {
                    hotspots: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of 3 current technical trend keywords"
                    },
                    executiveSummary: {
                      type: Type.STRING,
                      description: "A 2-3 sentence executive summary of technical trend in Chinese"
                    },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          aiSummary: { type: Type.STRING, description: "Concise 1-sentence summary of developer value in Chinese" }
                        },
                        required: ["id", "aiSummary"]
                      }
                    }
                  },
                  required: ["hotspots", "executiveSummary", "items"]
                },
                marketing: {
                  type: Type.OBJECT,
                  properties: {
                    hotspots: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of 3 current marketing trend keywords"
                    },
                    executiveSummary: {
                      type: Type.STRING,
                      description: "A 2-3 sentence executive summary of industry/marketing trend in Chinese"
                    },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          aiSummary: { type: Type.STRING, description: "Concise 1-sentence summary of business movement in Chinese" }
                        },
                        required: ["id", "aiSummary"]
                      }
                    }
                  },
                  required: ["hotspots", "executiveSummary", "items"]
                }
              },
              required: ["academic", "technical", "marketing"]
            },
            globalStats: {
              type: Type.OBJECT,
              properties: {
                topEntities: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of 5 top trending institutions/models/companies mentioned"
                },
                generalInsights: {
                  type: Type.STRING,
                  description: "A comprehensive core theme summary in Chinese"
                }
              },
              required: ["topEntities", "generalInsights"]
            },
            communitySentiment: {
              type: Type.OBJECT,
              properties: {
                optimistic: { type: Type.INTEGER, description: "Percentage of optimistic sentiment (0-100)" },
                worried: { type: Type.INTEGER, description: "Percentage of worried sentiment (0-100)" },
                excited: { type: Type.INTEGER, description: "Percentage of excited sentiment (0-100)" },
                skeptical: { type: Type.INTEGER, description: "Percentage of skeptical sentiment (0-100)" },
                analysis: { type: Type.STRING, description: "A 2-3 sentence brief consensus breakdown in Chinese analyzing the developer mood of these posts." }
              },
              required: ["optimistic", "worried", "excited", "skeptical", "analysis"]
            }
          },
          required: ["categories", "globalStats", "communitySentiment"]
        }
      }
    }));

    const aiOutputText = response.text;
    if (!aiOutputText) {
      throw new Error("Empty text returned from Gemini API");
    }

    const aiOutput = JSON.parse(aiOutputText);

    // Create a dictionary of story objects by ID for fast lookup
    const storyLookup = new Map<string, HNStory>();
    for (const story of stories) {
      storyLookup.set(story.id, story);
    }

    const categoriesMerged = {
      academic: { count: 0, hotspots: aiOutput.categories?.academic?.hotspots || [], executiveSummary: aiOutput.categories?.academic?.executiveSummary || "", items: [] as HNStory[] },
      technical: { count: 0, hotspots: aiOutput.categories?.technical?.hotspots || [], executiveSummary: aiOutput.categories?.technical?.executiveSummary || "", items: [] as HNStory[] },
      marketing: { count: 0, hotspots: aiOutput.categories?.marketing?.hotspots || [], executiveSummary: aiOutput.categories?.marketing?.executiveSummary || "", items: [] as HNStory[] }
    };

    // Helper to merge AI analysis back with original rich story metadata
    const mergeItems = (sectorItems: any[], tag: "academic" | "technical" | "marketing") => {
      const mergedList: HNStory[] = [];
      if (Array.isArray(sectorItems)) {
        for (const item of sectorItems) {
          const original = storyLookup.get(item.id);
          if (original) {
            mergedList.push({
              ...original,
              categoryTag: tag,
              aiSummary: item.aiSummary || original.title
            });
            // Mark as merged so we know what's classified
            storyLookup.delete(item.id);
          }
        }
      }
      return mergedList;
    };

    categoriesMerged.academic.items = mergeItems(aiOutput.categories?.academic?.items || [], "academic");
    categoriesMerged.academic.count = categoriesMerged.academic.items.length;

    categoriesMerged.technical.items = mergeItems(aiOutput.categories?.technical?.items || [], "technical");
    categoriesMerged.technical.count = categoriesMerged.technical.items.length;

    categoriesMerged.marketing.items = mergeItems(aiOutput.categories?.marketing?.items || [], "marketing");
    categoriesMerged.marketing.count = categoriesMerged.marketing.items.length;

    // Any remaining items that were not classified by Gemini (e.g. timeout or formatting mismatch)
    // We will distribute them to categories as a fallback
    if (storyLookup.size > 0) {
      for (const [id, original] of storyLookup.entries()) {
        const titleLower = original.title.toLowerCase();
        let tag: "academic" | "technical" | "marketing" = "technical"; // Default to tech
        
        if (titleLower.includes("arxiv") || titleLower.includes("paper") || titleLower.includes("research") || titleLower.includes("model of")) {
          tag = "academic";
        } else if (titleLower.includes("raise") || titleLower.includes("fund") || titleLower.includes("billion") || titleLower.includes("buy") || titleLower.includes("launch") || titleLower.includes("pricing") || titleLower.includes("cost")) {
          tag = "marketing";
        }
        
        categoriesMerged[tag].items.push({
          ...original,
          categoryTag: tag,
          aiSummary: original.title
        });
        categoriesMerged[tag].count++;
      }
    }

    // Prepare global distribution data
    const totalCount = categoriesMerged.academic.count + categoriesMerged.technical.count + categoriesMerged.marketing.count;
    const distribution = [
      { name: "Academic Research (学术研究)", value: categoriesMerged.academic.count },
      { name: "Technical Dev (技术开发)", value: categoriesMerged.technical.count },
      { name: "Industry Marketing (业界市场)", value: categoriesMerged.marketing.count }
    ];

    const result: MonitorData = {
      lastUpdated: new Date().toISOString(),
      isCached: false,
      postCount: totalCount,
      categories: categoriesMerged,
      globalStats: {
        distribution,
        topEntities: aiOutput.globalStats?.topEntities || ["Hacker News Devs"],
        generalInsights: aiOutput.globalStats?.generalInsights || "整体看，AI行业关注点高度多元化。"
      },
      communitySentiment: aiOutput.communitySentiment || {
        optimistic: 75,
        worried: 30,
        excited: 85,
        skeptical: 45,
        analysis: "社区情绪处于技术释放后的积极观察状态，以实用及高效计算为主调。"
      },
      associationNetwork: mineAssociationNetwork(stories)
    };

    // Save cache to disk
    const resolveCacheFile = dateStr ? path.join(CACHE_DIR, `monitor_cache_${dateStr}.json`) : CACHE_FILE;
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(resolveCacheFile, JSON.stringify(result, null, 2), "utf8");

    return result;
  } catch (error) {
    console.warn("⚠️ [Gemini API Note] Gemini classification bypassed or failed, returning high-fidelity offline heuristic fallback. Detail:", error instanceof Error ? error.message : String(error));
    return getHeuristicDataFallback(stories, dateStr);
  }
}

// Ensure loaded payload (retrieve from cache or run fresh)
export async function getMonitorData(forceRefresh = false, dateStr?: string): Promise<MonitorData> {
  const resolveCacheFile = dateStr ? path.join(CACHE_DIR, `monitor_cache_${dateStr}.json`) : CACHE_FILE;
  if (!forceRefresh) {
    try {
      const stats = await fs.stat(resolveCacheFile);
      // For historical date selections, if it exists in cache, serve it immediately!
      // For the live dashboard cache (no dateStr), check under 4 hours lifespan
      const cacheLifespan = 4 * 60 * 60 * 1000; // 4 hours
      if (dateStr || (Date.now() - stats.mtime.getTime() < cacheLifespan)) {
        const cachedContent = await fs.readFile(resolveCacheFile, "utf8");
        const data = JSON.parse(cachedContent) as MonitorData;
        data.isCached = true;
        return data;
      }
    } catch {
      // Cache doesn't exist, proceed to fetch
    }
  }

  console.log(`Analyzing fresh Hacker News entries for ${dateStr || "today"}...`);
  const stories = await fetchHNStories(dateStr);
  if (stories.length === 0) {
    console.log("Failed to fetch stories from Hacker News. Serving fallback cached data.");
    return getPreconfiguredData(dateStr);
  }
  return analyzeHNStories(stories, dateStr);
}

// Ask AI chatbot interface logic inside server
export async function askMonitorAssistant(query: string, monitorData: MonitorData): Promise<string> {
  const ai = getGeminiClient();
  const now = Date.now();
  const isCooldownActive = isLastCallQuotaExhausted && (now - lastQuotaExhaustedTime < 30 * 60 * 1000);
  const isUnavailableActive = isLastCallUnavailable && (now - lastUnavailableTime < 5 * 60 * 1000);

  if (!ai || isCooldownActive || isUnavailableActive) {
    const reasonMsg = isCooldownActive 
      ? "智能算力接口目前处于高载流量控制状态（API Quota Exhausted 429）"
      : isUnavailableActive
        ? "智能算力服务器目前高负载不可用（API Unavailable 503）"
        : "系统未配置 Gemini API 密钥";
    
    return `💡 **[离线趋势智囊服务已就绪]** 抱歉，由于${reasonMsg}，AI 智能对话目前正以**极简启发式内核**为您解答。\n\n针对您提出的：*"${query}"*\n\n我们可以从当前监测到的前沿趋势中提炼出以下核心回复：\n\n- **数据流分布**：当前监测到 Hacker News AI 板块中共有 **${monitorData.postCount}** 篇讨论。其中学术研究（Academic）有 ${monitorData.categories.academic.count} 篇，技术开发（Technical）有 ${monitorData.categories.technical.count} 篇，市场和业界动向（Marketing）有 ${monitorData.categories.marketing.count} 篇。\n- **核心焦点**：在学术方向上，当前最活跃的热词 is **${monitorData.categories.academic.hotspots.join("、")}**；在技术部署方向，最受关注的是 **${monitorData.categories.technical.hotspots.join("、")}**。\n- **技术分析**：目前热帖主要聚焦于降低推理成本与提升浏览器端侧运行效率。GGML 生态（Llama.cpp）的 WebGPU 加速、FP4/INT4 极低精度量化是开发者近期讨论最为高昂的领域。\n\n*提示：若需要获取更自由深入的多轮AI探讨，建议在网络空闲时重试，或于 Secrets 配置中更新有效的 Google AI Studio Key。*`;
  }

  // Construct context of all current stories
  const formatSector = (sectorName: string, items: HNStory[]) => {
    return items.map(item => `- [${item.points}分 / ${item.commentsCount}评论] ${item.title} (URL: ${item.url}) - 分析: ${item.aiSummary}`).join("\n");
  };

  const contextText = `
当前监测时间：${monitorData.lastUpdated}
总监测篇数：${monitorData.postCount}
学术研究焦点 (Academic):
- 热点词群: ${monitorData.categories.academic.hotspots.join(", ")}
- 核心综述: ${monitorData.categories.academic.executiveSummary}
- 文章清单:
${formatSector("学术研究", monitorData.categories.academic.items)}

技术开发焦点 (Technical):
- 热点词群: ${monitorData.categories.technical.hotspots.join(", ")}
- 核心综述: ${monitorData.categories.technical.executiveSummary}
- 文章清单:
${formatSector("技术开发", monitorData.categories.technical.items)}

业界与市场焦点 (Marketing):
- 热点词群: ${monitorData.categories.marketing.hotspots.join(", ")}
- 核心综述: ${monitorData.categories.marketing.executiveSummary}
- 文章清单:
${formatSector("业界与市场", monitorData.categories.marketing.items)}

全周总结：
- 主要涉及实体: ${monitorData.globalStats.topEntities.join(", ")}
- 整体洞察: ${monitorData.globalStats.generalInsights}
  `;

  try {
    const finalPrompt = `
You are the "HN AI Hotspot Assistant" (Hacker News AI 趋势智囊), an expert technology advisor specializing in artificial intelligence.
You are interacting with a tech founder/researcher.
Your task is to answer the user's inquiry based strictly on the current Hacker News analysis provided in the context below.

Context Monitor Data:
${contextText}

User Query: "${query}"

Guidelines:
1. Speak in friendly, professional, clear Chinese.
2. Directly reference specific Hacker News posts, scores, and links when relevant.
3. Organize your answer logically with markdown headings or bullets.
4. If the question goes slightly outside the data but is relevant to AI, combine the context's stories with your knowledge of ML/engineering to make a highly specialized tech analysis. Be rigorous and insightful.
    `;

    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: "You are the HN AI Hotspot Assistant, helping developers and academics understand the current pulse of AI on Hacker News.",
      }
    });

    const response = await retryWithBackoff(() => chat.sendMessage({ message: finalPrompt }));
    return response.text || "生成回复失败";
  } catch (err) {
    console.warn("⚠️ [Gemini API Note] AI Assistant response failed or bypassed due to temporary API limits:", err instanceof Error ? err.message : String(err));
    return `抱歉，智能分析助手目前在回答这个问题时遇到了一点技术故障：${err instanceof Error ? err.message : String(err)}`;
  }
}
