import { Request, Response, NextFunction } from "express";
import { SimulationService } from "../services/simulation.service";
import { getIO } from "../socket/io";

export const SimulationController = {
  async run(req: Request, res: Response, next: NextFunction) {
    try {
      const { failedServiceIds, name } = req.body;
      if (!Array.isArray(failedServiceIds) || failedServiceIds.length === 0) {
        res.status(400).json({ error: "failedServiceIds must be a non-empty array" });
        return;
      }
      const result = await SimulationService.run({ failedServiceIds, name }, getIO());
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const sims = await SimulationService.listSimulations(limit);
      res.json(sims);
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const sim = await SimulationService.getSimulation(String(req.params.id));
      if (!sim) {
        res.status(404).json({ error: "Simulation not found" });
        return;
      }
      res.json(sim);
    } catch (err) {
      next(err);
    }
  },
};