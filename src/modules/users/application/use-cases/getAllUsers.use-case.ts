import type { User } from "../../domain/user.domain.js";
import type { IUserRepository } from "../../domain/user.repository.js";



export class GetAllUsersUseCase{
    constructor(
        private readonly userRepository:IUserRepository
    ){}

    async execute():Promise<User[]>{
        return this.userRepository.getAllUsers();
    }
}