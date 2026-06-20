import prisma from "../config/prisma";
import { buildAdjacencyList } from "../graph/graph.builder";
import { findAllCycles, wouldCreateCycle } from "../graph/cycle.detector";

export const DependencyService = {
  async list() {
    return prisma.dependency.findMany({
      include: {
        service: { select: { id: true, name: true } },
        dependsOn: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(serviceId: string, dependsOnServiceId: string) {
    if (serviceId === dependsOnServiceId) {
      const error = new Error("A service cannot depend on itself") as Error & { status?: number };
      error.status = 400;
      throw error;
    }

    const graph = await buildAdjacencyList();

    if (!graph.nodes.has(serviceId) || !graph.nodes.has(dependsOnServiceId)) {
      const error = new Error("Service not found") as Error & { status?: number };
      error.status = 404;
      throw error;
    }

    const existing = graph.downstream.get(serviceId) ?? [];
    if (existing.includes(dependsOnServiceId)) {
      const error = new Error("Dependency already exists") as Error & { status?: number };
      error.status = 409;
      throw error;
    }

    const cycleCheck = wouldCreateCycle(graph, serviceId, dependsOnServiceId);
    if (cycleCheck.createsCycle) {
      const error = new Error(
        `Circular dependency detected: ${(cycleCheck.cyclePath ?? [])
          .map((id) => graph.nodes.get(id)?.name ?? id)
          .join(" -> ")}`,
      ) as Error & { status?: number; cyclePath?: string[] };
      error.status = 400;
      error.cyclePath = cycleCheck.cyclePath;
      throw error;
    }

    return prisma.dependency.create({
      data: { serviceId, dependsOnServiceId },
      include: {
        service: { select: { id: true, name: true } },
        dependsOn: { select: { id: true, name: true } },
      },
    });
  },

  async remove(id: string) {
    return prisma.dependency.delete({ where: { id } });
  },

  async detectCycles() {
    const graph = await buildAdjacencyList();
    const cycles = findAllCycles(graph);
    return cycles.map((cycle) =>
      cycle.map((id) => ({ id, name: graph.nodes.get(id)?.name ?? id })),
    );
  },
};