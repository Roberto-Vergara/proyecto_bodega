import { DataSource } from "typeorm";

import { envConfig } from "../../../../config/env.config.js";
import { UserEntity } from "../../../users/infrastructure/persistence/user.entity.js";
import { CarroEntity } from "../../../carros/infrastructure/persistence/carro.entity.js";
import { CarroItemsEntity } from "../../../carro_items/infrastructure/persistence/carro_items.entity.js";
import { VentasLogEntity } from "../../../ventas_log/infrastructure/persistence/ventas_log.entity.js";
import { RefreshTokenEntity } from "../../../auth/infrastructure/persistence/refresh-token.entity.js";

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
    entities:[
        UserEntity,
        CarroEntity,
        CarroItemsEntity,
        VentasLogEntity,
        // faltaba registrarla: sin esto typeorm no crea la tabla ni conoce la entidad
        RefreshTokenEntity
    ],
})