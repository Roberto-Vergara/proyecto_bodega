import type { IEncrypt } from "../../../shared/domain/encrypt.port.js";
import type { IIdGenPort } from "../../../shared/domain/idGen.port.js";
import { EmailAlreadyExistsError } from "../../domain/errors/user.errors.js";
import { User } from "../../domain/user.domain.js";
import type { IUserRepository } from "../../domain/user.repository.js";
import { PasswordVO } from "../../domain/value-objects/password.js";
import type { CrearUsuarioDto } from "../dtos/UsuarioDto.js";




export class CreateUserUseCase{
    constructor(
        private readonly userRepository:IUserRepository,
        private readonly encryptPort:IEncrypt,
        private readonly idGenPort:IIdGenPort
    ){}


    async execute(input:CrearUsuarioDto):Promise<User>{
        // faltaba validar la clave EN TEXTO PLANO antes de hashearla.
        // una vez hasheada ya no hay forma de saber si cumplia las reglas
        const password = PasswordVO.create(input.password);

        const existe = await this.userRepository.existsByEmail(input.email);

        if(existe){
            throw new EmailAlreadyExistsError(input.email);
        }

        const passHash = await this.encryptPort.hash(password.getValue());

        const user = User.create({
            id:this.idGenPort.generate(),
            nombre:input.nombre,
            apellido:input.apellido,
            email:input.email,
            pass_hash:passHash,
            role:input.role,
            area:input.area
        })

        await this.userRepository.create(user);

        return user;
    }
}
