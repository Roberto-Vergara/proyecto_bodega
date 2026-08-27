import type { IRefreshTokenRepository } from "../../../auth/domain/refresh-token.repository.js";
import type { IEncrypt } from "../../../shared/domain/encrypt.port.js";
import { ValidationError } from "../../../shared/domain/errors.js";
import { InvalidCredentialsError, UserNotFoundError } from "../../domain/errors/user.errors.js";
import type { IUserRepository } from "../../domain/user.repository.js";
import { PasswordVO } from "../../domain/value-objects/password.js";


export interface CambiarPasswordInput{
    usuarioId:string;
    passwordActual:string;
    passwordNueva:string;
}


/**
 * El propio usuario cambia su clave.
 *
 * Pide la clave actual aunque ya venga autenticado: si alguien le deja el
 * telefono desbloqueado a otro, el token no basta para tomarle la cuenta.
 *
 * Al terminar se revocan TODAS las sesiones. Es lo que se espera de un cambio
 * de clave: si la cambiaste porque creias que alguien la sabia, ese alguien
 * tiene que quedar afuera. El cliente vuelve a loguearse con la nueva.
 */
export class CambiarPasswordUseCase{
    constructor(
        private readonly userRepository:IUserRepository,
        private readonly passwordHasher:IEncrypt,
        private readonly refreshTokenRepository:IRefreshTokenRepository,
    ){}

    async execute(input:CambiarPasswordInput):Promise<void>{
        const user = await this.userRepository.findById(input.usuarioId);

        if(!user || !user.isActive){
            throw new UserNotFoundError(input.usuarioId);
        }

        const actualValida = await this.passwordHasher.compare(
            input.passwordActual,
            user.passHash,
        );

        if(!actualValida){
            throw new InvalidCredentialsError();
        }

        if(input.passwordNueva === input.passwordActual){
            throw new ValidationError("La clave nueva no puede ser igual a la actual");
        }

        // PasswordVO valida largo y complejidad antes de hashear
        const nueva = PasswordVO.create(input.passwordNueva);

        user.cambiarPassword(await this.passwordHasher.hash(nueva.getValue()));

        await this.userRepository.update(user);
        await this.refreshTokenRepository.revokeAllForUser(user.id);
    }
}
