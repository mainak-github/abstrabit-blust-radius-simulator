import { AdjacencyList } from "../types";

/**
 * Detect whether adding an edge serviceId -> dependsOnServiceId would
 * create a cycle in the dependency graph.
 *
 * Conceptually: "A depends on B" means information/control flows A -> B.
 * A cycle exists if B (transitively) already depends on A.
 *
 * Algorithm: DFS from dependsOnServiceId following the downstream map.
 * If we reach serviceId, the new edge would close a cycle.
 */
export function wouldCreateCycle(
  graph: AdjacencyList,
  serviceId: string,
  dependsOnServiceId: string,
): { createsCycle: boolean; cyclePath?: string[] } {
  if (serviceId === dependsOnServiceId) {
    return { createsCycle: true, cyclePath: [serviceId, serviceId] };
  }

  // Check if dependsOnServiceId already reaches serviceId via downstream.
  const visited = new Set<string>();
  const stack: { id: string; path: string[] }[] = [{ id: dependsOnServiceId, path: [dependsOnServiceId] }];

  while (stack.length > 0) {
    const { id, path } = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);

    if (id === serviceId) {
      // Adding the dependency serviceId -> dependsOnServiceId closes the loop.
      // path is [dependsOnServiceId, ..., serviceId].
      // Return [serviceId, dependsOnServiceId, ..., serviceId] to show the full cycle.
      return { createsCycle: true, cyclePath: [serviceId, ...path] };
    }

    for (const next of graph.downstream.get(id) ?? []) {
      if (!visited.has(next)) {
        stack.push({ id: next, path: [...path, next] });
      }
    }
  }

  return { createsCycle: false };
}

/**
 * Find all cycles in the current graph. Returns an empty array if the
 * graph is a DAG. Used to surface pre-existing cycles to the user.
 */
export function findAllCycles(graph: AdjacencyList): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const pathSet = new Set<string>();
  const path: string[] = [];

  function dfs(id: string) {
    if (pathSet.has(id)) {
      const cycleStart = path.indexOf(id);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart));
      }
      return;
    }
    if (visited.has(id)) return;

    visited.add(id);
    pathSet.add(id);
    path.push(id);

    for (const next of graph.downstream.get(id) ?? []) {
      dfs(next);
    }

    pathSet.delete(id);
    path.pop();
  }

  for (const id of graph.nodes.keys()) {
    dfs(id);
  }

  return cycles;
}
