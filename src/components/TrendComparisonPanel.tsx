import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { MonitorData } from "../types";
import { Sparkles, Calendar, TrendingUp } from "lucide-react";

interface TrendComparisonPanelProps {
  dataA: MonitorData;
  dataB: MonitorData | null;
  dateA: string;
  dateB: string;
  loadingB: boolean;
}

export default function TrendComparisonPanel({
  dataA,
  dataB,
  dateA,
  dateB,
  loadingB,
}: TrendComparisonPanelProps) {
  const formattedDateA = dateA || "实时最新 (Live)";
  const formattedDateB = dateB || "未选择比较时空";

  if (!dataB) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-slate-400 my-4 text-xs font-sans leading-relaxed">
        <Sparkles className="w-5 h-5 text-indigo-400 mx-auto mb-2 animate-pulse" />
        请输入或选择第二个时空日期（例如上方预设的 <strong>2026-06-15</strong> ），开始生成多时刻跨度叠放对比图谱。
      </div>
    );
  }

  if (loadingB) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center text-slate-400 my-4 text-xs font-sans">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400 mx-auto mb-3"></div>
        正在并发穿梭并同步解析历史时空快照 ({formattedDateB})...
      </div>
    );
  }

  // Build metrics comparison payload
  const compareChartData = [
    {
      metric: "Academia 学术占比 (%)",
      [formattedDateA]: Math.round(
        (dataA.categories.academic.count / dataA.postCount) * 100 || 0
      ),
      [formattedDateB]: Math.round(
        (dataB.categories.academic.count / dataB.postCount) * 100 || 0
      ),
    },
    {
      metric: "Technical 技术占比 (%)",
      [formattedDateA]: Math.round(
        (dataA.categories.technical.count / dataA.postCount) * 100 || 0
      ),
      [formattedDateB]: Math.round(
        (dataB.categories.technical.count / dataB.postCount) * 100 || 0
      ),
    },
    {
      metric: "Marketing 市场占比 (%)",
      [formattedDateA]: Math.round(
        (dataA.categories.marketing.count / dataA.postCount) * 100 || 0
      ),
      [formattedDateB]: Math.round(
        (dataB.categories.marketing.count / dataB.postCount) * 100 || 0
      ),
    },
    {
      metric: "舆论乐观度 Index",
      [formattedDateA]: dataA.communitySentiment?.optimistic ?? 70,
      [formattedDateB]: dataB.communitySentiment?.optimistic ?? 70,
    },
    {
      metric: "舆论担忧度 Index",
      [formattedDateA]: dataA.communitySentiment?.worried ?? 30,
      [formattedDateB]: dataB.communitySentiment?.worried ?? 30,
    },
    {
      metric: "舆论兴奋度 Index",
      [formattedDateA]: dataA.communitySentiment?.excited ?? 80,
      [formattedDateB]: dataB.communitySentiment?.excited ?? 80,
    },
    {
      metric: "舆论怀疑度 Index",
      [formattedDateA]: dataA.communitySentiment?.skeptical ?? 40,
      [formattedDateB]: dataB.communitySentiment?.skeptical ?? 40,
    },
  ];

  return (
    <div id="trend-comparison-panel" className="bg-slate-950 border border-indigo-500/20 rounded-xl p-5 my-4 text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            跨时空重叠趋势对比 / Temporal Overlaid Line Metrics
          </h3>
          <p className="text-[11px] text-slate-400 leading-normal">
            对比两个时空维度的讨论深度分布占比与舆情指数。折线叠放直接暴露了 AI 关注点随时间演进的位移。
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] shrink-0 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 roundedbg bg-indigo-500 inline-block"></span>
            <strong>时空 A:</strong> {formattedDateA}
          </span>
          <span className="text-slate-500">vs</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 roundedbg bg-amber-400 inline-block"></span>
            <strong>时空 B:</strong> {formattedDateB}
          </span>
        </div>
      </div>

      {/* Overlaid Recharts Line Chart */}
      <div className="h-64 w-full bg-slate-900/45 rounded-lg border border-slate-850 p-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={compareChartData} margin={{ top: 15, right: 25, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="metric"
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              axisLine={{ stroke: "#334155" }}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              domain={[0, 100]}
              axisLine={{ stroke: "#334155" }}
              tickFormat={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0d0f17",
                borderColor: "#1e293b",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#f1f5f9",
              }}
              labelStyle={{ color: "#818cf8", fontWeight: "bold" }}
            />
            <Legend wrapperStyle={{ fontSize: "10px", marginTop: "5px" }} />
            <Line
              type="monotone"
              dataKey={formattedDateA}
              stroke="#6366f1"
              strokeWidth={3}
              activeDot={{ r: 6 }}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey={formattedDateB}
              stroke="#fbbf24"
              strokeWidth={3}
              strokeDasharray="5 5"
              activeDot={{ r: 6 }}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Analysis and Delta insights */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
          <span className="font-bold text-indigo-300 block mb-1">⏱️ 时空 A ({formattedDateA}) 大局特写:</span>
          学术讨论篇数: <strong className="text-white">{dataA.categories.academic.count}篇</strong> | 
          开发讨论: <strong className="text-white">{dataA.categories.technical.count}篇</strong> | 
          企业市场: <strong className="text-white">{dataA.categories.marketing.count}篇</strong>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            {dataA.globalStats.generalInsights?.substring(0, 85)}...
          </p>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
          <span className="font-bold text-amber-300 block mb-1">⏱️ 时空 B ({formattedDateB}) 对比特写:</span>
          学术讨论篇数: <strong className="text-white">{dataB.categories.academic.count}篇</strong> | 
          开发讨论: <strong className="text-white">{dataB.categories.technical.count}篇</strong> | 
          企业市场: <strong className="text-white">{dataB.categories.marketing.count}篇</strong>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            {dataB.globalStats.generalInsights?.substring(0, 85)}...
          </p>
        </div>
      </div>
    </div>
  );
}
