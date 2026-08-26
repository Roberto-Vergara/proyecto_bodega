import type { NextFunction, Request, Response } from "express";

import { UnauthorizedError } from "../../../shared/domain/errors.js";
import type { ITokenService } from "../../../shared/domain/token.port.js";


// alias por comodidad: despues del middleware, req.user siempre viene cargado
export type AuthenticatedRequest = Request & { user: NonNullable<Request["user"]> };


export function authMiddleware(tokenService:ITokenService){
    return(req:Request,_res:Response,next:NextFunction):void=>{
        const authHeader = req.headers.authorization;

        if(!authHeader || !authHeader.startsWith("Bearer ")){
            next(new UnauthorizedError("Token no proporcionado"));
            return;
        }

        const token = authHeader.slice("Bearer ".length).trim();

        if(token === ""){
            next(new UnauthorizedError("Token no proporcionado"));
            return;
        }

        try {
            // verifyAccessToken ya lanza UnauthorizedError si algo no cuadra
            req.user = tokenService.verifyAccessToken(token);
            next();
        } catch (error) {
            // mandamos el error al errorHandler en vez de responder aca:
            // asi todas las respuestas de error del api tienen el mismo formato
            next(error);
        }
    }
}
