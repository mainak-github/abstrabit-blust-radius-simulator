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
} from "reactflow";
// @ts-ignore
import "reactflow/dist/style.css";
import { Box, Card, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import useSWR from "swr";
import TopBar from "@/components/layout/TopBar";
import { fetcher } from "@/lib/fetcher";
import { CRITICALITY_COLOR, STATUS_COLOR } from "@/lib/theme";
import type { GraphData, Service } from "@/types";
import type { LiveImpact } from "@/store/simulationStore";
import { useSimulationStore } from "@/store/simulationStore";

/**
 * Layout the graph in layers using a simple longest-path layering
 * algorithm. Services with no dependencies (sinks) sit at the bottom;
 * services that depend on them sit one layer up, etc.
 *
 * This is a deterministic layout — easy to reason about and stable
 * across re-renders. React Flow's edges (with the same source/target)
 * will be straight lines connecting these nodes.
 */
function layoutGraph(nodes: Service[], edges: { source: string; target: string }[]): Node[] {
  const NODE_W = 180;
  const NODE_H = 70;
  const H_GAP = 60;
  const V_GAP = 90;

  // Build reverse adjacency: for each node, the set of nodes that
  // *depend on* it (incoming edges). The layer of a node is 1 + the
  // max layer of any node depending on it.
  const incoming = new Map<string, string[]>();
  nodes.forEach((n) => incoming.set(n.id, []));
  edges.forEach((e) => {
    const list = incoming.get(e.source);
    if (list) list.push(e.target);
  });

  // Memoized: max layer of dependencies of a node.
  const layerCache = new Map<string, number>();
  function layer(id: string, visited = new Set<string>()): number {
    if (layerCache.has(id)) return layerCache.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const deps = incoming.get(id) ?? [];
    if (deps.length === 0) {
      layerCache.set(id, 0);
      return 0;
    }
    const max = Math.max(...deps.map((d) => layer(d, visited))) + 1;
    layerCache.set(id, max);
    return max;
  }

  // Group nodes by layer.
  const layers = new Map<number, string[]>();
  nodes.forEach((n) => {
    const l = layer(n.id);
    const list = layers.get(l) ?? [];
    list.push(n.id);
    layers.set(l, list);
  });

  // Position each layer horizontally.
  const result: Node[] = [];
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);
  const maxLayerSize = Math.max(...Array.from(layers.values()).map((l) => l.length));

  for (const l of sortedLayers) {
    const layerNodes = layers.get(l)!;
    const startX = -((maxLayerSize * (NODE_W + H_GAP)) - H_GAP) / 2;
    layerNodes.forEach((id, i) => {
      const svc = nodes.find((n) => n.id === id)!;
      result.push({
        id,
        type: "service",
        position: {
          x: startX + i * (NODE_W + H_GAP),
          y: l * (NODE_H + V_GAP),
        },
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
  const isImpacted = live && live.depth > 0;

  let borderColor = CRITICALITY_COLOR[service.criticality];
  let bgColor = "rgba(99, 102, 241, 0.08)";
  if (isFailed) {
    borderColor = "#ef4444";
    bgColor = "rgba(239, 68, 68, 0.15)";
  } else if (isImpacted) {
    if (live.status === "FAILED") {
      borderColor = "#ef4444";
      bgColor = "rgba(239, 68, 68, 0.15)";
    } else if (live.status === "DEGRADED") {
      borderColor = "#f59e0b";
      bgColor = "rgba(245, 158, 11, 0.15)";
    } else {
      borderColor = "#fb923c";
      bgColor = "rgba(251, 146, 60, 0.12)";
    }
  }

  return (
    <div
      style={{
        width: 180,
        height: 70,
        borderRadius: 10,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        padding: 8,
        color: "white",
        fontSize: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        transition: "all 0.3s ease",
      }}
    >
      <Handle type="target" position={Position.Bottom} style={{ background: borderColor }} />
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{service.name}</div>
      <div style={{ display: "flex", gap: 4, fontSize: 10 }}>
        <span
          style={{
            padding: "1px 6px",
            borderRadius: 4,
            background: `${STATUS_COLOR[service.status]}22`,
            color: STATUS_COLOR[service.status],
            fontWeight: 600,
          }}
        >
          {service.status}
        </span>
        <span
          style={{
            padding: "1px 6px",
            borderRadius: 4,
            background: `${CRITICALITY_COLOR[service.criticality]}22`,
            color: CRITICALITY_COLOR[service.criticality],
            fontWeight: 600,
          }}
        >
          {service.criticality}
        </span>
      </div>
      <Handle type="source" position={Position.Top} style={{ background: borderColor }} />
    </div>
  );
}

const nodeTypes = { service: ServiceNode };

export default function GraphPage() {
  const { data, isLoading } = useSWR<GraphData>(
    `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/graph`,
    fetcher,
    { refreshInterval: 15000 },
  );
  const liveImpacts = useSimulationStore((s) => s.liveImpacts);
  const failed = useSimulationStore((s) => s.failedServices);

  const nodes = useMemo<Node[]>(() => {
    if (!data) return [];
    return layoutGraph(data.nodes, data.edges);
  }, [data]);

  const edges = useMemo<Edge[]>(() => {
    if (!data) return [];
    return data.edges.map((e) => {
      const sourceLive = liveImpacts.get(e.source);
      const isActive = !!sourceLive && sourceLive.depth >= 0;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: isActive || failed.some((f) => f.id === e.source),
        style: {
          stroke: isActive ? "#f59e0b" : "rgba(255,255,255,0.2)",
          strokeWidth: isActive ? 2 : 1.5,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: isActive ? "#f59e0b" : "rgba(255,255,255,0.4)" },
      };
    });
  }, [data, liveImpacts, failed]);

  if (isLoading) {
    return (
      <>
        <TopBar title="Dependency Graph" subtitle="Interactive service topology" />
        <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <TopBar title="Dependency Graph" subtitle="Interactive service topology" />
      <Box sx={{ p: 4, height: "calc(100vh - 64px)" }}>
        <Card sx={{ height: "100%", overflow: "hidden" }}>
          <Stack direction="row" spacing={2} sx={{ p: 2, borderBottom: "1px solid rgba(255,255,255,0.06)", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {data?.nodes.length ?? 0} services · {data?.edges.length ?? 0} dependencies
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Legend />
          </Stack>
          <Box sx={{ height: "calc(100% - 64px)" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="rgba(255,255,255,0.04)" gap={20} />
              <Controls style={{ background: "rgba(13,19,32,0.9)" }} />
              <MiniMap
                style={{ background: "rgba(13,19,32,0.9)" }}
                nodeColor={(n) => CRITICALITY_COLOR[(n.data as any).service.criticality]}
                maskColor="rgba(0,0,0,0.5)"
              />
            </ReactFlow>
          </Box>
        </Card>
      </Box>
    </>
  );
}

function Legend() {
  return (
    <Stack direction="row" spacing={1.5}>
      {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((c) => (
        <Chip
          key={c}
          label={c}
          size="small"
          sx={{
            backgroundColor: `${CRITICALITY_COLOR[c]}22`,
            color: CRITICALITY_COLOR[c],
            fontWeight: 700,
          }}
        />
      ))}
    </Stack>
  );
}
