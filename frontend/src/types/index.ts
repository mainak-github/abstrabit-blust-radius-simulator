export type Criticality = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ServiceStatus = "HEALTHY" | "DEGRADED" | "FAILED";
export type ImpactStatus = "FAILED" | "DEGRADED" | "AT_RISK";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Service {
  id: string;
  name: string;
  owner: string;
  criticality: Criticality;
  status: ServiceStatus;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { dependsOn: number; dependedOnBy: number };
}

export interface Dependency {
  id: string;
  serviceId: string;
  dependsOnServiceId: string;
  service?: { id: string; name: string };
  dependsOn?: { id: string; name: string };
  createdAt?: string;
}

export interface ImpactedNode {
  serviceId: string;
  serviceName: string;
  depth: number;
  path: string[];
  criticality: Criticality;
  status: ImpactStatus;
  contribution: number;
}

export interface SimulationResult {
  failedServices: { id: string; name: string }[];
  impacted: ImpactedNode[];
  blastRadius: number;
  maxDepth: number;
  totalRiskScore: number;
  severity: Severity;
  simulation: {
    id: string;
    name: string | null;
    severity: Severity;
    blastRadius: number;
    affectedCount: number;
    maxDepth: number;
    totalRiskScore: number;
    createdAt: string;
    failedServices: { id: string; serviceId: string; serviceName: string }[];
    impactedServices: {
      id: string;
      serviceId: string;
      serviceName: string;
      depth: number;
      path: string;
      status: ImpactStatus;
    }[];
  };
}

export interface Simulation {
  id: string;
  name: string | null;
  severity: Severity;
  blastRadius: number;
  affectedCount: number;
  maxDepth: number;
  totalRiskScore: number;
  createdAt: string;
  failedServices: { id: string; serviceId: string; serviceName: string }[];
  impactedServices: {
    id: string;
    serviceId: string;
    serviceName: string;
    depth: number;
    path: string;
    status: ImpactStatus;
  }[];
}

export interface DashboardOverview {
  health: {
    services: { total: number; healthy: number; degraded: number; failed: number };
    criticality: { low: number; medium: number; high: number; critical: number };
  };
  topDependencies: {
    id: string;
    name: string;
    criticality: Criticality;
    dependents: number;
  }[];
  recentSimulations: Simulation[];
  resilience: { score: number; avgBlastRadius: number; avgDepth: number };
}

export interface GraphData {
  nodes: Service[];
  edges: { id: string; source: string; target: string }[];
}
