import { describe, it, expect } from "vitest";
import { wouldCreateCycle, findAllCycles } from "./cycle.detector";
import { computeBlastRadius } from "./blast.radius";
import type { AdjacencyList, ServiceNode } from "../types";

// Helper to construct a mock AdjacencyList graph for testing
function createMockGraph(
  services: ServiceNode[],
  edges: [string, string][] // [fromId, toId] (from depends on to)
): AdjacencyList {
  const nodes = new Map<string, ServiceNode>();
  services.forEach((s) => nodes.set(s.id, s));

  const downstream = new Map<string, string[]>();
  const upstream = new Map<string, string[]>();

  services.forEach((s) => {
    downstream.set(s.id, []);
    upstream.set(s.id, []);
  });

  edges.forEach(([fromId, toId]) => {
    downstream.get(fromId)?.push(toId);
    upstream.get(toId)?.push(fromId);
  });

  return { downstream, upstream, nodes };
}

describe("Cycle Detector", () => {
  const services: ServiceNode[] = [
    { id: "A", name: "Service A", owner: "Team A", criticality: "MEDIUM", status: "HEALTHY" },
    { id: "B", name: "Service B", owner: "Team B", criticality: "CRITICAL", status: "HEALTHY" },
    { id: "C", name: "Service C", owner: "Team C", criticality: "LOW", status: "HEALTHY" },
    { id: "D", name: "Service D", owner: "Team D", criticality: "HIGH", status: "HEALTHY" },
  ];

  it("should not detect a cycle for valid dependencies in a DAG", () => {
    // A -> B -> C
    const graph = createMockGraph(services, [
      ["A", "B"],
      ["B", "C"],
    ]);

    // Adding C -> D should not create a cycle (resulting graph: A -> B -> C -> D)
    const result = wouldCreateCycle(graph, "C", "D");
    expect(result.createsCycle).toBe(false);
  });

  it("should detect a cycle when a service tries to depend on itself", () => {
    const graph = createMockGraph(services, []);
    const result = wouldCreateCycle(graph, "A", "A");
    expect(result.createsCycle).toBe(true);
    expect(result.cyclePath).toEqual(["A", "A"]);
  });

  it("should detect direct circular dependency (A depends on B, B depends on A)", () => {
    // A -> B
    const graph = createMockGraph(services, [["A", "B"]]);

    // Adding B -> A creates a cycle
    const result = wouldCreateCycle(graph, "B", "A");
    expect(result.createsCycle).toBe(true);
    expect(result.cyclePath).toEqual(["B", "A", "B"]);
  });

  it("should detect transitive circular dependency (A -> B -> C and C tries to depend on A)", () => {
    // A -> B -> C
    const graph = createMockGraph(services, [
      ["A", "B"],
      ["B", "C"],
    ]);

    // Adding C -> A creates a cycle A -> B -> C -> A
    const result = wouldCreateCycle(graph, "C", "A");
    expect(result.createsCycle).toBe(true);
    expect(result.cyclePath).toEqual(["C", "A", "B", "C"]);
  });

  it("should find all cycles in a graph with pre-existing cycles", () => {
    // A -> B -> C -> A (cycle 1), D is separate
    const graph = createMockGraph(services, [
      ["A", "B"],
      ["B", "C"],
      ["C", "A"],
    ]);

    const cycles = findAllCycles(graph);
    expect(cycles.length).toBeGreaterThan(0);
    // There's a cycle containing A, B, and C
    expect(cycles[0]).toContain("A");
    expect(cycles[0]).toContain("B");
    expect(cycles[0]).toContain("C");
  });

  it("should return empty array for findAllCycles in a DAG", () => {
    // A -> B -> C
    const graph = createMockGraph(services, [
      ["A", "B"],
      ["B", "C"],
    ]);

    const cycles = findAllCycles(graph);
    expect(cycles).toEqual([]);
  });
});

describe("Blast Radius Calculations", () => {
  const services: ServiceNode[] = [
    { id: "A", name: "Service A", owner: "Team A", criticality: "MEDIUM", status: "HEALTHY" }, // depends on B
    { id: "B", name: "Service B", owner: "Team B", criticality: "CRITICAL", status: "HEALTHY" }, // depends on C, D
    { id: "C", name: "Service C", owner: "Team C", criticality: "LOW", status: "HEALTHY" },
    { id: "D", name: "Service D", owner: "Team D", criticality: "HIGH", status: "HEALTHY" }, // depends on E
    { id: "E", name: "Service E", owner: "Team E", criticality: "LOW", status: "HEALTHY" },
  ];

  // Dependencies:
  // A depends on B (A -> B)
  // B depends on C (B -> C)
  // B depends on D (B -> D)
  // D depends on E (D -> E)
  // This means:
  // - If E fails: D (depends on E) is impacted (depth 1)
  //              B (depends on D) is impacted (depth 2)
  //              A (depends on B) is impacted (depth 3)
  // - If C fails: B (depends on C) is impacted (depth 1)
  //              A (depends on B) is impacted (depth 2)
  // - If A fails: Nothing downstream is impacted (A is at the top of the chain)
  const graph = createMockGraph(services, [
    ["A", "B"],
    ["B", "C"],
    ["B", "D"],
    ["D", "E"],
  ]);

  it("should return zero blast radius when a leaf dependent service (no dependents) fails", () => {
    // Service A has no other services depending on it.
    const result = computeBlastRadius(graph, ["A"]);
    expect(result.blastRadius).toBe(0);
    expect(result.maxDepth).toBe(0);
    expect(result.totalRiskScore).toBe(0);
    expect(result.severity).toBe("LOW");
    expect(result.failedServices).toEqual([{ id: "A", name: "Service A" }]);
    expect(result.impacted.length).toBe(1); // just the failed service itself at depth 0
    expect(result.impacted[0].serviceId).toBe("A");
    expect(result.impacted[0].depth).toBe(0);
  });

  it("should propagate failure and calculate correct depths/paths when a central service fails", () => {
    // If D fails, it should impact B (depth 1) and A (depth 2)
    // E and C are not impacted since nothing depends on them that is failing
    const result = computeBlastRadius(graph, ["D"]);

    expect(result.failedServices).toEqual([{ id: "D", name: "Service D" }]);
    expect(result.blastRadius).toBe(2); // B and A

    // Impact list should contain D (failed, depth 0), B (impacted, depth 1), A (impacted, depth 2)
    expect(result.impacted.map((i) => i.serviceId)).toEqual(["D", "B", "A"]);

    const nodeB = result.impacted.find((i) => i.serviceId === "B")!;
    expect(nodeB.depth).toBe(1);
    expect(nodeB.path).toEqual(["Service D", "Service B"]);
    // B is CRITICAL, so depth 1 failure escalates it to FAILED
    expect(nodeB.status).toBe("FAILED");

    const nodeA = result.impacted.find((i) => i.serviceId === "A")!;
    expect(nodeA.depth).toBe(2);
    expect(nodeA.path).toEqual(["Service D", "Service B", "Service A"]);
    expect(nodeA.status).toBe("AT_RISK");
  });

  it("should calculate correct risk scores and severity categories", () => {
    // Failure of B:
    // Impacts: A (depends on B, depth 1)
    // A has criticality: MEDIUM (weight 2).
    // B is the failure (depth 0, contribution 0)
    // A is depth 1. Contribution = 2 * (6 - 1) * 5 = 50.
    // Total risk = 50.
    // Score of 50 corresponds to MEDIUM severity (40 <= score < 100).
    const result = computeBlastRadius(graph, ["B"]);
    expect(result.blastRadius).toBe(1);
    expect(result.totalRiskScore).toBe(50);
    expect(result.severity).toBe("MEDIUM");
  });

  it("should handle multiple failed services and prevent duplicate calculations", () => {
    // Fail both B and E:
    // Failed: B, E
    // B propagates to A (depth 1)
    // E propagates to D (depth 1) -> B (already failed/processed, should not be reprocessed)
    const result = computeBlastRadius(graph, ["B", "E"]);
    expect(result.failedServices).toEqual([
      { id: "B", name: "Service B" },
      { id: "E", name: "Service E" },
    ]);
    // D is impacted by E (depth 1)
    // A is impacted by B (depth 1)
    expect(result.blastRadius).toBe(2); // A and D
    const ids = result.impacted.map((i) => i.serviceId);
    expect(ids).toContain("A");
    expect(ids).toContain("D");
  });
});
