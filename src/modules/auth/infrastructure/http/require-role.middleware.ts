import type { NextFunction, Request, Response } from "express";

import { ForbiddenError, UnauthorizedError } from "../../../shared/domain/errors.js";


// se usa SIEMPRE despues de authMiddleware: sin req.user no hay rol que revisar
export function requireRole(...roles: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new UnauthorizedError("No autenticado"));
            return;
        }

        if (!roles.includes(req.user.role)) {
            next(new ForbiddenError());
            return;
        }

        next();
    };
}
