import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error & { status?: number; cyclePath?: string[]; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = err.status ?? 500;
  const payload: Record<string, unknown> = {
    error: err.message || "Internal server error",
  };
  if (err.cyclePath) payload.cyclePath = err.cyclePath;
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
