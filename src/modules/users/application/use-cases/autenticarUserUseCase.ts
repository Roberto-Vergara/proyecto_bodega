import type { IEncrypt } from "../../../shared/domain/encrypt.port.js";
import { InvalidCredentialsError } from "../../domain/errors/user.errors.js";
import type { User } from "../../domain/user.domain.js";
import type { IUserRepository } from "../../domain/user.repository.js";
import type { AutenticarUsuarioDto } from "../dtos/UsuarioDto.js";




export class AutenticarUserUseCase{
    constructor(
        private readonly userRepository:IUserRepository,
        private readonly passwordHasher:IEncrypt
    ){}


    async execute(input:AutenticarUsuarioDto):Promise<User>{
        const user = await this.userRepository.findByEmail(input.email);

        if(!user){
            throw new InvalidCredentialsError();
        }

        if(!user.isActive){
            throw new InvalidCredentialsError();
        }

        const passwordValidate = await this.passwordHasher.compare(input.password,user.passHash);

        if(!passwordValidate){
            throw new InvalidCredentialsError();
        }

        return user;
    }
}