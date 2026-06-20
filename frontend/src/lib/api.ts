import type {
  Service,
  Dependency,
  Simulation,
  SimulationResult,
  DashboardOverview,
  GraphData,
  Criticality,
  ServiceStatus,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = `Request failed: ${res.status}`;
    try {
      const body = JSON.parse(text);
      message = body.error || message;
    } catch {
      // fall through
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Services
  listServices(params?: { search?: string; status?: ServiceStatus; criticality?: Criticality; owner?: string }) {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    if (params?.criticality) qs.set("criticality", params.criticality);
    if (params?.owner) qs.set("owner", params.owner);
    return request<Service[]>(`/api/services?${qs.toString()}`);
  },
  getService(id: string) {
    return request<Service & { dependsOn: any[]; dependedOnBy: any[] }>(`/api/services/${id}`);
  },
  createService(input: { name: string; owner: string; criticality?: Criticality; status?: ServiceStatus; description?: string }) {
    return request<Service>("/api/services", { method: "POST", body: JSON.stringify(input) });
  },
  updateService(id: string, input: Partial<Service>) {
    return request<Service>(`/api/services/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  deleteService(id: string) {
    return request<void>(`/api/services/${id}`, { method: "DELETE" });
  },

  // Dependencies
  listDependencies() {
    return request<Dependency[]>("/api/dependencies");
  },
  createDependency(serviceId: string, dependsOnServiceId: string) {
    return request<Dependency>("/api/dependencies", {
      method: "POST",
      body: JSON.stringify({ serviceId, dependsOnServiceId }),
    });
  },
  deleteDependency(id: string) {
    return request<void>(`/api/dependencies/${id}`, { method: "DELETE" });
  },
  detectCycles() {
    return request<{ cycles: { id: string; name: string }[][] }>("/api/dependencies/cycles");
  },

  // Simulations
  runSimulation(failedServiceIds: string[], name?: string) {
    return request<SimulationResult>("/api/simulations", {
      method: "POST",
      body: JSON.stringify({ failedServiceIds, name }),
    });
  },
  listSimulations(limit = 50) {
    return request<Simulation[]>(`/api/simulations?limit=${limit}`);
  },
  getSimulation(id: string) {
    return request<Simulation>(`/api/simulations/${id}`);
  },

  // Dashboard
  getDashboard() {
    return request<DashboardOverview>("/api/dashboard");
  },
  getGraph() {
    return request<GraphData>("/api/dashboard/graph");
  },
};

export { API_URL };
