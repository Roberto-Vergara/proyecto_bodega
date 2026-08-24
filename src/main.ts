import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { envConfig } from "./config/env.config.js";

import { AppDataSource } from "./modules/shared/infrastructure/database/data-source.js";
import helmet from "helmet";

const { PORT, HOST,ISPRODUCTION } = envConfig();

const app = express();

const main = async (): Promise<void> => {

    console.log(ISPRODUCTION ? "[SERVER] Modo: PRODUCCIÓN" : "[SERVER] Modo: DESARROLLO");
    

    // typeorm, luego tendria configurar en otra parte el odbc
    await AppDataSource.initialize();
    console.log("[DATABASE] Base de datos conectada correctamente");


    // configuracion middlewares
    const origenesEnv = process.env.CORS_ORIGINS || "";
    const origenesArray = origenesEnv
        .split(",")
        .map(url => url.trim().replace(/\/+$/, ""))
        .filter(Boolean); // Limpia elementos vacíos
    const origenesPermitidos = new Set(origenesArray);

    app.use(cors({
        credentials: true,
        origin(origin, callback) {
            // Peticiones servidor a servidor o herramientas tipo Postman
            if (!origin) {
                return callback(null, true);
            }

            const normalizado = origin.replace(/\/+$/, "");

            if (process.env.CORS_ORIGINS === "*" || origenesPermitidos.has(normalizado)) {
                return callback(null, true);
            }

            console.warn(`[CORS] Rechazado: "${origin}". Permitidos: ${[...origenesPermitidos].join(", ") || "(ninguno)"}`);
            return callback(new Error("No permitido por CORS"), false);
        },
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    }));

    if(ISPRODUCTION){
        app.use(helmet())
    }else{
        app.use(helmet({hsts:false}))
    }
    app.use(express.json({ limit: "100kb" }));
    app.use(cookieParser());

    // rutas




    // server
    const server = app.listen(PORT, HOST, () => {
        console.log(`[SERVER] funcionando en ${HOST}:${PORT}`);
    });

    const apagar = async(senal:string):Promise<void>=>{
        console.log(`\n[SERVER] ${senal} recibido, cerrando procesos`);
        // aqui se supone que voy a cerrar procesos
        server.close(async()=>{
            if(AppDataSource.isInitialized){
                await AppDataSource.destroy();
                console.log("[DATABASE] Conexión a Base de Datos cerrada.");
            }
            process.exit(0);
        });
        
    }

    process.on("SIGINT",()=> void apagar("SIGINT"));
    process.on("SIGTERM",()=> void apagar("SIGTERM"));
};

main().catch((error:unknown) => {

    // este me salva y me tira bien los errores que me arroja la db
    if(error instanceof AggregateError){
        console.error(`[SERVER ERROR]: Se produjeron múltiples fallos (${error.errors.length}):`);
        error.errors.forEach((subError, index) => {
            if (subError instanceof Error) {
                console.error(`  ${index + 1}. ${subError.message}`);
            } else {
                console.error(`  ${index + 1}.`, subError);
            }
        });
    }
    else if(error instanceof Error){
        console.error(`[SERVER ERROR]: ${error.stack || error.message}`);
    }
    else{
        console.error(`[SERVER ERROR Desconocido]`,error);
    }

    process.exit(1);
});