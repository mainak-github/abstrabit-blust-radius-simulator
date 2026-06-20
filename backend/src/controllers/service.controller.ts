import { Request, Response, NextFunction } from "express";
import { ServiceService } from "../services/service.service";

export const ServiceController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await ServiceService.create(req.body);
      res.status(201).json(service);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const services = await ServiceService.list({
        search: req.query.search as string | undefined,
        status: req.query.status as any,
        criticality: req.query.criticality as any,
        owner: req.query.owner as string | undefined,
      });
      res.json(services);
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await ServiceService.getById(String(req.params.id));
      if (!service) {
        res.status(404).json({ error: "Service not found" });
        return;
      }
      res.json(service);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await ServiceService.update(String(req.params.id), req.body);
      res.json(service);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await ServiceService.remove(String(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};