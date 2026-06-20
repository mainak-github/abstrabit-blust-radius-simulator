"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const graph_builder_1 = require("../graph/graph.builder");
exports.DashboardService = {
    async getHealth() {
        const [healthy, degraded, failed, total] = await Promise.all([
            prisma_1.default.service.count({ where: { status: "HEALTHY" } }),
            prisma_1.default.service.count({ where: { status: "DEGRADED" } }),
            prisma_1.default.service.count({ where: { status: "FAILED" } }),
            prisma_1.default.service.count(),
        ]);
        const [low, medium, high, critical] = await Promise.all([
            prisma_1.default.service.count({ where: { criticality: "LOW" } }),
            prisma_1.default.service.count({ where: { criticality: "MEDIUM" } }),
            prisma_1.default.service.count({ where: { criticality: "HIGH" } }),
            prisma_1.default.service.count({ where: { criticality: "CRITICAL" } }),
        ]);
        return {
            services: { total, healthy, degraded, failed },
            criticality: { low, medium, high, critical },
        };
    },
    async getTopDependencies(limit = 10) {
        // Services that other services depend on the most. High upstream
        // count = high blast radius potential.
        const services = await prisma_1.default.service.findMany({
            include: { _count: { select: { dependedOnBy: true } } },
        });
        return services
            .map((s) => ({
            id: s.id,
            name: s.name,
            criticality: s.criticality,
            dependents: s._count.dependedOnBy,
        }))
            .sort((a, b) => b.dependents - a.dependents)
            .slice(0, limit);
    },
    async getRecentSimulations(limit = 5) {
        return prisma_1.default.simulation.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            include: { failedServices: true },
        });
    },
    /**
     * Returns the full graph for the frontend visualizer.
     * Includes service nodes and dependency edges.
     */
    async getGraph() {
        const [services, dependencies] = await Promise.all([
            prisma_1.default.service.findMany(),
            prisma_1.default.dependency.findMany(),
        ]);
        return {
            nodes: services.map((s) => ({
                id: s.id,
                name: s.name,
                owner: s.owner,
                criticality: s.criticality,
                status: s.status,
                description: s.description,
            })),
            edges: dependencies.map((d) => ({
                id: d.id,
                source: d.serviceId,
                target: d.dependsOnServiceId,
            })),
        };
    },
    async getResilience() {
        // A simple resilience score: 100 - normalized risk.
        // We compute the average blast radius across recent simulations
        // to get a sense of "how bad does it get when things fail".
        const graph = await (0, graph_builder_1.buildAdjacencyList)();
        const services = Array.from(graph.nodes.values());
        if (services.length === 0) {
            return { score: 100, avgBlastRadius: 0, avgDepth: 0 };
        }
        const recent = await prisma_1.default.simulation.findMany({
            orderBy: { createdAt: "desc" },
            take: 10,
        });
        if (recent.length === 0) {
            return { score: 100, avgBlastRadius: 0, avgDepth: 0 };
        }
        const avgBlast = recent.reduce((acc, s) => acc + s.blastRadius, 0) / recent.length;
        const avgDepth = recent.reduce((acc, s) => acc + s.maxDepth, 0) / recent.length;
        // Normalize: a blast radius of 50% of total services = 0 resilience.
        const norm = Math.min(1, avgBlast / (services.length * 0.5));
        const score = Math.max(0, Math.round((1 - norm) * 100));
        return { score, avgBlastRadius: Math.round(avgBlast), avgDepth: Math.round(avgDepth) };
    },
};
//# sourceMappingURL=dashboard.service.js.map