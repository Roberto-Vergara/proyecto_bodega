

export interface SaveRefreshTokenInput{
    // ojo: guardamos el HASH, nunca el token en limpio
    tokenHash:string;
    userId:string;
    expiresAt:Date;
    deviceInfo?:string;
}

export interface RefreshTokenRecord{
    id:string;
    tokenHash:string;
    userId:string;
    expiresAt:Date;
    revoked:boolean;
}

export interface IRefreshTokenRepository {
    save(input:SaveRefreshTokenInput): Promise<void>;

    // devuelve el registro aunque este revocado o vencido.
    // lo necesitamos asi para poder detectar reutilizacion de tokens robados
    findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;

    revokeByHash(tokenHash: string): Promise<void>;
    revokeAllForUser(userId: string): Promise<void>;

    // limpieza de los que ya no sirven, para que la tabla no crezca infinito
    deleteExpired(): Promise<number>;
}
