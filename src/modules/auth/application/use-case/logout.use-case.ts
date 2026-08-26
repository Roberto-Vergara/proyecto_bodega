import type { ITokenService } from "../../../shared/domain/token.port.js";
import type { IRefreshTokenRepository } from "../../domain/refresh-token.repository.js";



export class LogoutUseCase{
    constructor(
        private readonly refreshTokenRepository:IRefreshTokenRepository,
        private readonly tokenService:ITokenService,
    ){}

    // idempotente a proposito: si el token ya no existe o ya estaba revocado,
    // igual respondemos ok. Cerrar sesion nunca deberia fallarle al cliente
    async execute(refreshToken:string):Promise<void>{
        if(typeof refreshToken !== "string" || refreshToken.trim() === ""){
            return;
        }

        await this.refreshTokenRepository.revokeByHash(
            this.tokenService.hashRefreshToken(refreshToken),
        );
    }
}
