import { Request, Response, NextFunction } from "express";
import { DependencyService } from "../services/dependency.service";

export const DependencyController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const deps = await DependencyService.list();
      res.json(deps);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { serviceId, dependsOnServiceId } = req.body;
      const dep = await DependencyService.create(serviceId, dependsOnServiceId);
      res.status(201).json(dep);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await DependencyService.remove(String(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async cycles(req: Request, res: Response, next: NextFunction) {
    try {
      const cycles = await DependencyService.detectCycles();
      res.json({ cycles });
    } catch (err) {
      next(err);
    }
  },
};