import { DataSource } from "typeorm";

import { envConfig } from "../../../../config/env.config.js";
import { UserEntity } from "../../../users/infrastructure/persistence/user.entity.js";
import { CarroEntity } from "../../../carros/infrastructure/persistence/carro.entity.js";
import { CarroItemsEntity } from "../../../carro_items/infrastructure/persistence/carro_items.entity.js";
import { VentasLogEntity } from "../../../ventas_log/infrastructure/persistence/ventas_log.entity.js";
import { RefreshTokenEntity } from "../../../auth/infrastructure/persistence/refresh-token.entity.js";
import { MovimientoEntity } from "../../../movimientos/infrastructure/persistence/movimiento.entity.js";

const {
    DB_HOST,
    DB_PORT,
    DB_USERNAME,
    DB_PASSWORD,
    DB_NAME,
    DB_ENCRYPT,
    DB_TRUST_SERVER_CERTIFICATE,
    ISPRODUCTION,
} = envConfig();

export const AppDataSource = new DataSource({
    type:"mssql",
    host:DB_HOST,
    port:DB_PORT,
    username:DB_USERNAME,
    password:DB_PASSWORD,
    database:DB_NAME,
    // normalmente dbo. Solo se cambia con DB_SCHEMA para generar la migracion
    // base contra un esquema vacio (ver el README de migraciones)
    schema:process.env.DB_SCHEMA || "dbo",

    // estas opciones si aplican en mssql (van al driver tedious)
    options:{
        encrypt:DB_ENCRYPT,
        // el servidor de la empresa usa certificado autofirmado
        trustServerCertificate:DB_TRUST_SERVER_CERTIFICATE,
        // sin esto tedious tira warnings y algunas queries se comportan raro
        enableArithAbort:true,
        // SQL Server 2012 solo habla TLS 1.0/1.1. Node 18+ exige TLS 1.2 por
        // defecto y el handshake falla con un error poco descriptivo
        // ("socket hang up" o "self signed certificate"). Bajar el minimo
        // solo tiene sentido en una red interna como esta
        cryptoCredentialsDetails:{
            minVersion:"TLSv1",
        },
        // fechas sin zona horaria: la columna es datetime2 y guardamos UTC
        useUTC:true,
    },

    // el AS400 y esta red no son rapidos; los defaults de tedious son cortos
    connectionTimeout:30000,
    requestTimeout:30000,

    pool:{
        max:10,
        min:0,
        idleTimeoutMillis:30000,
    },

    // ==================================================================
    // synchronize SOLO en desarrollo. En produccion cambia el esquema sin
    // avisar y puede borrar columnas con datos adentro.
    //
    // El esquema de produccion se mueve con migraciones:
    //   pnpm migration:generate src/migrations/NombreDelCambio
    //   pnpm migration:run
    //
    // migrationsRun queda en false a proposito: si una migracion falla, es
    // mejor que reviente al correrla a mano y no que el servidor no arranque.
    // ==================================================================
    synchronize:!ISPRODUCTION,
    migrationsRun:false,
    migrationsTableName:"migraciones",
    // rutas relativas al directorio del backend, que es desde donde corren
    // tanto el CLI de typeorm como pm2
    migrations:[ISPRODUCTION ? "dist/migrations/*.js" : "src/migrations/*.ts"],
    entities:[
        UserEntity,
        CarroEntity,
        CarroItemsEntity,
        VentasLogEntity,
        RefreshTokenEntity,
        MovimientoEntity
    ],
})
