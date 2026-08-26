import type { NextFunction, Request, Response } from "express";

import {
    ConflictError,
    DomainError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
} from "../../domain/errors.js";
import { envConfig } from "../../../../config/env.config.js";

const { ISPRODUCTION } = envConfig();


export function errorHandler(
    error:unknown,
    req:Request,
    res:Response,
    _next:NextFunction
):void{
    // si ya se empezo a escribir la respuesta no podemos cambiarle el status
    if(res.headersSent){
        return;
    }

    // los errores de negocio son esperables: no ensucian el log con stack traces
    if(error instanceof DomainError){
        if(!ISPRODUCTION){
            console.warn(`[AVISO] ${req.method} ${req.originalUrl}: ${error.name} - ${error.message}`);
        }
    }else{
        console.error(`[ERROR] ${req.method} ${req.originalUrl}: `,error);
    }

    // ojo con el orden: las subclases van antes que DomainError,
    // si no, el primer instanceof se come todo
    if(error instanceof UnauthorizedError){
        res.status(401).json({error:error.message});
        return;
    }

    if(error instanceof ForbiddenError){
        res.status(403).json({error:error.message});
        return;
    }

    if(error instanceof NotFoundError){
        // faltaba el return: antes seguia evaluando y podia intentar responder dos veces
        res.status(404).json({error:error.message});
        return;
    }

    if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
        return;
    }

    if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
    }

    if (error instanceof DomainError) {
        // cualquier otro error de negocio que no encaje en los anteriores
        res.status(400).json({ error: error.message });
        return;
    }

    // json mal formado que tira express.json()
    if (error instanceof SyntaxError && "body" in error) {
        res.status(400).json({ error: "El cuerpo de la petición no es un JSON válido" });
        return;
    }

    // Error inesperado: no exponemos el mensaje real al cliente
    res.status(500).json({ error: "Error interno del servidor" });
}
