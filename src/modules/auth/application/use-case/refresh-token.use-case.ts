import type { ITokenService } from "../../../shared/domain/token.port.js";
import { InvalidCredentialsError } from "../../../users/domain/errors/user.errors.js";
import type { IUserRepository } from "../../../users/domain/user.repository.js";
import type { IRefreshTokenRepository } from "../../domain/refresh-token.repository.js";
import type { RefreshTokenOutputDto } from "../dto/auth.dto.js";
import type { TokenIssuer } from "../service/token-issuer.js";


export class RefreshTokenUseCase{
    constructor(
        private readonly refreshTokenRepository:IRefreshTokenRepository,
        private readonly userRepository:IUserRepository,
        private readonly tokenService:ITokenService,
        private readonly tokenIssuer:TokenIssuer,
    ){}

    async execute(refreshToken:string, deviceInfo?:string):Promise<RefreshTokenOutputDto>{
        if(typeof refreshToken !== "string" || refreshToken.trim() === ""){
            throw new InvalidCredentialsError();
        }

        const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
        const registro = await this.refreshTokenRepository.findByHash(tokenHash);

        if(!registro){
            throw new InvalidCredentialsError();
        }

        // DETECCION DE REUTILIZACION
        // este token ya fue usado (o el usuario cerro sesion) y alguien lo esta presentando
        // de nuevo. El caso tipico es que se lo robaron: matamos TODAS las sesiones del
        // usuario para que el atacante y el dueño queden fuera, y el dueño vuelva a loguearse
        if(registro.revoked){
            await this.refreshTokenRepository.revokeAllForUser(registro.userId);
            throw new InvalidCredentialsError();
        }

        if(registro.expiresAt.getTime() <= Date.now()){
            await this.refreshTokenRepository.revokeByHash(tokenHash);
            throw new InvalidCredentialsError();
        }

        const user = await this.userRepository.findById(registro.userId);

        // si lo desactivaron mientras tenia sesion abierta, se corta aca
        if(!user || !user.isActive){
            await this.refreshTokenRepository.revokeAllForUser(registro.userId);
            throw new InvalidCredentialsError();
        }

        // ROTACION: el refresh token es de un solo uso.
        // se quema el viejo y se entrega uno nuevo. Asi la ventana en que un token
        // robado sirve es, como mucho, hasta el proximo refresh del dueño
        await this.refreshTokenRepository.revokeByHash(tokenHash);

        return this.tokenIssuer.issue(user, deviceInfo);
    }
}
