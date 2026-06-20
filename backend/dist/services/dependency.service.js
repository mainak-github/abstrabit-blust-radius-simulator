"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const graph_builder_1 = require("../graph/graph.builder");
const cycle_detector_1 = require("../graph/cycle.detector");
exports.DependencyService = {
    async list() {
        return prisma_1.default.dependency.findMany({
            include: {
                service: { select: { id: true, name: true } },
                dependsOn: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    },
    async create(serviceId, dependsOnServiceId) {
        if (serviceId === dependsOnServiceId) {
            const error = new Error("A service cannot depend on itself");
            error.status = 400;
            throw error;
        }
        const graph = await (0, graph_builder_1.buildAdjacencyList)();
        if (!graph.nodes.has(serviceId) || !graph.nodes.has(dependsOnServiceId)) {
            const error = new Error("Service not found");
            error.status = 404;
            throw error;
        }
        const existing = graph.downstream.get(serviceId) ?? [];
        if (existing.includes(dependsOnServiceId)) {
            const error = new Error("Dependency already exists");
            error.status = 409;
            throw error;
        }
        const cycleCheck = (0, cycle_detector_1.wouldCreateCycle)(graph, serviceId, dependsOnServiceId);
        if (cycleCheck.createsCycle) {
            const error = new Error(`Circular dependency detected: ${(cycleCheck.cyclePath ?? [])
                .map((id) => graph.nodes.get(id)?.name ?? id)
                .join(" -> ")}`);
            error.status = 400;
            error.cyclePath = cycleCheck.cyclePath;
            throw error;
        }
        return prisma_1.default.dependency.create({
            data: { serviceId, dependsOnServiceId },
            include: {
                service: { select: { id: true, name: true } },
                dependsOn: { select: { id: true, name: true } },
            },
        });
    },
    async remove(id) {
        return prisma_1.default.dependency.delete({ where: { id } });
    },
    async detectCycles() {
        const graph = await (0, graph_builder_1.buildAdjacencyList)();
        const cycles = (0, cycle_detector_1.findAllCycles)(graph);
        return cycles.map((cycle) => cycle.map((id) => ({ id, name: graph.nodes.get(id)?.name ?? id })));
    },
};
//# sourceMappingURL=dependency.service.js.map