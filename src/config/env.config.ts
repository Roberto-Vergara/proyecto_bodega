

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


export interface odbcConfig{
    AS400_DSN:string;
    AS400_SVC_USR:string;
    AS400_SVC_KEY:string;
    AS400_CONN_STRING:string;
}

export const odbcConfig=():odbcConfig=>{

    const DSN     = process.env.AS400_DSN     || 'AS400_SURPASS';
    const USER    = process.env.AS400_SVC_USR || '';
    const KEY     = process.env.AS400_SVC_KEY || '';
    const CONN_STRING = process.env.AS400_CONN_STRING || `DSN=${DSN};UID=${USER};PWD=${KEY};`;
    return{
        AS400_DSN: DSN,
        AS400_SVC_USR: USER,
        AS400_SVC_KEY: KEY,
        AS400_CONN_STRING: CONN_STRING,
    }
}