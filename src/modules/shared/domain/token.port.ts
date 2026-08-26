

export interface TokenPayload{
    userId:string;
    role:string;
    area:string;
}

export interface AccessTokenResult{
    token:string;
    expiresIn:number;
}

export interface ITokenService{
    generateAccessToken(payload:TokenPayload):AccessTokenResult;
    verifyAccessToken(token:string):TokenPayload;

    // el refresh token NO es un jwt: es un valor opaco aleatorio.
    // asi puede revocarse de verdad (un jwt firmado vale hasta que expira, no hay como matarlo)
    generateRefreshToken():string;

    // en la base solo guardamos el hash del refresh token.
    // si alguien se roba un dump de la tabla, no le sirve de nada
    hashRefreshToken(token:string):string;
}
