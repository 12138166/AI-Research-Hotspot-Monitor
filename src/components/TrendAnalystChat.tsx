import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, BrainCircuit, RefreshCw, ChevronDown, CheckCheck, HelpCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  time: string;
}

const PRESET_PROMPTS = [
  "分析现在哪个方向的学术研究投递最多？",
  "技术开发（Technical）板块中，最火热的 local 运行框架是哪一个？",
  "业界或者商业化上（Marketing），目前有什么引人瞩目的价格战或动态？",
  "总结一下目前大盘主要的 3 个技术和产业研究趋势。",
];

export default function TrendAnalystChat({ selectedDate }: { selectedDate?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "💡 **您好！我是 Hacker News AI 智能研究助理。** 已经成功为您解构了当前 HN 的数据分类流。对于学术研究（Academic）、技术开发（Technical）或业界市场（Marketing）的宏观走向、或是对特定开源项目及论文的细节，您都可以向我提问！请问今天想研究点什么？",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    const userMessage: Message = {
      role: "user",
      content: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      const response = await fetch("/api/monitor-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: textToSend, date: selectedDate }),
      });

      if (!response.ok) {
        throw new Error("API response error");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer || "未能生成回答说明。",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ 连接底层微服务分析模块出错，可能因为网络链接或 API 参数问题，请重试。",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      id="chat-assistant-widget"
      className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[600px] transition-all duration-300 hover:border-slate-700"
    >
      {/* Widget Header */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BrainCircuit className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold tracking-wide">HN AI 趋势智囊</h4>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 px-1.5 py-0.2 rounded font-mono">
                Flash 3.5 Ready
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {selectedDate ? (
                <span className="text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded mr-1">
                  🕰️ 已锁定历史时空: {selectedDate}
                </span>
              ) : (
                "结合 HN 实时动态为您把脉 AI 产业"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Preset quick queries */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800/80">
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mb-1.5">
          <HelpCircle className="w-3 h-3 text-indigo-400" />
          <span>推荐提问模版 (直接点击触发对话)：</span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
          {PRESET_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              disabled={isSending}
              className="text-[10px] bg-slate-800 hover:bg-indigo-900/60 text-slate-300 hover:text-indigo-200 border border-slate-700/60 hover:border-indigo-800 px-2 py-1 rounded text-left transition-all duration-150 cursor-pointer disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/30 font-sans text-xs scroll-smooth"
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 leading-relaxed ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role !== "user" && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/35 flex items-center justify-center shrink-0">
                <BrainCircuit className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 shadow-sm text-xs ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none"
                  : "bg-slate-850 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-wrap"
              }`}
            >
              <div>{msg.content}</div>
              <div
                className={`text-[9px] mt-1.5 font-mono text-right ${
                  msg.role === "user" ? "text-indigo-200" : "text-slate-400"
                }`}
              >
                {msg.time}
              </div>
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isSending && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/35 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-850 border border-slate-800 rounded-xl rounded-tl-none px-4 py-2.5 text-[11px] text-indigo-400 flex items-center gap-1.5 italic font-light">
              <Sparkles className="w-3.5 h-3.5 animate-bounce" />
              趋势智囊正从海量帖子中归纳、降维分析中...
            </div>
          </div>
        )}
      </div>

      {/* Input Form area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2"
      >
        <input
          required
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isSending}
          placeholder="问问它：“最近关于 DeepSeek 的成本策略讨论，业界反应如何？”"
          className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none disabled:opacity-55"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isSending}
          className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 disabled:hover:bg-indigo-600 font-semibold transition-all duration-150 shrink-0 text-white flex items-center justify-center gap-1 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>发送</span>
        </button>
      </form>
    </div>
  );
}
