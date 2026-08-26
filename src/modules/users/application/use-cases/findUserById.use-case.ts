import { UserNotFoundError } from "../../domain/errors/user.errors.js";
import type { User } from "../../domain/user.domain.js";
import type { IUserRepository } from "../../domain/user.repository.js";



export class FindUserByIdUseCase{
    constructor(
        private readonly userRepository:IUserRepository
    ){}

    async execute(id:string):Promise<User>{
        const user= await this.userRepository.findById(id);
        if(!user){
            throw new UserNotFoundError(id);
        }
        return user;
    }
}