import prisma from "../config/prisma";
import { Criticality, ServiceStatus } from "../types";

export interface CreateServiceInput {
  name: string;
  owner: string;
  criticality?: Criticality;
  status?: ServiceStatus;
  description?: string;
}

export interface UpdateServiceInput {
  name?: string;
  owner?: string;
  criticality?: Criticality;
  status?: ServiceStatus;
  description?: string;
}

export const ServiceService = {
  async create(input: CreateServiceInput) {
    return prisma.service.create({
      data: {
        name: input.name.trim(),
        owner: input.owner.trim(),
        criticality: input.criticality ?? "MEDIUM",
        status: input.status ?? "HEALTHY",
        description: input.description,
      },
    });
  },

  async list(query: {
    search?: string;
    status?: ServiceStatus;
    criticality?: Criticality;
    owner?: string;
  } = {}) {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { owner: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }
    if (query.status) where.status = query.status;
    if (query.criticality) where.criticality = query.criticality;
    if (query.owner) where.owner = query.owner;

    return prisma.service.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { dependsOn: true, dependedOnBy: true } },
      },
    });
  },

  async getById(id: string) {
    return prisma.service.findUnique({
      where: { id },
      include: {
        dependsOn: { include: { dependsOn: true } },
        dependedOnBy: { include: { service: true } },
      },
    });
  },

  async update(id: string, input: UpdateServiceInput) {
    return prisma.service.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.owner !== undefined && { owner: input.owner.trim() }),
        ...(input.criticality !== undefined && { criticality: input.criticality }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });
  },

  async remove(id: string) {
    return prisma.service.delete({ where: { id } });
  },
};
