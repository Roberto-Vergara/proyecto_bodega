import type { IUserRepository } from "../../domain/user.repository.js";
import { UserNotFoundError } from "../../domain/errors/user.errors.js";


/**
 * Vuelve a habilitar un usuario desactivado.
 *
 * El metodo activar() ya existia en el dominio pero no lo llamaba nadie: si
 * desactivabas a alguien por error, habia que arreglarlo con SQL a mano.
 */
export class ActivarUserUseCase{
    constructor(
        private readonly userRepository:IUserRepository
    ){}

    async execute(id:string):Promise<void>{
        const user = await this.userRepository.findById(id);

        if(!user){
            throw new UserNotFoundError(id);
        }

        user.activar();

        await this.userRepository.update(user);
    }
}
