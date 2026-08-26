import { UserNotFoundError } from "../../domain/errors/user.errors.js";
import type { IUserRepository } from "../../domain/user.repository.js";




export class DesactivareUserUserCase{
    constructor(
        private readonly userRepository:IUserRepository
    ){}

    async execute(id:string):Promise<void>{
        // esto es maldito, nosotros buscamos al usuario
        const user = await this.userRepository.findById(id);

        // validamos
        if(!user){
            throw new UserNotFoundError(id);
        }

        // al ser de tipo User podemos ejecutar su metodo desactivar()
        // que esta en su dominio y la gracia de este es que tiene validaciones y reglas
        user.desactivar();

        // despues de eso actualizamos el objeto entero(que mantiene casi todo sus datos iguales)
        // pero cambio su estado al ejecutar desactivar
        await this.userRepository.update(user);
    }
}

// la gracia de los casos de uso es que es el intermediario que aplica gran parte de la logica
// del dominio y luego lo usamos al injectar dependencias pero validado
// literal no sabemos lo que le van a poner como repositorio, pero se marcan
// las reglas de negocio y las formas de las clases que debe ser si o si
// de cierto tipo si o si, de no ser el caso el ide me mostrara un error de tipeo o algo asi