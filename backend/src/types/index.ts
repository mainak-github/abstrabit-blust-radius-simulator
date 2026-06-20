export type Criticality = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ServiceStatus = "HEALTHY" | "DEGRADED" | "FAILED";
export type ImpactStatus = "FAILED" | "DEGRADED" | "AT_RISK";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ServiceNode {
  id: string;
  name: string;
  owner: string;
  criticality: Criticality;
  status: ServiceStatus;
  description?: string | null;
}

export interface ServiceEdge {
  source: string; // serviceId that has the dependency
  target: string; // serviceId being depended on
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

export interface BlastRadiusResult {
  failedServices: { id: string; name: string }[];
  impacted: ImpactedNode[];
  blastRadius: number;
  maxDepth: number;
  totalRiskScore: number;
  severity: Severity;
}

export interface AdjacencyList {
  // serviceId -> list of serviceIds it depends on
  downstream: Map<string, string[]>;
  // serviceId -> list of serviceIds that depend on it
  upstream: Map<string, string[]>;
  // serviceId -> service node
  nodes: Map<string, ServiceNode>;
}
