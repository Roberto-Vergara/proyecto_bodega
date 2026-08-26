import type { NextFunction, Request, Response } from "express";

import { NotFoundError } from "../../domain/errors.js";


// va justo antes del errorHandler: cualquier ruta que no matcheo termina aca
export function notFoundHandler(req:Request,_res:Response,next:NextFunction):void{
    next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}
