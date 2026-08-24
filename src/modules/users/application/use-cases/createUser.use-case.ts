import type { IEncrypt } from "../../../shared/domain/encrypt.port.js";
import type { IIdGenPort } from "../../../shared/domain/idGen.port.js";
import type { IUserRepository } from "../../domain/user.repository.js";




export class CreateUserUseCase{
    constructor(
        private readonly usuarioRepository:IUserRepository,
        private readonly encryptPort:IEncrypt,
        private readonly idGenPort:IIdGenPort
    ){}


    async execute(){

    }
}