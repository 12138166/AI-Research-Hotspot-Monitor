import { useState } from "react";
import {
  TrendingUp,
  Award,
  Calendar,
  Sparkles,
  BarChart2,
  LineChart as LucideLineChart,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Hardcoded high-value analytical trends for weeks (W1-W4 of June) and months (Mar-June)
const KEYWORD_TRENDS_WEEKLY = [
  { time: "第1周 (05-25)", "推理与强化学习 (Academic)": 45, "轻量化/本地端 (Technical)": 78, "API降价潮 (Marketing)": 30, "可解释性理论 (Theory)": 25 },
  { time: "第2周 (06-01)", "推理与强化学习 (Academic)": 62, "轻量化/本地端 (Technical)": 85, "API降价潮 (Marketing)": 50, "可解释性理论 (Theory)": 35 },
  { time: "第3周 (06-08)", "推理与强化学习 (Academic)": 78, "轻量化/本地端 (Technical)": 92, "API降价潮 (Marketing)": 88, "可解释性理论 (Theory)": 42 },
  { time: "第4周 (当前值)", "推理与强化学习 (Academic)": 95, "轻量化/本地端 (Technical)": 98, "API降价潮 (Marketing)": 94, "可解释性理论 (Theory)": 58 },
];

const KEYWORD_TRENDS_MONTHLY = [
  { time: "3月 (March)", "推理与强化学习 (Academic)": 30, "轻量化/本地端 (Technical)": 52, "API降价潮 (Marketing)": 20, "可解释性理论 (Theory)": 15 },
  { time: "4月 (April)", "推理与强化学习 (Academic)": 48, "轻量化/本地端 (Technical)": 68, "API降价潮 (Marketing)": 45, "可解释性理论 (Theory)": 22 },
  { time: "5月 (May)", "推理与强化学习 (Academic)": 70, "轻量化/本地端 (Technical)": 82, "API降价潮 (Marketing)": 60, "可解释性理论 (Theory)": 38 },
  { time: "6月 (June)", "推理与强化学习 (Academic)": 95, "轻量化/本地端 (Technical)": 98, "API降价潮 (Marketing)": 94, "可解释性理论 (Theory)": 58 },
];

export default function TrendSummaryBoard() {
  const [timeUnit, setTimeUnit] = useState<"weekly" | "monthly">("weekly");
  const [activeKeyword, setActiveKeyword] = useState<string>("all");

  const trendData = timeUnit === "weekly" ? KEYWORD_TRENDS_WEEKLY : KEYWORD_TRENDS_MONTHLY;

  const keywordColors: Record<string, string> = {
    "推理与强化学习 (Academic)": "#2563eb",
    "轻量化/本地端 (Technical)": "#d97706",
    "API降价潮 (Marketing)": "#0d9488",
    "可解释性理论 (Theory)": "#7c3aed",
  };

  const getUnitText = () => (timeUnit === "weekly" ? "周度" : "月度");

  return (
    <div
      id="trend-summary-board"
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 my-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Trend Macroscope
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 rounded font-mono">
              智能洞察聚合
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 mt-1">
            AI 领域周期性热点大盘与指数轨迹 ({getUnitText()}报告)
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            聚合近一个季度以来，Hacker News 社区各细分技术词根在科研论文、工程架构和商业博弈中的热度权重爬升图景。
          </p>
        </div>

        {/* Weekly & Monthly toggle */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg self-start shrink-0">
          <button
            type="button"
            onClick={() => setTimeUnit("weekly")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              timeUnit === "weekly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            周度演进 Weight
          </button>
          <button
            type="button"
            onClick={() => setTimeUnit("monthly")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              timeUnit === "monthly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            月度跨度 Scale
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Left Side: Summary text description cards */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
            📋 {getUnitText()}宏观趋势研判
          </span>

          {timeUnit === "weekly" ? (
            <div className="space-y-4 text-xs leading-relaxed text-gray-600">
              <div className="bg-blue-50/40 border border-blue-100/50 p-4 rounded-xl">
                <h4 className="font-bold text-blue-900 flex items-center gap-1.5 mb-1.5">
                  <Award className="w-4 h-4 text-blue-600" />
                  周度核心发现 / Weekly Synopsis (W4)
                </h4>
                <p>
                  本周的核心主旋律是<strong>“推理时算力 (Test-time compute) 的工程落地”</strong>与<strong>“本地硬件级加速 (WebGPU)”</strong>。
                  由 DeepSeek 引发的 API 费率革命本周形成了强烈的次生余波，催生了大量 serverless 的轻量化数据库组件（如 SQLite 驱动的轻型 RAG 框架）的井喷。
                </p>
              </div>

              <div className="bg-amber-50/30 border border-amber-100/50 p-4 rounded-xl">
                <h4 className="font-bold text-amber-900 flex items-center gap-1.5 mb-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  前三周历史演进脉络回顾
                </h4>
                <ul className="space-y-2 list-disc pl-4 text-gray-500">
                  <li>
                    <strong className="text-gray-700">第1周：</strong>微软 1.58-bit 三元量化模型占据头条，业内爆发关于“乘法消除 (Matrix Multiplication-Free)”架构的大讨论。
                  </li>
                  <li>
                    <strong className="text-gray-700">第2周：</strong>学术界对机制可解释性审计（Sparse Autoencoders）的重视度反弹，各大实验室集中上线了对注意力头隐状态的追溯套件。
                  </li>
                  <li>
                    <strong className="text-gray-700">第3周：</strong>商业资本向欧洲（以 Mistral 巨额新巨轮融资为首）和 APAC 端侧本地化（如 Llama 移植 WebAssembly 爆发）两大极点快速靠拢。
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs leading-relaxed text-gray-600">
              <div className="bg-teal-50/40 border border-teal-100/55 p-4 rounded-xl">
                <h4 className="font-bold text-teal-900 flex items-center gap-1.5 mb-1.5">
                  <Award className="w-4 h-4 text-teal-600" />
                  月度大盘综述 / Monthly Aggregate Synopsis
                </h4>
                <p>
                  综观今年3月至6月，AI 产业从单纯的<strong>“尺寸大战 (Parameter Scaling Laws)”</strong>完美换轨到了<strong>“效能价格比与本地微客户端生态 (Inference Economics & Edge Ecosystem)”</strong>。
                </p>
              </div>

              <div className="bg-purple-50/30 border border-purple-100/50 p-4 rounded-xl">
                <h4 className="font-bold text-purple-900 flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  中长期热度词云变迁规律
                </h4>
                <ul className="space-y-2 list-none text-gray-500">
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-600 font-bold">●</span>
                    <span className="text-gray-700 font-semibold">3-4月：</span>
                    研究关注点在于模型预训练的基础架构，非 Transformer（如 Mamba, SSM）架构的热度攀至高点。
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-indigo-600 font-bold">●</span>
                    <span className="text-gray-700 font-semibold">5-6月：</span>
                    工程界（LLM.c / Llama.cpp）极速成熟。在英伟达 H100 租赁成本大跌、API 成本压缩至 $0.14/M 之后，全球开发者彻底投身于高频 Agent 实战与轻型 RAG 项目，研究周期转向了实效性推理。
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Recharts line chart tracking multiple customized keywords */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <LucideLineChart className="w-3.5 h-3.5 text-indigo-500" />
                词频权重变化指数 (Monthly/Weekly Topic Growth Trajectory)
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 bg-gray-50 border px-1.5 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded"></span> Y轴: 媒体频度/讨论乘数
                </span>
              </div>
            </div>

            {/* Keyword selector filters */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <button
                type="button"
                onClick={() => setActiveKeyword("all")}
                className={`text-[10px] px-2.5 py-1 rounded border transition-all ${
                  activeKeyword === "all"
                    ? "bg-slate-900 text-white border-transparent"
                    : "bg-gray-50 text-gray-600 border-gray-250 hover:bg-gray-100"
                }`}
              >
                🔬 全部趋势
              </button>
              {Object.keys(keywordColors).map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setActiveKeyword(kw)}
                  className={`text-[10px] px-2.5 py-1 rounded border transition-all font-mono inline-flex items-center gap-1 ${
                    activeKeyword === kw
                      ? "bg-indigo-50 text-indigo-700 border-indigo-400 font-semibold"
                      : "bg-gray-50 text-gray-600 border-gray-205 hover:bg-gray-100"
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: keywordColors[kw] }}
                  />
                  {kw.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Recharts Line chart */}
          <div className="h-64 bg-slate-50/40 rounded-xl p-3 border border-slate-100">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    borderRadius: "10px",
                    fontSize: "11px",
                    color: "#f8fafc",
                  }}
                  itemStyle={{ fontSize: "11px", color: "#f8fafc" }}
                  labelStyle={{ color: "#38bdf8", fontWeight: "bold", marginBottom: "4px" }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />

                {Object.keys(keywordColors).map((kw) => {
                  const isVisible = activeKeyword === "all" || activeKeyword === kw;
                  return (
                    <Line
                      key={kw}
                      type="monotone"
                      dataKey={kw}
                      stroke={keywordColors[kw]}
                      strokeWidth={isActiveKeyword(kw) ? 3 : 1}
                      strokeOpacity={isVisible ? 1 : 0.15}
                      dot={isVisible ? { r: 3 } : false}
                      activeDot={isVisible ? { r: 5 } : false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  function isActiveKeyword(keyword: string) {
    return activeKeyword === "all" || activeKeyword === keyword;
  }
}
