"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
exports.DashboardController = {
    async overview(req, res, next) {
        try {
            const [health, topDeps, recentSims, resilience] = await Promise.all([
                dashboard_service_1.DashboardService.getHealth(),
                dashboard_service_1.DashboardService.getTopDependencies(),
                dashboard_service_1.DashboardService.getRecentSimulations(),
                dashboard_service_1.DashboardService.getResilience(),
            ]);
            res.json({
                health,
                topDependencies: topDeps,
                recentSimulations: recentSims,
                resilience,
            });
        }
        catch (err) {
            next(err);
        }
    },
    async health(req, res, next) {
        try {
            const health = await dashboard_service_1.DashboardService.getHealth();
            res.json(health);
        }
        catch (err) {
            next(err);
        }
    },
    async graph(req, res, next) {
        try {
            const graph = await dashboard_service_1.DashboardService.getGraph();
            res.json(graph);
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=dashboard.controller.js.map