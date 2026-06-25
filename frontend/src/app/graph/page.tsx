"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
// @ts-ignore
import "reactflow/dist/style.css";
import { Box, Card, Chip, CircularProgress, Paper, Stack, Tooltip, Typography } from "@mui/material";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import useSWR from "swr";
import TopBar from "@/components/layout/TopBar";
import { fetcher } from "@/lib/fetcher";
import { CRITICALITY_COLOR, CRITICALITY_GLOW, STATUS_COLOR } from "@/lib/theme";
import type { GraphData, Service } from "@/types";
import type { LiveImpact } from "@/store/simulationStore";
import { useSimulationStore } from "@/store/simulationStore";
import { useSimulationSocket } from "@/hooks/useSimulationSocket";

/**
 * Deterministic longest-path layering layout:
 * Sinks (no dependents) sit at the bottom; entry points at the top.
 * Each layer is evenly spaced horizontally.
 */
function layoutGraph(nodes: Service[], edges: { source: string; target: string }[]): Node[] {
  const NODE_W = 190;
  const NODE_H = 80;
  const H_GAP = 60;
  const V_GAP = 100;

  const incoming = new Map<string, string[]>();
  nodes.forEach((n) => incoming.set(n.id, []));
  edges.forEach((e) => {
    const list = incoming.get(e.source);
    if (list) list.push(e.target);
  });

  const layerCache = new Map<string, number>();
  function layer(id: string, visited = new Set<string>()): number {
    if (layerCache.has(id)) return layerCache.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const deps = incoming.get(id) ?? [];
    if (deps.length === 0) { layerCache.set(id, 0); return 0; }
    const max = Math.max(...deps.map((d) => layer(d, visited))) + 1;
    layerCache.set(id, max);
    return max;
  }

  const layers = new Map<number, string[]>();
  nodes.forEach((n) => {
    const l = layer(n.id);
    const list = layers.get(l) ?? [];
    list.push(n.id);
    layers.set(l, list);
  });

  const result: Node[] = [];
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);
  const maxLayerSize = Math.max(...Array.from(layers.values()).map((l) => l.length));

  for (const l of sortedLayers) {
    const layerNodes = layers.get(l)!;
    const totalWidth = layerNodes.length * (NODE_W + H_GAP) - H_GAP;
    const startX = -totalWidth / 2;
    layerNodes.forEach((id, i) => {
      const svc = nodes.find((n) => n.id === id)!;
      result.push({
        id,
        type: "service",
        position: { x: startX + i * (NODE_W + H_GAP), y: l * (NODE_H + V_GAP) },
        data: { service: svc },
      });
    });
  }
  return result;
}

function ServiceNode({ data }: NodeProps<{ service: Service }>) {
  const { service } = data;
  const liveImpacts = useSimulationStore((s) => s.liveImpacts);
  const failed = useSimulationStore((s) => s.failedServices);
  const isFailed = failed.some((f) => f.id === service.id);
  const live = liveImpacts.get(service.id) as LiveImpact | undefined;
  const isImpacted = !!live && live.depth > 0;
  const [hovered, setHovered] = useState(false);

  let borderColor = CRITICALITY_COLOR[service.criticality];
  let bgColor = "rgba(15,21,37,0.9)";
  let glowColor = "transparent";

  if (isFailed) {
    borderColor = "#ef4444";
    bgColor = "rgba(239,68,68,0.18)";
    glowColor = "rgba(239,68,68,0.4)";
  } else if (isImpacted) {
    if (live!.status === "DEGRADED") {
      borderColor = "#f59e0b";
      bgColor = "rgba(245,158,11,0.15)";
      glowColor = "rgba(245,158,11,0.35)";
    } else {
      borderColor = "#fb923c";
      bgColor = "rgba(251,146,60,0.12)";
      glowColor = "rgba(251,146,60,0.3)";
    }
  } else if (hovered) {
    glowColor = `${CRITICALITY_COLOR[service.criticality]}44`;
  }

  const statusColor = isFailed
    ? "#ef4444"
    : isImpacted
      ? live!.status === "DEGRADED"
        ? "#f59e0b"
        : "#fb923c"
      : STATUS_COLOR[service.status];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 190,
        minHeight: 78,
        borderRadius: 12,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        padding: "8px 10px",
        color: "white",
        boxShadow: glowColor !== "transparent" ? `0 0 20px ${glowColor}, 0 4px 16px rgba(0,0,0,0.4)` : "0 4px 16px rgba(0,0,0,0.4)",
        transition: "all 0.3s ease",
        cursor: "pointer",
        backdropFilter: "blur(4px)",
      }}
    >
      <Handle type="target" position={Position.Bottom} style={{ background: borderColor, width: 8, height: 8, border: "none" }} />
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {service.name}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <span style={{ padding: "2px 7px", borderRadius: 5, background: `${statusColor}22`, color: statusColor, fontWeight: 600, fontSize: 10 }}>
          {isFailed ? "FAILED" : isImpacted ? live!.status : service.status}
        </span>
        <span style={{ padding: "2px 7px", borderRadius: 5, background: `${CRITICALITY_COLOR[service.criticality]}22`, color: CRITICALITY_COLOR[service.criticality], fontWeight: 600, fontSize: 10 }}>
          {service.criticality}
        </span>
      </div>
      {hovered && (
        <div style={{ marginTop: 5, fontSize: 10, color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 5 }}>
          Owner: <span style={{ color: "#c7d2fe" }}>{service.owner}</span>
        </div>
      )}
      <Handle type="source" position={Position.Top} style={{ background: borderColor, width: 8, height: 8, border: "none" }} />
    </div>
  );
}

const nodeTypes = { service: ServiceNode };

function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <Tooltip title="Fit to view">
      <Box
        onClick={() => fitView({ padding: 0.2, duration: 400 })}
        sx={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 10,
          width: 32,
          height: 32,
          borderRadius: 1.5,
          backgroundColor: "rgba(13,19,32,0.9)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#94a3b8",
          "&:hover": { backgroundColor: "rgba(99,102,241,0.15)", color: "#c7d2fe", borderColor: "rgba(99,102,241,0.3)" },
          transition: "all 0.2s",
        }}
      >
        <FitScreenIcon sx={{ fontSize: 18 }} />
      </Box>
    </Tooltip>
  );
}

function GraphCanvas({ data }: { data: GraphData }) {
  const liveImpacts = useSimulationStore((s) => s.liveImpacts);
  const failed = useSimulationStore((s) => s.failedServices);

  const nodes = useMemo<Node[]>(() => layoutGraph(data.nodes, data.edges), [data]);

  const edges = useMemo<Edge[]>(() => {
    return data.edges.map((e) => {
      const sourceLive = liveImpacts.get(e.source);
      const isActive = !!sourceLive && sourceLive.depth >= 0;
      const isSourceFailed = failed.some((f) => f.id === e.source);
      const animated = isActive || isSourceFailed;
      const color = isSourceFailed ? "#ef4444" : isActive ? "#f59e0b" : "rgba(255,255,255,0.15)";
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated,
        style: { stroke: color, strokeWidth: animated ? 2 : 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      };
    });
  }, [data, liveImpacts, failed]);

  return (
    <Box sx={{ height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={20} />
        <Controls style={{ background: "rgba(8,12,24,0.9)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <MiniMap
          style={{ background: "rgba(8,12,24,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}
          nodeColor={(n) => {
            const impact = liveImpacts.get(n.id);
            if (impact && impact.status === "FAILED") return "#ef4444";
            if (impact && impact.status === "DEGRADED") return "#f59e0b";
            if (impact) return "#fb923c";
            return CRITICALITY_COLOR[(n.data as any).service?.criticality ?? "LOW"];
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
      <FitViewButton />
    </Box>
  );
}

export default function GraphPage() {
  useSimulationSocket();

  const { data, isLoading } = useSWR<GraphData>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/graph`,
    fetcher,
    { refreshInterval: 15000 },
  );
  const isRunning = useSimulationStore((s) => s.isRunning);

  if (isLoading) {
    return (
      <>
        <TopBar title="Dependency Graph" subtitle="Interactive service topology" />
        <Box sx={{ p: 4, display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <Stack spacing={2} sx={{ alignItems: "center" }}>
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ color: "#475569" }}>Loading graph…</Typography>
          </Stack>
        </Box>
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      <TopBar title="Dependency Graph" subtitle="Interactive service topology" />
      <Box sx={{ p: 4, height: "calc(100vh - 64px)" }}>
        <Card sx={{ height: "100%", overflow: "hidden" }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ p: 2, borderBottom: "1px solid rgba(255,255,255,0.06)", alignItems: "center", flexWrap: "wrap", gap: 1 }}
          >
            <Typography variant="body2" sx={{ color: "#475569" }}>
              {data.nodes.length} services · {data.edges.length} dependencies
            </Typography>
            {isRunning && (
              <Chip
                label="Live simulation"
                size="small"
                sx={{
                  backgroundColor: "rgba(245,158,11,0.15)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245,158,11,0.3)",
                  fontWeight: 600,
                  animation: "pulse 1.5s infinite ease-in-out",
                }}
              />
            )}
            <Box sx={{ flex: 1 }} />
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((c) => (
              <Chip
                key={c}
                label={c}
                size="small"
                sx={{
                  backgroundColor: `${CRITICALITY_COLOR[c]}18`,
                  color: CRITICALITY_COLOR[c],
                  border: `1px solid ${CRITICALITY_COLOR[c]}33`,
                  fontWeight: 700,
                  height: 22,
                }}
              />
            ))}
          </Stack>
          <Box sx={{ height: "calc(100% - 56px)" }}>
            <ReactFlowProvider>
              <GraphCanvas data={data} />
            </ReactFlowProvider>
          </Box>
        </Card>
      </Box>
    </>
  );
}
