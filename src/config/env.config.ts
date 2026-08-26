import 'dotenv/config';

function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value || value.trim() === "") {
        throw new Error(`Falta la variable de entorno obligatoria: ${key}`);
    }
    return value;
}

export interface EnvConfig{
    ISPRODUCTION:boolean;
    HOST:string;
    PORT:number;
    DB_HOST:string;
    DB_PORT:number;
    DB_USERNAME:string;
    DB_PASSWORD:string;
    DB_NAME:string;
}

export const envConfig=():EnvConfig=>{
    let isProduction:boolean;
    const NODE_ENV = process.env.NODE_ENV;
    if(NODE_ENV==="production"){
        isProduction=true;
    }else{
        isProduction=false;
    }


    return{
        // server config
        ISPRODUCTION:isProduction,
        HOST:process.env.HOST || "localhost",
        PORT:Number(process.env.PORT) || 3000,
        // database config
        DB_HOST:process.env.DB_HOST || "localhost",
        DB_PORT:Number(process.env.DB_PORT) || 3306,
        DB_USERNAME:process.env.DB_USERNAME || "test",
        DB_PASSWORD:process.env.DB_PASSWORD || "test",
        DB_NAME:process.env.DB_NAME || "test"
    }
}


// ==========================================================================
// configuracion de autenticacion (jwt + refresh tokens)
// todo lo que tenga que ver con sesiones sale de aca, para no andar leyendo
// process.env a mano en medio de la logica
// ==========================================================================
export interface AuthConfig{
    JWT_ACCESS_SECRET:string;
    JWT_ISSUER:string;
    JWT_AUDIENCE:string;
    // duracion del access token en segundos
    ACCESS_TOKEN_TTL_S:number;
    // duracion del refresh token en dias
    REFRESH_TOKEN_TTL_DAYS:number;
}

export const authConfig=():AuthConfig=>{
    const secret = requireEnv("JWT_ACCESS_SECRET");

    // un secreto corto es tan malo como no tener secreto, mejor reventar al arrancar
    if(secret.length < 32){
        throw new Error("JWT_ACCESS_SECRET debe tener al menos 32 caracteres");
    }

    return{
        JWT_ACCESS_SECRET:secret,
        JWT_ISSUER:process.env.JWT_ISSUER || "bodega-api",
        JWT_AUDIENCE:process.env.JWT_AUDIENCE || "bodega-app",
        ACCESS_TOKEN_TTL_S:Number(process.env.ACCESS_TOKEN_TTL_S) || 15*60,
        REFRESH_TOKEN_TTL_DAYS:Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 30,
    }
}


// ==========================================================================
// de donde salen las ventas: del AS400 real o de un adapter de mentira.
// el fake permite desarrollar y correr los tests sin depender de DB2,
// que no siempre esta arriba y que corta la conexion a los 40 minutos
// ==========================================================================
export type VentasSource = "db2" | "fake";

export const ventasSource=():VentasSource=>{
    return process.env.VENTAS_SOURCE === "fake" ? "fake" : "db2";
}


export interface odbcConfig{
    AS400_DSN:string;
    AS400_SVC_USR:string;
    AS400_SVC_KEY:string;
    AS400_CONN_STRING:string;
    AS400_SCHEMA:string;
    AS400_CONNECT_TIMEOUT_S:number;
    AS400_QUERY_TIMEOUT_MS:number;
}

export const odbcConfig=():odbcConfig=>{

    const DSN     = process.env.AS400_DSN     || 'AS400_SURPASS';
    const USER    = process.env.AS400_SVC_USR || '';
    const KEY     = process.env.AS400_SVC_KEY || '';
    const SCHEMA = process.env.AS400_LIBRARY || "";
    const CONNECT_TIMEOUT_S = Number(process.env.CONNECT_TIMEOUT_S) || 8;
    const QUERY_TIMEOUT_MS = Number(process.env.QUERY_TIMEOUT_MS) || 15000;
    const CONN_STRING = process.env.AS400_CONN_STRING || `DSN=${DSN};UID=${USER};PWD=${KEY};`;
    return{
        AS400_DSN: DSN,
        AS400_SVC_USR: USER,
        AS400_SVC_KEY: KEY,
        AS400_CONN_STRING: CONN_STRING,
        AS400_SCHEMA: SCHEMA,
        AS400_CONNECT_TIMEOUT_S:CONNECT_TIMEOUT_S,
        AS400_QUERY_TIMEOUT_MS:QUERY_TIMEOUT_MS
    }
}
