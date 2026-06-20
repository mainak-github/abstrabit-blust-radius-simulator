"use client";
import { useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useSimulationStore, LiveImpact } from "@/store/simulationStore";
import { useNotificationStore } from "@/store/notificationStore";
import { sounds } from "@/lib/sounds";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}

export function useSimulationSocket() {
  const { startSimulation, receiveImpact, endSimulation } = useSimulationStore();
  const { addToast } = useNotificationStore();

  useEffect(() => {
    const s = getSocket();

    function onStart(payload: { simulationId: string; failedServices: { id: string; name: string }[] }) {
      startSimulation(payload.simulationId, payload.failedServices);
      const names = payload.failedServices.map((f) => f.name).join(", ");
      addToast(`Simulation started: Outage triggered on [${names}]`, "warning");
      sounds.playStart();
    }
    function onUpdate(payload: { simulationId: string; depth: number; service: any }) {
      const impact: LiveImpact = {
        simulationId: payload.simulationId,
        serviceId: payload.service.id,
        serviceName: payload.service.name,
        depth: payload.depth,
        status: payload.service.status,
        path: payload.service.path,
        criticality: payload.service.criticality,
      };
      receiveImpact(impact);
      sounds.playUpdate();
    }
    function onEnd(payload: { simulationId: string; severity: any; blastRadius: number; totalRiskScore: number }) {
      endSimulation({
        severity: payload.severity,
        blastRadius: payload.blastRadius,
        totalRiskScore: payload.totalRiskScore,
      });
      const severityType = payload.severity === "CRITICAL" || payload.severity === "HIGH" ? "error" : "success";
      addToast(
        `Simulation finished: Severity [${payload.severity}] with blast radius of ${payload.blastRadius} services`,
        severityType
      );
      if (payload.severity === "CRITICAL" || payload.severity === "HIGH") {
        sounds.playFailure();
      } else {
        sounds.playSuccess();
      }
    }

    s.on("simulation:start", onStart);
    s.on("simulation:update", onUpdate);
    s.on("simulation:end", onEnd);

    return () => {
      s.off("simulation:start", onStart);
      s.off("simulation:update", onUpdate);
      s.off("simulation:end", onEnd);
    };
  }, [startSimulation, receiveImpact, endSimulation, addToast]);
}
