import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";

import { authConfig } from "../../../../config/env.config.js";
import type { AccessTokenResult, ITokenService, TokenPayload } from "../../domain/token.port.js";
import { UnauthorizedError } from "../../domain/errors.js";

const {
    JWT_ACCESS_SECRET,
    JWT_ISSUER,
    JWT_AUDIENCE,
    ACCESS_TOKEN_TTL_S,
} = authConfig();


export class JwtTokenService implements ITokenService{

    generateAccessToken(payload: TokenPayload): AccessTokenResult {
        const token = jwt.sign(
            {
                role:payload.role,
                area:payload.area,
            },
            JWT_ACCESS_SECRET,
            {
                algorithm:"HS256",
                expiresIn:ACCESS_TOKEN_TTL_S,
                issuer:JWT_ISSUER,
                audience:JWT_AUDIENCE,
                // el id del usuario va en "sub", que es el claim estandar para eso
                subject:payload.userId,
            }
        );

        return {token,expiresIn:ACCESS_TOKEN_TTL_S};
    }

    verifyAccessToken(token: string): TokenPayload {
        let decoded:unknown;

        try {
            decoded = jwt.verify(token,JWT_ACCESS_SECRET,{
                // fijar el algoritmo evita el ataque de "alg confusion" (ej: que te manden alg:none)
                algorithms:["HS256"],
                issuer:JWT_ISSUER,
                audience:JWT_AUDIENCE,
            });
        } catch {
            throw new UnauthorizedError("Token inválido o expirado");
        }

        // jwt.verify puede devolver un string, y el payload viene de afuera:
        // hay que revisar la forma antes de confiar en ella
        if(typeof decoded !== "object" || decoded === null){
            throw new UnauthorizedError("Token inválido o expirado");
        }

        const {sub,role,area} = decoded as Record<string,unknown>;

        if(typeof sub !== "string" || typeof role !== "string" || typeof area !== "string"){
            throw new UnauthorizedError("Token inválido o expirado");
        }

        return {userId:sub,role,area};
    }

    generateRefreshToken(): string {
        // 64 bytes de entropia real, en base64url para que viaje limpio en json y headers
        return randomBytes(64).toString("base64url");
    }

    hashRefreshToken(token: string): string {
        // sha256 y no bcrypt a proposito: el token ya es aleatorio y largo,
        // no hay nada que "adivinar" por fuerza bruta, y asi el refresh es rapido
        return createHash("sha256").update(token).digest("hex");
    }
}
