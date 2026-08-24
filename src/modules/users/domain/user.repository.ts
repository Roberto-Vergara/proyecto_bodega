import type { User } from "./user.domain.js";




export interface IUserRepository{
    create(user:User):Promise<void>;
    update(user:User):Promise<void>;
    desactivate(id:string):Promise<void>;
    findById(id:string):Promise<User|null>;
    findByEmail(email:string):Promise<User|null>;
    existsByEmail(email:string):Promise<boolean>;
    getAllUsers():Promise<User[]>
}