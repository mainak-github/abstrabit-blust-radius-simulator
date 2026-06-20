import { Router } from "express";
import { ServiceController } from "../controllers/service.controller";
import { DependencyController } from "../controllers/dependency.controller";
import { SimulationController } from "../controllers/simulation.controller";
import { DashboardController } from "../controllers/dashboard.controller";

const router = Router();

// Services
router.post("/services", ServiceController.create);
router.get("/services", ServiceController.list);
router.get("/services/:id", ServiceController.getOne);
router.patch("/services/:id", ServiceController.update);
router.delete("/services/:id", ServiceController.remove);

// Dependencies
router.get("/dependencies", DependencyController.list);
router.post("/dependencies", DependencyController.create);
router.delete("/dependencies/:id", DependencyController.remove);
router.get("/dependencies/cycles", DependencyController.cycles);

// Simulations
router.post("/simulations", SimulationController.run);
router.get("/simulations", SimulationController.list);
router.get("/simulations/:id", SimulationController.getOne);

// Dashboard
router.get("/dashboard", DashboardController.overview);
router.get("/dashboard/health", DashboardController.health);
router.get("/dashboard/graph", DashboardController.graph);

export default router;
