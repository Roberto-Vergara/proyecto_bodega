import { randomUUID } from "node:crypto";
import { LessThan, type Repository } from "typeorm";

import { AppDataSource } from "../../../shared/infrastructure/database/data-source.js";
import type {
    IRefreshTokenRepository,
    RefreshTokenRecord,
    SaveRefreshTokenInput,
} from "../../domain/refresh-token.repository.js";
import { RefreshTokenEntity } from "./refresh-token.entity.js";


export class RefreshTokenRepositoryImpl implements IRefreshTokenRepository{

    // getter en vez de asignar en el constructor: el AppDataSource todavia no esta
    // inicializado cuando se importan las rutas, asi que hay que pedirlo tarde
    private get repository():Repository<RefreshTokenEntity>{
        return AppDataSource.getRepository(RefreshTokenEntity);
    }

    async save(input: SaveRefreshTokenInput): Promise<void> {
        const entity = this.repository.create({
            id:randomUUID(),
            tokenHash:input.tokenHash,
            userId:input.userId,
            expiresAt:input.expiresAt,
            revoked:false,
            revokedAt:null,
            deviceInfo:input.deviceInfo ?? null,
        });

        await this.repository.save(entity);
    }

    async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
        const entity = await this.repository.findOneBy({tokenHash});

        if(!entity){
            return null;
        }

        return {
            id:entity.id,
            tokenHash:entity.tokenHash,
            userId:entity.userId,
            expiresAt:entity.expiresAt,
            revoked:entity.revoked,
        };
    }

    async revokeByHash(tokenHash: string): Promise<void> {
        await this.repository.update({tokenHash,revoked:false},{revoked:true,revokedAt:new Date()});
    }

    async revokeAllForUser(userId: string): Promise<void> {
        await this.repository.update({userId,revoked:false},{revoked:true,revokedAt:new Date()});
    }

    async deleteExpired(): Promise<number> {
        const result = await this.repository.delete({expiresAt:LessThan(new Date())});
        return result.affected ?? 0;
    }
}
