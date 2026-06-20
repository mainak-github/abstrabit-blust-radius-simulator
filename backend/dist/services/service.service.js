"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
exports.ServiceService = {
    async create(input) {
        return prisma_1.default.service.create({
            data: {
                name: input.name.trim(),
                owner: input.owner.trim(),
                criticality: input.criticality ?? "MEDIUM",
                status: input.status ?? "HEALTHY",
                description: input.description,
            },
        });
    },
    async list(query = {}) {
        const where = {};
        if (query.search) {
            where.OR = [
                { name: { contains: query.search } },
                { owner: { contains: query.search } },
                { description: { contains: query.search } },
            ];
        }
        if (query.status)
            where.status = query.status;
        if (query.criticality)
            where.criticality = query.criticality;
        if (query.owner)
            where.owner = query.owner;
        return prisma_1.default.service.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                _count: { select: { dependsOn: true, dependedOnBy: true } },
            },
        });
    },
    async getById(id) {
        return prisma_1.default.service.findUnique({
            where: { id },
            include: {
                dependsOn: { include: { dependsOn: true } },
                dependedOnBy: { include: { service: true } },
            },
        });
    },
    async update(id, input) {
        return prisma_1.default.service.update({
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
    async remove(id) {
        return prisma_1.default.service.delete({ where: { id } });
    },
};
//# sourceMappingURL=service.service.js.map