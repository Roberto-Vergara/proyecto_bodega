import { DataSource } from "typeorm";

import { envConfig } from "../../../../config/env.config.js";

const {DB_HOST,DB_PORT,DB_USERNAME,DB_PASSWORD,DB_NAME,ISPRODUCTION} = envConfig();
export const AppDataSource = new DataSource({
    type:"postgres",
    host:DB_HOST,
    port:DB_PORT,
    username:DB_USERNAME,
    password:DB_PASSWORD,
    database:DB_NAME,
    // este options solo funciona con los drivers de mssql(sql server), en pg no existe
    // options:{
    //     encrypt:false,
    //     trustServerCertificate:true,
    //     useUTC:true,
    // },
    synchronize:!ISPRODUCTION,
    entities:[],
})