import { EmailAlreadyExistsError, UserNotFoundError } from "../../domain/errors/user.errors.js";
import type { IUserRepository } from "../../domain/user.repository.js";
import type { UpdateUserDto } from "../dtos/UsuarioDto.js";



export class UpdateUserUseCase{
    constructor(
        private readonly userRepository:IUserRepository
    ){}

    async execute(input:UpdateUserDto):Promise<void>{
        const user = await this.userRepository.findById(input.id);

        if(!user){
            throw new UserNotFoundError(input.id);
        }

        if(input.nombre !== undefined || input.apellido !==undefined){
            user.cambiarNombre(input.nombre ?? user.nombre, input.apellido ?? user.apellido);
        }

        if(input.email !== undefined && input.email !==user.email){
            const existe = await this.userRepository.existsByEmail(input.email);
            if(existe){
                throw new EmailAlreadyExistsError(input.email)
            }
            user.cambiarEmail(input.email);
        }
        await this.userRepository.update(user);
    }
}