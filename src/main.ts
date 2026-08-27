import "reflect-metadata";
import "dotenv/config";
import express from "express";
import cors from "cors";

import { envConfig, ventasSource } from "./config/env.config.js";

import { AppDataSource } from "./modules/shared/infrastructure/database/data-source.js";
import helmet from "helmet";
import { errorHandler } from "./modules/shared/infrastructure/http/error-handler.middleware.js";
import { notFoundHandler } from "./modules/shared/infrastructure/http/not-found.middleware.js";
import { reconciliarOcupacionesUseCase, refreshTokenRepository } from "./modules/shared/infrastructure/container.js";


// rutas
import carroRoutes from "./modules/carros/infrastructure/http/carro.route.js";
import authRoutes from "./modules/auth/infrastructure/http/auth.route.js";
import userRoutes from "./modules/users/infrastructure/http/user.route.js";
import ventaRoutes from "./modules/ventas_log/infrastructure/http/venta.route.js";
import movimientoRoutes from "./modules/movimientos/infrastructure/http/movimiento.route.js";

const { PORT, HOST,ISPRODUCTION,TRUST_PROXY } = envConfig();

const app = express();

// cada 6 horas borramos los refresh tokens vencidos para que la tabla no crezca infinito
const LIMPIEZA_TOKENS_MS = 6 * 60 * 60 * 1000;

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
        // ya no usamos cookies: el token viaja en el header Authorization,
        // asi que no hace falta credentials:true (y ademas eso choca con origin:*)
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

    // Detras de Cloudflare, TODAS las peticiones llegan con la IP de Cloudflare.
    // Si no confiamos en el proxy, req.ip es siempre la misma y el rate limit
    // del login pasa de ser "por usuario" a ser global: 10 intentos fallidos de
    // cualquiera y se bloquea la planta entera.
    //
    // TRUST_PROXY dice cuantos saltos de proxy hay antes de nosotros. Es un
    // numero y no "true" a proposito: confiar en toda la cadena deja que
    // cualquiera falsee su IP mandando un X-Forwarded-For inventado y se salte
    // el limite. Cloudflare solo -> 1. Cloudflare + nginx -> 2.
    app.set("trust proxy", TRUST_PROXY);

    app.use(express.json({ limit: "100kb" }));

    // healthcheck, util para monitoreo y para probar rapido desde postman
    app.get("/health", (_req, res) => {
        res.status(200).json({ status: "ok", uptime: process.uptime(), ventas_source: ventasSource() });
    });

    // rutas
    app.use("/carros",carroRoutes);
    app.use("/auth",authRoutes);
    app.use("/users",userRoutes);
    app.use("/ventas",ventaRoutes);
    app.use("/movimientos",movimientoRoutes);

    // ruta inexistente -> 404 en json, no el html feo por defecto de express
    app.use(notFoundHandler);

    // tiene que ir despues de todas las rutas porque la idea es que si pasa algo salten aqui
    // el catch las manda con un next a la siguiente funcion y este caso es un middleware
    // que controla erroes
    app.use(errorHandler);


    // server
    const server = app.listen(PORT, HOST, () => {
        console.log(`[SERVER] funcionando en ${HOST}:${PORT}`);
    });

    // limpieza de refresh tokens vencidos. unref() para que no bloquee el cierre del proceso
    const limpiarTokens = async (): Promise<void> => {
        try {
            const borrados = await refreshTokenRepository.deleteExpired();
            if (borrados > 0) {
                console.log(`[AUTH] ${borrados} refresh tokens vencidos eliminados`);
            }
        } catch (error) {
            console.error("[AUTH] Error limpiando refresh tokens:", error);
        }
    };

    // la ocupacion de los carros es un cache de carro_items. Si alguien toco la
    // base a mano, aca queda derecho antes de atender la primera peticion
    try {
        const corregidos = await reconciliarOcupacionesUseCase.execute();
        if (corregidos > 0) {
            console.log(`[CARROS] ${corregidos} carros tenian la ocupacion desincronizada, corregidos`);
        }
    } catch (error) {
        // que no impida arrancar: es una correccion, no un requisito
        console.error("[CARROS] No se pudo reconciliar la ocupacion:", error);
    }

    void limpiarTokens();
    const intervaloLimpieza = setInterval(() => void limpiarTokens(), LIMPIEZA_TOKENS_MS);
    intervaloLimpieza.unref();

    const apagar = async(senal:string):Promise<void>=>{
        console.log(`\n[SERVER] ${senal} recibido, cerrando procesos`);
        clearInterval(intervaloLimpieza);
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
