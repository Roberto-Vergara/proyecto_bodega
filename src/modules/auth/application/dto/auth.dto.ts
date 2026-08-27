

export interface LoginInputDto{
    email:string;
    password:string;
    deviceInfo?:string;
}

// lo que el cliente (web o app movil) necesita para armar su sesion
export interface AuthUserDto{
    id:string;
    nombre:string;
    apellido:string;
    email:string;
    role:string;
    area:string;
    /**
     * true cuando el usuario sigue usando la clave que le puso el admin.
     *
     * El cliente (app movil o dashboard) tiene que mandarlo a la pantalla de
     * cambio de clave antes de dejarlo operar.
     */
    primera_password:boolean;
}

export interface TokenPairDto{
    accessToken:string;
    // en segundos, para que el cliente sepa cuando pedir el refresh sin esperar un 401
    accessTokenExpiresIn:number;
    refreshToken:string;
    // ISO string, util para que la app movil sepa cuando la sesion muere de verdad
    refreshTokenExpiresAt:string;
    tokenType:"Bearer";
}

export interface LoginOutputDto extends TokenPairDto{
    user:AuthUserDto;
}

export interface RefreshTokenOutputDto extends TokenPairDto{}
