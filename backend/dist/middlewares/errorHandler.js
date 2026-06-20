"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, req, res, _next) {
    const status = err.status ?? 500;
    const payload = {
        error: err.message || "Internal server error",
    };
    if (err.cyclePath)
        payload.cyclePath = err.cyclePath;
    if (err.code === "P2002") {
        payload.error = "A resource with these unique fields already exists";
        res.status(409).json(payload);
        return;
    }
    if (err.code === "P2025") {
        payload.error = "Resource not found";
        res.status(404).json(payload);
        return;
    }
    if (status >= 500) {
        // eslint-disable-next-line no-console
        console.error("[error]", err);
    }
    res.status(status).json(payload);
}
//# sourceMappingURL=errorHandler.js.map