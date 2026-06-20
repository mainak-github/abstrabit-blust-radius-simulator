"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationController = void 0;
const simulation_service_1 = require("../services/simulation.service");
const io_1 = require("../socket/io");
exports.SimulationController = {
    async run(req, res, next) {
        try {
            const { failedServiceIds, name } = req.body;
            if (!Array.isArray(failedServiceIds) || failedServiceIds.length === 0) {
                res.status(400).json({ error: "failedServiceIds must be a non-empty array" });
                return;
            }
            const result = await simulation_service_1.SimulationService.run({ failedServiceIds, name }, (0, io_1.getIO)());
            res.status(201).json(result);
        }
        catch (err) {
            next(err);
        }
    },
    async list(req, res, next) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const sims = await simulation_service_1.SimulationService.listSimulations(limit);
            res.json(sims);
        }
        catch (err) {
            next(err);
        }
    },
    async getOne(req, res, next) {
        try {
            const sim = await simulation_service_1.SimulationService.getSimulation(String(req.params.id));
            if (!sim) {
                res.status(404).json({ error: "Simulation not found" });
                return;
            }
            res.json(sim);
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=simulation.controller.js.map