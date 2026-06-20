import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboard.service";

export const DashboardController = {
  async overview(req: Request, res: Response, next: NextFunction) {
    try {
      const [health, topDeps, recentSims, resilience] = await Promise.all([
        DashboardService.getHealth(),
        DashboardService.getTopDependencies(),
        DashboardService.getRecentSimulations(),
        DashboardService.getResilience(),
      ]);
      res.json({
        health,
        topDependencies: topDeps,
        recentSimulations: recentSims,
        resilience,
      });
    } catch (err) {
      next(err);
    }
  },

  async health(req: Request, res: Response, next: NextFunction) {
    try {
      const health = await DashboardService.getHealth();
      res.json(health);
    } catch (err) {
      next(err);
    }
  },

  async graph(req: Request, res: Response, next: NextFunction) {
    try {
      const graph = await DashboardService.getGraph();
      res.json(graph);
    } catch (err) {
      next(err);
    }
  },
};