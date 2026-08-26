import type { NextFunction, Request, Response } from "express";

import { UnauthorizedError, ValidationError } from "../../../shared/domain/errors.js";
import type { FindUserByIdUseCase } from "../../../users/application/use-cases/findUserById.use-case.js";
import type { LoginUseCase } from "../../application/use-case/login.use-case.js";
import type { LogoutUseCase } from "../../application/use-case/logout.use-case.js";
import type { LogoutAllUseCase } from "../../application/use-case/logout-all.use-case.js";
import type { RefreshTokenUseCase } from "../../application/use-case/refresh-token.use-case.js";

// la columna deviceInfo es varchar(255): cortamos antes de llegar a la base
const MAX_DEVICE_INFO = 255;

function leerTexto(valor:unknown):string|undefined{
    if(typeof valor !== "string") return undefined;
    const limpio = valor.trim();
    return limpio === "" ? undefined : limpio;
}

// la app movil puede mandar algo mas util que el user-agent (ej: "iPhone 14 - iOS 17")
function leerDeviceInfo(req:Request):string|undefined{
    const body = (req.body ?? {}) as Record<string,unknown>;
    const desdeBody = leerTexto(body["deviceInfo"]);
    const desdeHeader = leerTexto(req.headers["user-agent"]);
    const valor = desdeBody ?? desdeHeader;
    return valor === undefined ? undefined : valor.slice(0,MAX_DEVICE_INFO);
}

function leerRefreshToken(req:Request):string{
    const body = (req.body ?? {}) as Record<string,unknown>;
    const refreshToken = leerTexto(body["refreshToken"]);

    if(refreshToken === undefined){
        throw new ValidationError("Falta el campo refreshToken");
    }

    return refreshToken;
}


export class AuthController {
    constructor(
        private readonly loginUseCase: LoginUseCase,
        private readonly refreshTokenUseCase: RefreshTokenUseCase,
        private readonly logoutUseCase: LogoutUseCase,
        private readonly logoutAllUseCase: LogoutAllUseCase,
        private readonly findUserByIdUseCase: FindUserByIdUseCase,
    ) {}

    login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body = (req.body ?? {}) as Record<string,unknown>;
            const email = body["email"];
            const password = body["password"];

            // validacion de forma (400). Si el email o la clave estan malos,
            // eso lo decide el caso de uso y responde 401
            if(typeof email !== "string" || typeof password !== "string"){
                throw new ValidationError("email y password son obligatorios");
            }

            const deviceInfo = leerDeviceInfo(req);

            const result = await this.loginUseCase.execute({
                email,
                password,
                ...(deviceInfo !== undefined && { deviceInfo }),
            });

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const refreshToken = leerRefreshToken(req);
            const deviceInfo = leerDeviceInfo(req);

            const result = await this.refreshTokenUseCase.execute(refreshToken, deviceInfo);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const refreshToken = leerRefreshToken(req);

            await this.logoutUseCase.execute(refreshToken);

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if(!req.user){
                throw new UnauthorizedError();
            }

            await this.logoutAllUseCase.execute(req.user.userId);

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    // sirve para que el cliente valide que su access token sigue vivo
    // y refresque los datos del usuario sin volver a loguearse
    me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if(!req.user){
                throw new UnauthorizedError();
            }

            const user = await this.findUserByIdUseCase.execute(req.user.userId);

            res.status(200).json({
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                role: user.role,
                area: user.area,
                isActive: user.isActive,
            });
        } catch (error) {
            next(error);
        }
    };
}
