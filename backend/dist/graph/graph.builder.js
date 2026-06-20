"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdjacencyList = buildAdjacencyList;
const prisma_1 = __importDefault(require("../config/prisma"));
/**
 * Build an in-memory adjacency list from the database.
 * Used by all graph algorithms to keep traversals O(V+E).
 *
 * Edge semantics: if A "depends on" B, then B is a dependency of A.
 * - downstream[A] = services A depends on (B)
 * - upstream[B]   = services that depend on B (A)
 */
async function buildAdjacencyList() {
    const [services, dependencies] = await Promise.all([
        prisma_1.default.service.findMany(),
        prisma_1.default.dependency.findMany(),
    ]);
    const nodes = new Map();
    const downstream = new Map();
    const upstream = new Map();
    for (const s of services) {
        nodes.set(s.id, {
            id: s.id,
            name: s.name,
            owner: s.owner,
            criticality: s.criticality,
            status: s.status,
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
//# sourceMappingURL=graph.builder.js.map