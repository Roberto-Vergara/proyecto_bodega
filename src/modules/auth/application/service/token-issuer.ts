import { authConfig } from "../../../../config/env.config.js";
import type { ITokenService } from "../../../shared/domain/token.port.js";
import type { User } from "../../../users/domain/user.domain.js";
import type { IRefreshTokenRepository } from "../../domain/refresh-token.repository.js";
import type { TokenPairDto } from "../dto/auth.dto.js";

const { REFRESH_TOKEN_TTL_DAYS } = authConfig();
const DIA_EN_MS = 24 * 60 * 60 * 1000;


// login y refresh emiten exactamente el mismo par de tokens.
// dejarlo en un solo lugar evita que se desincronicen despues
export class TokenIssuer{
    constructor(
        private readonly tokenService:ITokenService,
        private readonly refreshTokenRepository:IRefreshTokenRepository,
    ){}

    async issue(user:User,deviceInfo?:string):Promise<TokenPairDto>{
        const { token: accessToken, expiresIn } = this.tokenService.generateAccessToken({
            userId: user.id,
            role: user.role,
            area: user.area,
        });

        const refreshToken = this.tokenService.generateRefreshToken();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * DIA_EN_MS);

        await this.refreshTokenRepository.save({
            tokenHash: this.tokenService.hashRefreshToken(refreshToken),
            userId: user.id,
            expiresAt,
            ...(deviceInfo !== undefined && { deviceInfo }),
        });

        return {
            accessToken,
            accessTokenExpiresIn: expiresIn,
            refreshToken,
            refreshTokenExpiresAt: expiresAt.toISOString(),
            tokenType: "Bearer",
        };
    }
}
