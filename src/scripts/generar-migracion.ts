import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Genera una migracion y le arregla los imports.
 *
 * Envuelve al CLI de TypeORM porque la plantilla que usa emite:
 *
 *   import { MigrationInterface, QueryRunner } from "typeorm";
 *
 * y las dos cosas son TIPOS. Con "verbatimModuleSyntax" prendido, TypeScript
 * deja ese import vivo en el JS compilado, y en ESM revienta al arrancar:
 *
 *   SyntaxError: The requested module 'typeorm' does not provide an export
 *   named 'MigrationInterface'
 *
 * En vez de acordarse de cambiarlo a mano cada vez, se corrige aca.
 *
 *   pnpm migration:generate NombreDelCambio
 */
const CARPETA = "src/migrations";

const nombre = process.argv[2];

if (!nombre) {
    console.error("Falta el nombre. Ejemplo: pnpm migration:generate AgregarColumnaX");
    process.exit(1);
}

const antes = new Set(readdirSync(CARPETA));

const resultado = spawnSync(
    process.execPath,
    [
        "./node_modules/tsx/dist/cli.mjs",
        "./node_modules/typeorm/cli.js",
        "-d",
        "src/modules/shared/infrastructure/database/data-source.ts",
        "migration:generate",
        join(CARPETA, nombre),
    ],
    { stdio: "inherit" },
);

if (resultado.status !== 0) {
    process.exit(resultado.status ?? 1);
}

const nuevos = readdirSync(CARPETA).filter((f) => !antes.has(f));

for (const archivo of nuevos) {
    const ruta = join(CARPETA, archivo);
    const contenido = readFileSync(ruta, "utf8");

    const arreglado = contenido.replace(
        'import { MigrationInterface, QueryRunner } from "typeorm";',
        'import type { MigrationInterface, QueryRunner } from "typeorm";',
    );

    if (arreglado !== contenido) {
        writeFileSync(ruta, arreglado, "utf8");
        console.log(`[MIGRACION] ${archivo}: import corregido a "import type"`);
    }
}
