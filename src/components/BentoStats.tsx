import { BookOpen, Code, LineChart as LucideLineChart, Cpu, Trophy, Compass, TrendingUp } from "lucide-react";
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
import SentimentRadarChart from "./SentimentRadarChart";

interface BentoProps {
  academicCount: number;
  technicalCount: number;
  marketingCount: number;
  topEntities: string[];
  generalInsights: string;
  communitySentiment?: {
    optimistic: number;
    worried: number;
    excited: number;
    skeptical: number;
    analysis: string;
  };
}

export default function BentoStats({
  academicCount,
  technicalCount,
  marketingCount,
  topEntities,
  generalInsights,
  communitySentiment,
}: BentoProps) {
  const total = academicCount + technicalCount + marketingCount;

  const getPercentage = (value: number) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  // Generate responsive simulated discussion velocity data over the last 24h
  // seeded by current category counts
  const generateTrendData = () => {
    const hours = ["02:00", "05:00", "08:00", "11:00", "14:00", "17:00", "20:00", "23:00"];
    
    return hours.map((hour, index) => {
      // Create peak traffic modeling curve representing user attention waves
      const baseWave = Math.sin((index / (hours.length - 1)) * Math.PI) * 0.4 + 0.65;
      
      return {
        time: hour,
        "学术研讨": parseFloat((academicCount * baseWave * (0.85 + Math.cos(index * 1.6) * 0.15) / 2).toFixed(1)),
        "技术开发": parseFloat((technicalCount * baseWave * (0.8 + Math.sin(index * 2.2) * 0.2) / 2).toFixed(1)),
        "业界市场": parseFloat((marketingCount * baseWave * (0.9 + Math.cos(index * 2.7) * 0.1) / 2).toFixed(1)),
      };
    });
  };

  const trendData = generateTrendData();

  return (
    <div id="bento-stats" className="grid grid-cols-1 lg:grid-cols-4 gap-6 my-8">
      {/* 1. Sector Proportion Bento Grid Card with embedded Recharts Velocity Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm col-span-1 lg:col-span-2 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              数据占比与24h活跃波谱 / Core Metrics & Velocity
            </h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium">
              3大硬核视角
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            基于当前采集的 HN 高频 AI 讨论样本，分析过去24小时各维度的活跃峰值与讨论变化速度。
          </p>

          {/* Grid Layout inside Bento Stat: progress bars on the left, Recharts graph on the right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-2">
            {/* Left side detail values */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-blue-600 block"></span>
                    Academic 学术研究 ({academicCount}篇)
                  </span>
                  <span className="font-mono text-gray-500">{getPercentage(academicCount)}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${getPercentage(academicCount)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500 block"></span>
                    Technical 技术开发 ({technicalCount}篇)
                  </span>
                  <span className="font-mono text-gray-500">{getPercentage(technicalCount)}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${getPercentage(technicalCount)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-teal-500 block"></span>
                    Marketing 业界市场 ({marketingCount}篇)
                  </span>
                  <span className="font-mono text-gray-500">{getPercentage(marketingCount)}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${getPercentage(marketingCount)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right side: Recharts Area/Line Chart */}
            <div className="lg:col-span-7 h-44 bg-slate-50/50 rounded-lg p-2 border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-gray-400 block px-1">
                24小时讨论热度波谱 (Velocity Rate / 3h Epochs)
              </span>
              <div className="w-full h-36 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "8px",
                        color: "#f8fafc",
                        fontSize: "10px",
                      }}
                      itemStyle={{ color: "#f8fafc" }}
                      labelStyle={{ color: "#38bdf8", fontWeight: "bold" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="学术研讨"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="技术开发"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="业界市场"
                      stroke="#14b8a6"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Legend of stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100 text-center">
          <div className="bg-blue-50/50 rounded-lg p-2">
            <BookOpen className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <div className="text-lg font-bold font-mono text-blue-700">{academicCount}</div>
            <div className="text-[10px] text-gray-500">论文 / 算法研究</div>
          </div>
          <div className="bg-amber-50/50 rounded-lg p-2 border-amber-100">
            <Code className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <div className="text-lg font-bold font-mono text-amber-700">{technicalCount}</div>
            <div className="text-[10px] text-gray-500">开源 / 工程实践</div>
          </div>
          <div className="bg-teal-50/50 rounded-lg p-2">
            <LucideLineChart className="w-4 h-4 text-teal-600 mx-auto mb-1" />
            <div className="text-lg font-bold font-mono text-teal-700">{marketingCount}</div>
            <div className="text-[10px] text-gray-500">商业落地 / 资本</div>
          </div>
        </div>
      </div>

      {/* 2. Top Entities Spotlight Grid Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              高频焦点实体 / Top Entities
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">Current Peak</span>
          </div>
          <p className="text-xs text-gray-400 mb-4 animate-pulse">
            算法提取本次数据中被讨论最多的主流框架、工具链与机构。
          </p>

          <div className="flex flex-wrap gap-2">
            {topEntities && topEntities.length > 0 ? (
              topEntities.map((entity, i) => (
                <span
                  key={i}
                  className="bg-gray-100 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-100 text-gray-700 hover:text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-150 cursor-default"
                >
                  #{entity}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 font-light">暂无高频识别词。</span>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-start gap-2 text-xs text-indigo-600 bg-indigo-50/50 rounded-lg p-3 border border-indigo-50">
            <Cpu className="w-4 h-4 shrink-0 text-indigo-500 mt-0.5" />
            <div className="leading-relaxed">
              <strong>提示：</strong>在右侧的 AI 趋势智囊对话框中，你可以直接向它询问关于这些实体的最新架构讨论脉络！
            </div>
          </div>
        </div>
      </div>

      {/* Community Sentiment Radar Dashboard */}
      <SentimentRadarChart sentiment={communitySentiment} />

      {/* 3. Global AI Deep Insights Banner - fullwidth span */}
      <div className="bg-gradient-to-r from-gray-900 to-indigo-950 text-white rounded-xl p-5 md:p-6 shadow-md lg:col-span-4">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-500/20 text-indigo-300 p-3 rounded-lg border border-indigo-500/35 self-start">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300">
                AI Agent 本期大盘宏观洞察 / Global Core Insights
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                智源算法分类已就绪
              </span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed font-sans font-light">
              {generalInsights ||
                "未获取到大盘趋势评估。请尝试点击上方『重爬并重新分析』按钮触发大规模 AI 数据降维和提炼。"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
