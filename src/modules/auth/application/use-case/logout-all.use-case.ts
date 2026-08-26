import type { IRefreshTokenRepository } from "../../domain/refresh-token.repository.js";



// "cerrar sesión en todos los dispositivos".
// se usa desde /auth/logout-all, con el access token del propio usuario
export class LogoutAllUseCase{
    constructor(
        private readonly refreshTokenRepository:IRefreshTokenRepository
    ){}

    async execute(userId:string):Promise<void>{
        await this.refreshTokenRepository.revokeAllForUser(userId);
    }
}
