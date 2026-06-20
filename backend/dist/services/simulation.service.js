"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const graph_builder_1 = require("../graph/graph.builder");
const blast_radius_1 = require("../graph/blast.radius");
exports.SimulationService = {
    /**
     * Run a simulation. We do this in three steps:
     * 1) Build the graph once.
     * 2) Compute the blast radius (pure function).
     * 3) Persist the result and broadcast it.
     *
     * WebSocket events are emitted as we discover impacted services so the
     * UI can animate the cascade. For larger graphs this is significantly
     * better UX than a single response.
     */
    async run(input, io) {
        const graph = await (0, graph_builder_1.buildAdjacencyList)();
        // Resolve names to IDs and validate existence.
        const failedIds = [];
        for (const idOrName of input.failedServiceIds) {
            const node = graph.nodes.get(idOrName) ??
                Array.from(graph.nodes.values()).find((n) => n.name === idOrName);
            if (node)
                failedIds.push(node.id);
        }
        if (failedIds.length === 0) {
            const error = new Error("At least one valid failed service is required");
            error.status = 400;
            throw error;
        }
        // Emit a start event so the UI can clear prior state and prep.
        const simulationId = crypto.randomUUID();
        if (io) {
            io.emit("simulation:start", {
                simulationId,
                failedServices: failedIds
                    .map((id) => graph.nodes.get(id))
                    .filter(Boolean)
                    .map((n) => ({ id: n.id, name: n.name })),
            });
        }
        // We simulate the propagation layer-by-layer for the WebSocket feed.
        // The actual blast radius calculation is a single BFS that produces
        // the same result; we layer it just for animation.
        const result = (0, blast_radius_1.computeBlastRadius)(graph, failedIds);
        // Stream each depth layer so the UI can animate the cascade.
        if (io) {
            const byDepth = new Map();
            for (const node of result.impacted) {
                const arr = byDepth.get(node.depth) ?? [];
                arr.push(node);
                byDepth.set(node.depth, arr);
            }
            const depths = Array.from(byDepth.keys()).sort((a, b) => a - b);
            for (const depth of depths) {
                for (const node of byDepth.get(depth)) {
                    io.emit("simulation:update", {
                        simulationId,
                        depth,
                        service: {
                            id: node.serviceId,
                            name: node.serviceName,
                            criticality: node.criticality,
                            status: node.status,
                            path: node.path,
                        },
                    });
                    // Tiny delay so the cascade is visible. We yield to the event
                    // loop so we don't block; 30ms per depth is enough for users
                    // to perceive the propagation without slowing the request.
                    await new Promise((r) => setTimeout(r, 30));
                }
            }
        }
        // Persist simulation + impacted services + failures.
        const simulation = await prisma_1.default.simulation.create({
            data: {
                id: simulationId,
                name: input.name,
                severity: result.severity,
                blastRadius: result.blastRadius,
                affectedCount: result.blastRadius,
                maxDepth: result.maxDepth,
                totalRiskScore: result.totalRiskScore,
                status: "COMPLETED",
                failedServices: {
                    create: result.failedServices.map((s) => ({
                        serviceId: s.id,
                        serviceName: s.name,
                    })),
                },
                impactedServices: {
                    create: result.impacted.map((i) => ({
                        serviceId: i.serviceId,
                        serviceName: i.serviceName,
                        depth: i.depth,
                        path: JSON.stringify(i.path),
                        status: i.status,
                    })),
                },
            },
            include: {
                failedServices: true,
                impactedServices: true,
            },
        });
        if (io) {
            io.emit("simulation:end", {
                simulationId,
                severity: result.severity,
                blastRadius: result.blastRadius,
                totalRiskScore: result.totalRiskScore,
            });
        }
        return { ...result, simulation };
    },
    async listSimulations(limit = 50) {
        return prisma_1.default.simulation.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                failedServices: true,
                impactedServices: true,
            },
        });
    },
    async getSimulation(id) {
        return prisma_1.default.simulation.findUnique({
            where: { id },
            include: {
                failedServices: true,
                impactedServices: { orderBy: { depth: "asc" } },
            },
        });
    },
};
//# sourceMappingURL=simulation.service.js.map