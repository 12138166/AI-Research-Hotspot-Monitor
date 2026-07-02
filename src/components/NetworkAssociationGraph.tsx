import React, { useState, useEffect, useRef } from "react";
import { Share2, Info, Activity, ZoomIn, Target, Bell, AlertTriangle, Radio, Settings } from "lucide-react";
import { MonitorData } from "../types";

interface Node {
  id: string;
  label: string;
  category: "academic" | "technical" | "marketing";
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

interface NetworkAssociationGraphProps {
  currentData?: MonitorData | null;
  onAddAlert?: (alert: any) => void;
}

export default function NetworkAssociationGraph({ currentData, onAddAlert }: NetworkAssociationGraphProps) {
  const [dimensions, setDimensions] = useState({ width: 700, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<Node[]>([
    { id: "1", label: "DeepSeek / MLA / R1", category: "academic", size: 38, x: 200, y: 150, vx: 0.2, vy: -0.1 },
    { id: "2", label: "llama.cpp", category: "technical", size: 30, x: 120, y: 220, vx: -0.1, vy: 0.2 },
    { id: "3", label: "WebGPU / WASM", category: "technical", size: 34, x: 420, y: 280, vx: 0.15, vy: -0.22 },
    { id: "4", label: "Test-time Scaling / RL", category: "academic", size: 32, x: 340, y: 100, vx: -0.25, vy: 0.15 },
    { id: "5", label: "Agentic Systems", category: "technical", size: 28, x: 180, y: 320, vx: 0.1, vy: -0.18 },
    { id: "6", label: "Price Wars / API Costs", category: "marketing", size: 36, x: 500, y: 140, vx: -0.12, vy: 0.25 },
    { id: "7", label: "NVIDIA / GPU Leases", category: "marketing", size: 26, x: 460, y: 60, vx: 0.2, vy: -0.15 },
    { id: "8", label: "Interpretability / SAEs", category: "academic", size: 24, x: 100, y: 80, vx: -0.18, vy: 0.22 },
    { id: "9", label: "Local RAG / Vector DB", category: "technical", size: 26, x: 300, y: 240, vx: 0.22, vy: 0.1 },
    { id: "10", label: "Apple Intelligence", category: "marketing", size: 28, x: 580, y: 250, vx: -0.15, vy: -0.12 },
    { id: "11", label: "Open-Source Models", category: "technical", size: 25, x: 350, y: 335, vx: -0.2, vy: 0.12 },
    { id: "12", label: "Mamba / SSMs", category: "academic", size: 24, x: 80, y: 300, vx: 0.12, vy: 0.18 },
  ]);

  const [links, setLinks] = useState<Link[]>([
    { source: "1", target: "4", value: 3 },
    { source: "1", target: "6", value: 5 },
    { source: "2", target: "3", value: 4 },
    { source: "3", target: "5", value: 2 },
    { source: "1", target: "5", value: 3 },
    { source: "6", target: "7", value: 4 },
    { source: "1", target: "8", value: 2 },
    { source: "3", target: "9", value: 3 },
    { source: "5", target: "9", value: 3 },
    { source: "6", target: "10", value: 2 },
    { source: "4", target: "9", value: 1 },
    { source: "1", target: "11", value: 2 },
    { source: "11", target: "12", value: 1 }
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Users can subscribe to certain nodes to watch for 24h relationship sudden mutations
  const [subscribedNodeIds, setSubscribedNodeIds] = useState<string[]>(["1", "3", "4", "5"]);

  const toggleSubscription = (nodeId: string) => {
    setSubscribedNodeIds((prev) =>
      prev.includes(nodeId)
        ? prev.filter((id) => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  // Synchronize incoming mined topology
  useEffect(() => {
    if (currentData?.associationNetwork) {
      const minedNodes = currentData.associationNetwork.nodes;
      const minedLinks = currentData.associationNetwork.links;

      setNodes((prevNodes) => {
        return minedNodes.map((mNode) => {
          const existing = prevNodes.find((n) => n.id === mNode.id);
          if (existing) {
            return {
              ...existing,
              label: mNode.label,
              size: mNode.size,
              category: mNode.category,
            };
          } else {
            const angle = Math.random() * Math.PI * 2;
            const r = 80 + Math.random() * 80;
            return {
              id: mNode.id,
              label: mNode.label,
              category: mNode.category,
              size: mNode.size,
              x: (dimensions.width / 2) + Math.cos(angle) * r,
              y: (dimensions.height / 2) + Math.sin(angle) * r,
              vx: (Math.random() - 0.5) * 0.4,
              vy: (Math.random() - 0.5) * 0.4,
            };
          }
        });
      });

      setLinks(minedLinks);
    }
  }, [currentData?.associationNetwork, dimensions.width, dimensions.height]);

  const triggerMutationSimulation = (type: "academic" | "technical" | "marketing") => {
    let srcNodeId = "";
    let tgtNodeId = "";
    let reason = "";
    let oldVal = 3;
    let newVal = 9;

    if (type === "academic") {
      srcNodeId = "1"; // DeepSeek
      tgtNodeId = "4"; // Test-time
      oldVal = 3;
      newVal = 9;
      reason = "近期多篇顶会论文联合分析在 Test-time Compute (动态计算图分支) 算力扩展下的新架构效能，引起学术引用激增，使关联权值成倍跃变！";
    } else if (type === "technical") {
      srcNodeId = "3"; // WebGPU
      tgtNodeId = "9"; // Local RAG
      oldVal = 3;
      newVal = 8;
      reason = "WebGPU 标准大面积在各平台浏览器端默认激活，促进 local RAG 工程代码库的深度交叉整合，24h内 Github 共现热度异动。";
    } else {
      srcNodeId = "6"; // Price Wars
      tgtNodeId = "7"; // NVIDIA H100
      oldVal = 4;
      newVal = 10;
      reason = "各大科技巨头对边缘和基础模型启动了极性价格战，导致云算力 NVIDIA H100 租赁转售通道在二级市场引发剧烈的流动性套期。";
    }

    const srcNode = nodes.find((n) => n.id === srcNodeId);
    const tgtNode = nodes.find((n) => n.id === tgtNodeId);

    if (!srcNode || !tgtNode) return;

    // Check if at least one of the nodes is currently subscribed
    const isSubscribed = subscribedNodeIds.includes(srcNodeId) || subscribedNodeIds.includes(tgtNodeId);
    
    // Automatically subscribe if not already subscribed to give responsive user feedback
    if (!isSubscribed) {
      setSubscribedNodeIds((prev) => Array.from(new Set([...prev, srcNodeId, tgtNodeId])));
    }

    if (onAddAlert) {
      onAddAlert({
        id: Math.random().toString(36).substring(2, 9),
        sourceLabel: srcNode.label,
        targetLabel: tgtNode.label,
        oldValue: oldVal,
        newValue: newVal,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        reason: reason,
        type: type,
        isRead: false
      });
    }
  };

  // Soft physics animation loop: floater node effect
  useEffect(() => {
    let animationFrameId: number;

    const updatePhysics = () => {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          // Add light bounding box attraction forces (center gravity pull)
          const gravitySourceX = dimensions.width / 2;
          const gravitySourceY = dimensions.height / 2;
          const kGravity = 0.0003;
          
          let ax = (gravitySourceX - node.x) * kGravity;
          let ay = (gravitySourceY - node.y) * kGravity;

          // Compute repel offsets from sibling nodes
          prevNodes.forEach((other) => {
            if (other.id === node.id) return;
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const mindist = 110; // repel limit
            if (dist < mindist) {
              const force = (mindist - dist) * 0.0015;
              ax += (dx / dist) * force;
              ay += (dy / dist) * force;
            }
          });

          // Soft velocity integration
          let newVx = (node.vx + ax) * 0.98; // damping
          let newVy = (node.vy + ay) * 0.98;

          // Speed regulator clamps
          const maxSpeed = 1.0;
          const speed = Math.sqrt(newVx * newVx + newVy * newVy);
          if (speed > maxSpeed) {
            newVx = (newVx / speed) * maxSpeed;
            newVy = (newVy / speed) * maxSpeed;
          }

          let newX = node.x + newVx;
          let newY = node.y + newVy;

          // Soft boundary bounces
          const padding = 45;
          if (newX < padding) { newX = padding; newVx = Math.abs(newVx) * 0.8; }
          if (newX > dimensions.width - padding) { newX = dimensions.width - padding; newVx = -Math.abs(newVx) * 0.8; }
          if (newY < padding) { newY = padding; newVy = Math.abs(newVy) * 0.8; }
          if (newY > dimensions.height - padding) { newY = dimensions.height - padding; newVy = -Math.abs(newVy) * 0.8; }

          return {
            ...node,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
          };
        })
      );

      animationFrameId = requestAnimationFrame(updatePhysics);
    };

    animationFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  const getNodeColor = (category: string, isHighlighted: boolean) => {
    if (!isHighlighted && (selectedNodeId || hoveredNodeId)) {
      return "rgba(226, 232, 240, 0.45)"; // Dimmed out during active filters
    }
    switch (category) {
      case "academic":
        return "rgb(37, 99, 235)"; // blue
      case "technical":
        return "rgb(245, 158, 11)"; // orange/amber
      case "marketing":
        return "rgb(20, 184, 166)"; // teal
      default:
        return "rgb(124, 58, 237)";
    }
  };

  const getActiveState = (nodeId: string) => {
    if (!selectedNodeId && !hoveredNodeId) return true;
    const focusId = hoveredNodeId || selectedNodeId;
    if (focusId === nodeId) return true;
    
    // Check adjacency
    return links.some(
      (link) =>
        (link.source === nodeId && link.target === focusId) ||
        (link.target === nodeId && link.source === focusId)
    );
  };

  const activeFocusNode = hoveredNodeId || selectedNodeId;
  const focusNodeObj = nodes.find((n) => n.id === activeFocusNode);

  return (
    <div id="network-graph-panel" className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-500 animate-pulse" />
            AI 热点关键词关联拓扑网络 / Knowledge Association Network
          </h3>
          <span className="text-[10px] bg-slate-100 hover:bg-slate-200 text-gray-500 px-2 py-1 rounded-md transition-all font-mono font-bold flex items-center gap-1 cursor-default">
            <Activity className="w-3 h-3 text-emerald-500 animate-bounce" /> Physics Layer Realtime
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          通过多路自编码聚类算子绘制的 AI 突破性叙事关键词共现图谱。可通过 <strong>自研无监督斥力拓扑</strong> (Attraction-Repulsion Physics Engine)
          保持网络动态平衡。直接 <strong>点击或悬停</strong> 任意热点磁环，可以查看其上下游关联因子衍生。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        {/* Dynamic SVG Drawing Ground */}
        <div
          ref={containerRef}
          className="lg:col-span-3 h-[420px] bg-slate-900 border border-slate-900 rounded-xl overflow-hidden relative shadow-inner cursor-grab active:cursor-grabbing flex flex-col justify-between"
          id="physics-canvas-stage"
        >
          {/* Background Grid Accent decoration */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:30px_30px] opacity-15 pointer-events-none" />

          {/* Canvas SVG element */}
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="absolute inset-0 pointer-events-auto"
          >
            {/* Draw Relationship Links first */}
            {links.map((link, idx) => {
              const srcNode = nodes.find((n) => n.id === link.source);
              const tgtNode = nodes.find((n) => n.id === link.target);
              if (!srcNode || !tgtNode) return null;

              const isHighlighted =
                !activeFocusNode ||
                srcNode.id === activeFocusNode ||
                tgtNode.id === activeFocusNode;

              return (
                <line
                  key={`link-${idx}`}
                  x1={srcNode.x}
                  y1={srcNode.y}
                  x2={tgtNode.x}
                  y2={tgtNode.y}
                  stroke={isHighlighted ? "rgba(99, 102, 241, 0.65)" : "rgba(71, 85, 105, 0.15)"}
                  strokeWidth={isHighlighted ? 1.5 + link.value / 2 : 0.8}
                  strokeDasharray={(!isHighlighted) ? "2, 3" : undefined}
                  className="transition-all duration-300"
                />
              );
            })}

            {/* Draw Nodes */}
            {nodes.map((node) => {
              const isAccent = getActiveState(node.id);
              const nodeColor = getNodeColor(node.category, isAccent);
              const isTargetNode = selectedNodeId === node.id || hoveredNodeId === node.id;

              return (
                <g
                  key={node.id}
                  className="cursor-pointer transition-all duration-150"
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => {
                    if (selectedNodeId === node.id) {
                      setSelectedNodeId(null);
                    } else {
                      setSelectedNodeId(node.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {/* Outer breathing halo aura */}
                  <circle
                    r={isTargetNode ? node.size + 12 : node.size + 4}
                    fill={nodeColor}
                    fillOpacity={isAccent ? (isTargetNode ? 0.15 : 0.06) : 0.01}
                    className="transition-all duration-300 animate-pulse"
                  />
                  {/* Core node solid circle */}
                  <circle
                    r={node.size / 2}
                    fill={nodeColor}
                    fillOpacity={isAccent ? 1 : 0.25}
                    stroke="#1e293b"
                    strokeWidth={isTargetNode ? 2.5 : 1}
                    className="transition-all duration-300"
                  />
                  {/* Pulsing beacon indicating active 24H subscription monitoring */}
                  {subscribedNodeIds.includes(node.id) && (
                    <g transform={`translate(${node.size / 3.2}, ${-node.size / 3.2})`}>
                      <circle
                        r={4.5}
                        fill="#f43f5e"
                        className="animate-ping"
                      />
                      <circle
                        r={3}
                        fill="#f43f5e"
                        stroke="#0f172a"
                        strokeWidth={0.8}
                      />
                    </g>
                  )}
                  {/* Node Title text label inside svg */}
                  <text
                    dy={node.size / 2 + 15}
                    textAnchor="middle"
                    fill={isAccent ? "#f8fafc" : "#64748b"}
                    fontSize={isTargetNode ? "11px" : "10px"}
                    fontWeight={isTargetNode ? "bold" : "normal"}
                    className="pointer-events-none select-none font-sans drop-shadow-md transition-all duration-300"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Quick HUD legend inside the canvas bottom */}
          <div className="absolute top-4 left-4 text-[10px] bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 text-slate-400 space-y-1 select-none flex flex-col justify-center pointer-events-none z-10 font-sans">
            <span className="font-bold text-[11px] text-white flex items-center gap-1 border-b border-slate-800 pb-1 mb-1">
              <Info className="w-3 h-3 text-indigo-400" />
              维度色谱对应 / Color Mapping
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shrink-0"></span>
              <span>Academic (学术研讨焦点)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0"></span>
              <span>Technical (深度技术演练)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block shrink-0"></span>
              <span>Marketing (业界商业定价)</span>
            </div>
          </div>

          {/* Tip notification at the bottom banner inside canvas */}
          <div className="absolute bottom-4 right-4 pointer-events-none bg-slate-950/80 text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] font-mono border border-indigo-950 flex items-center gap-2 backdrop-blur-xs select-none">
            <Target className="w-3 h-3 animate-spin" /> Click nodes to lock upstream linkage
          </div>
        </div>

        {/* Association Link Detail Sidebar widget */}
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-indigo-500" />
                热能共振透视 / Node Focus Info
              </h4>
            </div>

            {focusNodeObj ? (
              <div className="space-y-3 bg-white border border-slate-150 rounded-xl p-3 shadow-xs">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    当前聚焦 / Active Node
                  </span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-sm font-black text-slate-800 leading-tight">
                      {focusNodeObj.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleSubscription(focusNodeObj.id)}
                      className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black border transition-all duration-150 cursor-pointer ${
                        subscribedNodeIds.includes(focusNodeObj.id)
                          ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                          : "bg-slate-100 text-slate-650 border-transparent hover:bg-slate-200"
                      }`}
                      title={subscribedNodeIds.includes(focusNodeObj.id) ? "点击退订突变监测" : "点击启动突变监测"}
                    >
                      <Bell className={`w-3 h-3 ${subscribedNodeIds.includes(focusNodeObj.id) ? "fill-rose-500 text-rose-650 animate-pulse" : ""}`} />
                      <span>{subscribedNodeIds.includes(focusNodeObj.id) ? "已订" : "订阅"}</span>
                    </button>
                  </div>
                  <span className={`inline-block text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded mt-1.5 ${
                    focusNodeObj.category === "academic" ? "bg-blue-100 text-blue-700" :
                    focusNodeObj.category === "technical" ? "bg-amber-100 text-amber-700" :
                    "bg-teal-100 text-teal-700"
                  }`}>
                    {focusNodeObj.category === "academic" ? "Academia 学术焦点" :
                     focusNodeObj.category === "technical" ? "Code Engineering 工程实践" :
                     "Industry Business 行业市场"}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-150">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    强关联要素 / Interconnected Links
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {links
                      .filter((l) => l.source === focusNodeObj.id || l.target === focusNodeObj.id)
                      .map((l, idx) => {
                        const peerId = l.source === focusNodeObj.id ? l.target : l.source;
                        const peerNode = nodes.find((n) => n.id === peerId);
                        if (!peerNode) return null;
                        
                        return (
                          <div
                            key={idx}
                            onMouseEnter={() => setHoveredNodeId(peerNode.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            className="bg-slate-50 border border-slate-100 rounded p-1.5 flex items-center justify-between text-xs hover:border-indigo-200 hover:bg-white transition-all cursor-default"
                          >
                            <span className="font-semibold text-gray-700">
                              {peerNode.label}
                            </span>
                            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded font-mono font-bold shrink-0">
                              权值 {l.value}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center space-y-1">
                <Share2 className="w-6 h-6 text-slate-300 animate-pulse" />
                <p className="text-[10px] text-gray-400 leading-snug">
                  请在左侧点击或悬停热点磁环<br />调取强关联衍生指标详情。
                </p>
              </div>
            )}

            {/* Realtime Subscription Monitoring and Simulation Panel */}
            <div className="border-t border-gray-250/60 pt-3 space-y-3">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase text-gray-700 tracking-wide">
                  突变订阅控制台 / Alert Simulation
                </span>
              </div>
              <p className="text-[10px] text-gray-450 leading-relaxed">
                本关联网络已绑定 <b>24H突变监听订阅器</b>。直接点击下方模拟异动样本，即可实时在顶部 Header 弹窗触发突变提示：
              </p>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => triggerMutationSimulation("academic")}
                  className="w-full text-left bg-white hover:bg-blue-50/50 p-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition-all text-[11px] flex items-center justify-between cursor-pointer group"
                >
                  <div className="min-w-0 pr-1">
                    <span className="font-bold text-blue-700 block truncate">⚡ 学术关联突增</span>
                    <span className="text-[9px] text-gray-400 block truncate">DeepSeek ⇄ Test-time Compute</span>
                  </div>
                  <span className="text-[9px] border bg-slate-50 group-hover:bg-blue-500 group-hover:text-white px-1 py-0.5 rounded font-mono font-bold transition-colors">
                    模拟
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerMutationSimulation("technical")}
                  className="w-full text-left bg-white hover:bg-amber-50/50 p-1.5 rounded-lg border border-slate-200 hover:border-amber-300 transition-all text-[11px] flex items-center justify-between cursor-pointer group"
                >
                  <div className="min-w-0 pr-1">
                    <span className="font-bold text-amber-700 block truncate">⚡ 技术工程骤热</span>
                    <span className="text-[9px] text-gray-400 block truncate">WebGPU ⇄ Local RAG</span>
                  </div>
                  <span className="text-[9px] border bg-slate-50 group-hover:bg-amber-500 group-hover:text-white px-1 py-0.5 rounded font-mono font-bold transition-colors">
                    模拟
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerMutationSimulation("marketing")}
                  className="w-full text-left bg-white hover:bg-teal-50/50 p-1.5 rounded-lg border border-slate-200 hover:border-teal-300 transition-all text-[11px] flex items-center justify-between cursor-pointer group"
                >
                  <div className="min-w-0 pr-1">
                    <span className="font-bold text-teal-700 block truncate">⚡ 市场能效突变</span>
                    <span className="text-[9px] text-gray-400 block truncate">Price Wars ⇄ NVIDIA H100</span>
                  </div>
                  <span className="text-[9px] border bg-slate-50 group-hover:bg-teal-500 group-hover:text-white px-1 py-0.5 rounded font-mono font-bold transition-colors">
                    模拟
                  </span>
                </button>
              </div>

              {/* Subscribed nodes overview */}
              <div className="bg-slate-100 p-2 rounded-lg space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                  当前已订阅对流点 / Subscribed ({subscribedNodeIds.length})
                </span>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-0.5">
                  {nodes.map((n) => {
                    const isSub = subscribedNodeIds.includes(n.id);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => toggleSubscription(n.id)}
                        className={`text-[8px] px-1 py-0.5 rounded-full transition-all cursor-pointer ${
                          isSub
                            ? "bg-rose-500 text-white font-extrabold"
                            : "bg-slate-200 text-slate-450 hover:bg-slate-300"
                        }`}
                        title={isSub ? "点击退订" : "点击订阅"}
                      >
                        {n.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Network description summary footer info */}
          <div className="text-[9px] text-gray-400 leading-relaxed pt-2.5 border-t border-slate-200">
            <strong>热核突变算法：</strong>系统使用无监督流形共现强度指标。当某一通道突变率突破 50% 并触达特定能级时，即会被监测哨兵判定为特异异动对流并触发警报推送。
          </div>
        </div>
      </div>
    </div>
  );
}
