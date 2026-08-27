import type { IRefreshTokenRepository } from "../../../auth/domain/refresh-token.repository.js";
import type { IEncrypt } from "../../../shared/domain/encrypt.port.js";
import { UserNotFoundError } from "../../domain/errors/user.errors.js";
import type { IUserRepository } from "../../domain/user.repository.js";
import { PasswordVO } from "../../domain/value-objects/password.js";


export interface ResetearPasswordInput{
    usuarioId:string;
    passwordNueva:string;
}


/**
 * Un admin le resetea la clave a alguien que la olvido.
 *
 * Es el caso real de planta: el operario no tiene correo de empresa, asi que
 * no hay flujo de "recuperar por email". El admin le pone una clave temporal
 * y se la dice.
 *
 * Por eso queda con primera_password en true: el admin conoce esa clave, y el
 * usuario esta obligado a cambiarla apenas entre. Tambien se le cierran todas
 * las sesiones abiertas.
 */
export class ResetearPasswordUseCase{
    constructor(
        private readonly userRepository:IUserRepository,
        private readonly passwordHasher:IEncrypt,
        private readonly refreshTokenRepository:IRefreshTokenRepository,
    ){}

    async execute(input:ResetearPasswordInput):Promise<void>{
        const user = await this.userRepository.findById(input.usuarioId);

        if(!user){
            throw new UserNotFoundError(input.usuarioId);
        }

        const nueva = PasswordVO.create(input.passwordNueva);

        user.resetearPassword(await this.passwordHasher.hash(nueva.getValue()));

        await this.userRepository.update(user);
        await this.refreshTokenRepository.revokeAllForUser(user.id);
    }
}
