"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cycle_detector_1 = require("./cycle.detector");
const blast_radius_1 = require("./blast.radius");
// Helper to construct a mock AdjacencyList graph for testing
function createMockGraph(services, edges // [fromId, toId] (from depends on to)
) {
    const nodes = new Map();
    services.forEach((s) => nodes.set(s.id, s));
    const downstream = new Map();
    const upstream = new Map();
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
(0, vitest_1.describe)("Cycle Detector", () => {
    const services = [
        { id: "A", name: "Service A", owner: "Team A", criticality: "MEDIUM", status: "HEALTHY" },
        { id: "B", name: "Service B", owner: "Team B", criticality: "CRITICAL", status: "HEALTHY" },
        { id: "C", name: "Service C", owner: "Team C", criticality: "LOW", status: "HEALTHY" },
        { id: "D", name: "Service D", owner: "Team D", criticality: "HIGH", status: "HEALTHY" },
    ];
    (0, vitest_1.it)("should not detect a cycle for valid dependencies in a DAG", () => {
        // A -> B -> C
        const graph = createMockGraph(services, [
            ["A", "B"],
            ["B", "C"],
        ]);
        // Adding C -> D should not create a cycle (resulting graph: A -> B -> C -> D)
        const result = (0, cycle_detector_1.wouldCreateCycle)(graph, "C", "D");
        (0, vitest_1.expect)(result.createsCycle).toBe(false);
    });
    (0, vitest_1.it)("should detect a cycle when a service tries to depend on itself", () => {
        const graph = createMockGraph(services, []);
        const result = (0, cycle_detector_1.wouldCreateCycle)(graph, "A", "A");
        (0, vitest_1.expect)(result.createsCycle).toBe(true);
        (0, vitest_1.expect)(result.cyclePath).toEqual(["A", "A"]);
    });
    (0, vitest_1.it)("should detect direct circular dependency (A depends on B, B depends on A)", () => {
        // A -> B
        const graph = createMockGraph(services, [["A", "B"]]);
        // Adding B -> A creates a cycle
        const result = (0, cycle_detector_1.wouldCreateCycle)(graph, "B", "A");
        (0, vitest_1.expect)(result.createsCycle).toBe(true);
        (0, vitest_1.expect)(result.cyclePath).toEqual(["B", "A", "B"]);
    });
    (0, vitest_1.it)("should detect transitive circular dependency (A -> B -> C and C tries to depend on A)", () => {
        // A -> B -> C
        const graph = createMockGraph(services, [
            ["A", "B"],
            ["B", "C"],
        ]);
        // Adding C -> A creates a cycle A -> B -> C -> A
        const result = (0, cycle_detector_1.wouldCreateCycle)(graph, "C", "A");
        (0, vitest_1.expect)(result.createsCycle).toBe(true);
        (0, vitest_1.expect)(result.cyclePath).toEqual(["C", "A", "B", "C"]);
    });
    (0, vitest_1.it)("should find all cycles in a graph with pre-existing cycles", () => {
        // A -> B -> C -> A (cycle 1), D is separate
        const graph = createMockGraph(services, [
            ["A", "B"],
            ["B", "C"],
            ["C", "A"],
        ]);
        const cycles = (0, cycle_detector_1.findAllCycles)(graph);
        (0, vitest_1.expect)(cycles.length).toBeGreaterThan(0);
        // There's a cycle containing A, B, and C
        (0, vitest_1.expect)(cycles[0]).toContain("A");
        (0, vitest_1.expect)(cycles[0]).toContain("B");
        (0, vitest_1.expect)(cycles[0]).toContain("C");
    });
    (0, vitest_1.it)("should return empty array for findAllCycles in a DAG", () => {
        // A -> B -> C
        const graph = createMockGraph(services, [
            ["A", "B"],
            ["B", "C"],
        ]);
        const cycles = (0, cycle_detector_1.findAllCycles)(graph);
        (0, vitest_1.expect)(cycles).toEqual([]);
    });
});
(0, vitest_1.describe)("Blast Radius Calculations", () => {
    const services = [
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
    (0, vitest_1.it)("should return zero blast radius when a leaf dependent service (no dependents) fails", () => {
        // Service A has no other services depending on it.
        const result = (0, blast_radius_1.computeBlastRadius)(graph, ["A"]);
        (0, vitest_1.expect)(result.blastRadius).toBe(0);
        (0, vitest_1.expect)(result.maxDepth).toBe(0);
        (0, vitest_1.expect)(result.totalRiskScore).toBe(0);
        (0, vitest_1.expect)(result.severity).toBe("LOW");
        (0, vitest_1.expect)(result.failedServices).toEqual([{ id: "A", name: "Service A" }]);
        (0, vitest_1.expect)(result.impacted.length).toBe(1); // just the failed service itself at depth 0
        (0, vitest_1.expect)(result.impacted[0].serviceId).toBe("A");
        (0, vitest_1.expect)(result.impacted[0].depth).toBe(0);
    });
    (0, vitest_1.it)("should propagate failure and calculate correct depths/paths when a central service fails", () => {
        // If D fails, it should impact B (depth 1) and A (depth 2)
        // E and C are not impacted since nothing depends on them that is failing
        const result = (0, blast_radius_1.computeBlastRadius)(graph, ["D"]);
        (0, vitest_1.expect)(result.failedServices).toEqual([{ id: "D", name: "Service D" }]);
        (0, vitest_1.expect)(result.blastRadius).toBe(2); // B and A
        // Impact list should contain D (failed, depth 0), B (impacted, depth 1), A (impacted, depth 2)
        (0, vitest_1.expect)(result.impacted.map((i) => i.serviceId)).toEqual(["D", "B", "A"]);
        const nodeB = result.impacted.find((i) => i.serviceId === "B");
        (0, vitest_1.expect)(nodeB.depth).toBe(1);
        (0, vitest_1.expect)(nodeB.path).toEqual(["Service D", "Service B"]);
        // B is CRITICAL, so depth 1 failure escalates it to FAILED
        (0, vitest_1.expect)(nodeB.status).toBe("FAILED");
        const nodeA = result.impacted.find((i) => i.serviceId === "A");
        (0, vitest_1.expect)(nodeA.depth).toBe(2);
        (0, vitest_1.expect)(nodeA.path).toEqual(["Service D", "Service B", "Service A"]);
        (0, vitest_1.expect)(nodeA.status).toBe("AT_RISK");
    });
    (0, vitest_1.it)("should calculate correct risk scores and severity categories", () => {
        // Failure of B:
        // Impacts: A (depends on B, depth 1)
        // A has criticality: MEDIUM (weight 2).
        // B is the failure (depth 0, contribution 0)
        // A is depth 1. Contribution = 2 * (6 - 1) * 5 = 50.
        // Total risk = 50.
        // Score of 50 corresponds to MEDIUM severity (40 <= score < 100).
        const result = (0, blast_radius_1.computeBlastRadius)(graph, ["B"]);
        (0, vitest_1.expect)(result.blastRadius).toBe(1);
        (0, vitest_1.expect)(result.totalRiskScore).toBe(50);
        (0, vitest_1.expect)(result.severity).toBe("MEDIUM");
    });
    (0, vitest_1.it)("should handle multiple failed services and prevent duplicate calculations", () => {
        // Fail both B and E:
        // Failed: B, E
        // B propagates to A (depth 1)
        // E propagates to D (depth 1) -> B (already failed/processed, should not be reprocessed)
        const result = (0, blast_radius_1.computeBlastRadius)(graph, ["B", "E"]);
        (0, vitest_1.expect)(result.failedServices).toEqual([
            { id: "B", name: "Service B" },
            { id: "E", name: "Service E" },
        ]);
        // D is impacted by E (depth 1)
        // A is impacted by B (depth 1)
        (0, vitest_1.expect)(result.blastRadius).toBe(2); // A and D
        const ids = result.impacted.map((i) => i.serviceId);
        (0, vitest_1.expect)(ids).toContain("A");
        (0, vitest_1.expect)(ids).toContain("D");
    });
});
//# sourceMappingURL=graph.test.js.map