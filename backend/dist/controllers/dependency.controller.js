"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyController = void 0;
const dependency_service_1 = require("../services/dependency.service");
exports.DependencyController = {
    async list(req, res, next) {
        try {
            const deps = await dependency_service_1.DependencyService.list();
            res.json(deps);
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const { serviceId, dependsOnServiceId } = req.body;
            const dep = await dependency_service_1.DependencyService.create(serviceId, dependsOnServiceId);
            res.status(201).json(dep);
        }
        catch (err) {
            next(err);
        }
    },
    async remove(req, res, next) {
        try {
            await dependency_service_1.DependencyService.remove(String(req.params.id));
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    },
    async cycles(req, res, next) {
        try {
            const cycles = await dependency_service_1.DependencyService.detectCycles();
            res.json({ cycles });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=dependency.controller.js.map