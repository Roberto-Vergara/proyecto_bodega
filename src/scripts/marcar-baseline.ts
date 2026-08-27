import "dotenv/config";
import { readdirSync } from "node:fs";
import sql from "mssql";

/**
 * Marca la migracion base como ya aplicada, sin ejecutarla.
 *
 * Se usa UNA sola vez, en bases que ya tienen el esquema creado (la de
 * produccion se creo con synchronize antes de adoptar migraciones). Si se
 * corriera migration:run sin esto, TypeORM intentaria CREATE TABLE sobre
 * tablas que ya existen y fallaria.
 *
 * En una base nueva y vacia NO se usa: ahi corresponde migration:run normal.
 */
const archivo = readdirSync("src/migrations").find((f) => f.includes("Baseline"));

if (!archivo) {
    throw new Error("No se encontro la migracion Baseline en src/migrations");
}

const timestamp = Number(archivo.split("-")[0]);
const nombre = `Baseline${timestamp}`;

const pool = await sql.connect({
    server: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT) || 1433,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: {
        encrypt: process.env.DB_ENCRYPT === "true",
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
        enableArithAbort: true,
        cryptoCredentialsDetails: { minVersion: "TLSv1" },
    },
});

// misma forma que la tabla que crea TypeORM
await pool.request().batch(`
    IF OBJECT_ID('migraciones') IS NULL
        CREATE TABLE "migraciones" (
            "id" int IDENTITY(1,1) NOT NULL,
            "timestamp" bigint NOT NULL,
            "name" varchar(255) NOT NULL,
            CONSTRAINT "PK_migraciones" PRIMARY KEY ("id")
        )
`);

const existe = await pool.request()
    .input("nombre", sql.VarChar, nombre)
    .query(`SELECT COUNT(*) AS n FROM "migraciones" WHERE "name" = @nombre`);

if (existe.recordset[0].n > 0) {
    console.log(`[BASELINE] ${nombre} ya estaba marcada. No se hizo nada.`);
} else {
    await pool.request()
        .input("ts", sql.BigInt, timestamp)
        .input("nombre", sql.VarChar, nombre)
        .query(`INSERT INTO "migraciones" ("timestamp", "name") VALUES (@ts, @nombre)`);
    console.log(`[BASELINE] ${nombre} marcada como aplicada.`);
}

const todas = await pool.request().query(`SELECT "timestamp", "name" FROM "migraciones" ORDER BY "timestamp"`);
console.table(todas.recordset);

await pool.close();
