"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_controller_1 = require("../controllers/service.controller");
const dependency_controller_1 = require("../controllers/dependency.controller");
const simulation_controller_1 = require("../controllers/simulation.controller");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const router = (0, express_1.Router)();
// Services
router.post("/services", service_controller_1.ServiceController.create);
router.get("/services", service_controller_1.ServiceController.list);
router.get("/services/:id", service_controller_1.ServiceController.getOne);
router.patch("/services/:id", service_controller_1.ServiceController.update);
router.delete("/services/:id", service_controller_1.ServiceController.remove);
// Dependencies
router.get("/dependencies", dependency_controller_1.DependencyController.list);
router.post("/dependencies", dependency_controller_1.DependencyController.create);
router.delete("/dependencies/:id", dependency_controller_1.DependencyController.remove);
router.get("/dependencies/cycles", dependency_controller_1.DependencyController.cycles);
// Simulations
router.post("/simulations", simulation_controller_1.SimulationController.run);
router.get("/simulations", simulation_controller_1.SimulationController.list);
router.get("/simulations/:id", simulation_controller_1.SimulationController.getOne);
// Dashboard
router.get("/dashboard", dashboard_controller_1.DashboardController.overview);
router.get("/dashboard/health", dashboard_controller_1.DashboardController.health);
router.get("/dashboard/graph", dashboard_controller_1.DashboardController.graph);
exports.default = router;
//# sourceMappingURL=index.js.map