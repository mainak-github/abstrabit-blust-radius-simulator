import { create } from "zustand";
import type { ImpactedNode, ImpactStatus, Severity } from "@/types";

export interface LiveImpact {
  simulationId: string;
  serviceId: string;
  serviceName: string;
  depth: number;
  status: ImpactStatus;
  path: string[];
  criticality: string;
}

interface SimulationState {
  isRunning: boolean;
  currentSimulationId: string | null;
  failedServices: { id: string; name: string }[];
  liveImpacts: Map<string, LiveImpact>;
  finalResult: {
    severity: Severity;
    blastRadius: number;
    totalRiskScore: number;
  } | null;

  startSimulation: (simulationId: string, failed: { id: string; name: string }[]) => void;
  receiveImpact: (impact: LiveImpact) => void;
  endSimulation: (result: { severity: Severity; blastRadius: number; totalRiskScore: number }) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  isRunning: false,
  currentSimulationId: null,
  failedServices: [],
  liveImpacts: new Map(),
  finalResult: null,

  startSimulation: (simulationId, failed) =>
    set({
      isRunning: true,
      currentSimulationId: simulationId,
      failedServices: failed,
      liveImpacts: new Map(),
      finalResult: null,
    }),

  receiveImpact: (impact) =>
    set((state) => {
      const next = new Map(state.liveImpacts);
      next.set(impact.serviceId, impact);
      return { liveImpacts: next };
    }),

  endSimulation: (result) =>
    set({
      isRunning: false,
      finalResult: result,
    }),

  reset: () =>
    set({
      isRunning: false,
      currentSimulationId: null,
      failedServices: [],
      liveImpacts: new Map(),
      finalResult: null,
    }),
}));
