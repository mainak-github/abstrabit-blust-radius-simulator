"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceController = void 0;
const service_service_1 = require("../services/service.service");
exports.ServiceController = {
    async create(req, res, next) {
        try {
            const service = await service_service_1.ServiceService.create(req.body);
            res.status(201).json(service);
        }
        catch (err) {
            next(err);
        }
    },
    async list(req, res, next) {
        try {
            const services = await service_service_1.ServiceService.list({
                search: req.query.search,
                status: req.query.status,
                criticality: req.query.criticality,
                owner: req.query.owner,
            });
            res.json(services);
        }
        catch (err) {
            next(err);
        }
    },
    async getOne(req, res, next) {
        try {
            const service = await service_service_1.ServiceService.getById(String(req.params.id));
            if (!service) {
                res.status(404).json({ error: "Service not found" });
                return;
            }
            res.json(service);
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const service = await service_service_1.ServiceService.update(String(req.params.id), req.body);
            res.json(service);
        }
        catch (err) {
            next(err);
        }
    },
    async remove(req, res, next) {
        try {
            await service_service_1.ServiceService.remove(String(req.params.id));
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=service.controller.js.map