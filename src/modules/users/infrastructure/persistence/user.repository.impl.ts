import type { Repository } from "typeorm";

import { AppDataSource } from "../../../shared/infrastructure/database/data-source.js";
import { User } from "../../domain/user.domain.js";
import type { IUserRepository } from "../../domain/user.repository.js";
import { UserEntity } from "./user.entity.js";


export class UserRepositoryImpl implements IUserRepository{

    // igual que en refresh tokens: el datasource se inicializa despues de importar las rutas
    private get repository():Repository<UserEntity>{
        return AppDataSource.getRepository(UserEntity);
    }

    async create(user: User): Promise<void> {
        await this.repository.insert(this.toEntity(user));
    }

    async update(user: User): Promise<void> {
        await this.repository.update({id:user.id},{
            nombre:user.nombre,
            apellido:user.apellido,
            email:user.email,
            passHash:user.passHash,
            role:user.role,
            area:user.area,
            isActive:user.isActive,
        });
    }

    async desactivate(id: string): Promise<void> {
        await this.repository.update({id},{isActive:false});
    }

    async findById(id: string): Promise<User | null> {
        const entity = await this.repository.findOneBy({id});
        return entity ? this.toDomain(entity) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        // el email se guarda normalizado por el value object, asi que buscamos igual
        const entity = await this.repository.findOneBy({email:email.trim().toLowerCase()});
        return entity ? this.toDomain(entity) : null;
    }

    async existsByEmail(email: string): Promise<boolean> {
        const total = await this.repository.countBy({email:email.trim().toLowerCase()});
        return total > 0;
    }

    async getAllUsers(): Promise<User[]> {
        const entities = await this.repository.find({order:{creadoEn:"DESC"}});
        return entities.map((entity)=>this.toDomain(entity));
    }

    private toEntity(user:User):UserEntity{
        const entity = new UserEntity();
        entity.id = user.id;
        entity.nombre = user.nombre;
        entity.apellido = user.apellido;
        entity.email = user.email;
        entity.passHash = user.passHash;
        entity.role = user.role;
        entity.area = user.area;
        entity.isActive = user.isActive;
        return entity;
    }

    private toDomain(entity:UserEntity):User{
        return User.reconstitute({
            id:entity.id,
            nombre:entity.nombre,
            apellido:entity.apellido,
            email:entity.email,
            pass_hash:entity.passHash,
            role:entity.role,
            area:entity.area,
            isActive:entity.isActive,
            createdAt:entity.creadoEn,
            updatedAt:entity.actualizadoEn,
        });
    }
}
