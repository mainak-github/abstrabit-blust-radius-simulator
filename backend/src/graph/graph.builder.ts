import prisma from "../config/prisma";
import { AdjacencyList, ServiceNode } from "../types";

/**
 * Build an in-memory adjacency list from the database.
 * Used by all graph algorithms to keep traversals O(V+E).
 *
 * Edge semantics: if A "depends on" B, then B is a dependency of A.
 * - downstream[A] = services A depends on (B)
 * - upstream[B]   = services that depend on B (A)
 */
export async function buildAdjacencyList(): Promise<AdjacencyList> {
  const [services, dependencies] = await Promise.all([
    prisma.service.findMany(),
    prisma.dependency.findMany(),
  ]);

  const nodes = new Map<string, ServiceNode>();
  const downstream = new Map<string, string[]>();
  const upstream = new Map<string, string[]>();

  for (const s of services) {
    nodes.set(s.id, {
      id: s.id,
      name: s.name,
      owner: s.owner,
      criticality: s.criticality as ServiceNode["criticality"],
      status: s.status as ServiceNode["status"],
      description: s.description,
    });
    downstream.set(s.id, []);
    upstream.set(s.id, []);
  }

  for (const dep of dependencies) {
    // dep.service depends on dep.dependsOn
    downstream.get(dep.serviceId)?.push(dep.dependsOnServiceId);
    upstream.get(dep.dependsOnServiceId)?.push(dep.serviceId);
  }

  return { nodes, downstream, upstream };
}
