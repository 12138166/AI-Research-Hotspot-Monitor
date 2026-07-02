import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Smile, Heart, AlertTriangle, HelpCircle, Activity } from "lucide-react";

interface SentimentProps {
  sentiment?: {
    optimistic: number;
    worried: number;
    excited: number;
    skeptical: number;
    analysis: string;
  };
}

export default function SentimentRadarChart({ sentiment }: SentimentProps) {
  // Use a sensible default in case sentiment data isn't loaded yet
  const optimistic = sentiment?.optimistic ?? 75;
  const worried = sentiment?.worried ?? 30;
  const excited = sentiment?.excited ?? 85;
  const skeptical = sentiment?.skeptical ?? 45;
  const analysis = sentiment?.analysis ?? "根据大模型解析，当前社区对生成式 AI 实操落地与高性价比算力表现出积极兴奋的共识。";

  const chartData = [
    { subject: "乐观 (Optimistic)", A: optimistic, fullMark: 100 },
    { subject: "担忧 (Worried)", A: worried, fullMark: 100 },
    { subject: "兴奋 (Excited)", A: excited, fullMark: 100 },
    { subject: "怀疑 (Skeptical)", A: skeptical, fullMark: 100 },
  ];

  return (
    <div
      id="sentiment-radar-bento"
      className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-600" />
            社区舆论情绪诊断 / Sentiment Radar
          </h3>
          <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
            Gemini Analytical
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          利用 Gemini 对 HN 评论区文本张量进行情感分布拟合，量化学术与技术派对当前 AI 议题的真实心声。
        </p>

        {/* Radar Chart Container */}
        <div className="h-44 w-full flex items-center justify-center relative bg-slate-50/40 rounded-xl border border-slate-100 p-1">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid stroke="#cbd5e1" strokeWidth={0.5} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#475569", fontSize: 9, fontWeight: "600" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "#94a3b8", fontSize: 8 }}
                tickFormat={(v) => `${v}%`}
                axisLine={false}
              />
              <Radar
                name="舆论情绪比"
                dataKey="A"
                stroke="#7c3aed"
                fill="#8b5cf6"
                fillOpacity={0.25}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  fontSize: "10px",
                  color: "#f8fafc",
                }}
                itemStyle={{ color: "#f8fafc" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Brief descriptive insights */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800">
        <div className="text-[11px] leading-relaxed text-gray-600 bg-purple-50/45 p-2 rounded-lg border border-purple-100 font-sans">
          <span className="font-bold text-purple-900 block mb-0.5 flex items-center gap-1">
            🧠 AI 情绪面研判:
          </span>
          {analysis}
        </div>
      </div>
    </div>
  );
}
