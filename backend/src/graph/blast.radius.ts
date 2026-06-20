import { AdjacencyList, BlastRadiusResult, Criticality, ImpactedNode, ImpactStatus, Severity, ServiceNode } from "../types";

const CRITICALITY_WEIGHT: Record<Criticality, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 4,
  CRITICAL: 8,
};

/**
 * Classify the impact of a downstream service based on its depth in the
 * failure propagation graph and its declared criticality.
 *
 * - depth 1 -> DEGRADED (closest)
 * - depth 2 -> AT_RISK
 * - depth 3+ -> AT_RISK
 *
 * CRITICAL services escalate one tier because their failure has outsized
 * business impact even at deeper levels.
 */
function classifyImpact(depth: number, criticality: Criticality): ImpactStatus {
  if (criticality === "CRITICAL") {
    if (depth === 1) return "FAILED";
    return "DEGRADED";
  }
  if (depth === 1) return "DEGRADED";
  return "AT_RISK";
}

/**
 * Risk score for one impacted service.
 * Combines how far it is from the failure and how critical it is.
 * The weight is front-loaded so a 1-hop critical failure is far worse
 * than a 5-hop minor service.
 */
function riskContribution(depth: number, criticality: Criticality): number {
  const depthWeight = Math.max(1, 6 - depth); // 1->5, 2->4, 3->3, ...
  return CRITICALITY_WEIGHT[criticality] * depthWeight * 5;
}

function severityFromScore(score: number, affected: number): Severity {
  if (score >= 200 || affected >= 8) return "CRITICAL";
  if (score >= 100 || affected >= 5) return "HIGH";
  if (score >= 40 || affected >= 2) return "MEDIUM";
  return "LOW";
}

/**
 * Compute the blast radius of one or more failed services.
 *
 * BFS over the upstream map: a failure in A propagates to anything that
 * depends on A. We do not propagate through cycles — each service is
 * visited at most once and we record the shortest (fewest hops) path.
 *
 * Complexity: O(V + E)
 */
export function computeBlastRadius(
  graph: AdjacencyList,
  failedIds: string[],
): BlastRadiusResult {
  const impacted = new Map<string, ImpactedNode>();
  const queue: { id: string; depth: number; path: string[] }[] = [];

  // Initialize with the failed services themselves.
  for (const id of failedIds) {
    const node = graph.nodes.get(id);
    if (!node) continue;
    queue.push({ id, depth: 0, path: [node.name] });
  }

  let maxDepth = 0;
  let totalRisk = 0;

  while (queue.length > 0) {
    const { id, depth, path } = queue.shift()!;
    const node = graph.nodes.get(id);
    if (!node) continue;

    if (!impacted.has(id)) {
      const status: ImpactStatus = depth === 0 ? "FAILED" : classifyImpact(depth, node.criticality);
      const contribution = depth === 0 ? 0 : riskContribution(depth, node.criticality);
      totalRisk += contribution;
      maxDepth = Math.max(maxDepth, depth);

      impacted.set(id, {
        serviceId: id,
        serviceName: node.name,
        depth,
        path: [...path],
        criticality: node.criticality,
        status,
        contribution,
      });
    }

    // Propagate failure to everything that depends on this service.
    if (depth < 10) {
      for (const upstreamId of graph.upstream.get(id) ?? []) {
        if (!impacted.has(upstreamId) && !failedIds.includes(upstreamId)) {
          const upstreamNode = graph.nodes.get(upstreamId);
          if (!upstreamNode) continue;
          queue.push({
            id: upstreamId,
            depth: depth + 1,
            path: [...path, upstreamNode.name],
          });
        }
      }
    }
  }

  // The failed services themselves are not "impacted" for scoring — they
  // are the source. We do include them in the returned list with depth 0.
  const failedNodes = failedIds
    .map((id) => graph.nodes.get(id))
    .filter((n): n is ServiceNode => Boolean(n))
    .map((n) => ({ id: n.id, name: n.name }));

  const downstreamImpacted = Array.from(impacted.values()).filter((i) => i.depth > 0);
  const severity = severityFromScore(totalRisk, downstreamImpacted.length);

  return {
    failedServices: failedNodes,
    impacted: Array.from(impacted.values()).sort((a, b) => a.depth - b.depth || a.serviceName.localeCompare(b.serviceName)),
    blastRadius: downstreamImpacted.length,
    maxDepth,
    totalRiskScore: Math.round(totalRisk),
    severity,
  };
}
