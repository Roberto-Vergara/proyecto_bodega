import "reflect-metadata";
import "dotenv/config";

import { AppDataSource } from "../modules/shared/infrastructure/database/data-source.js";
import { createUserUseCase, userRepository } from "../modules/shared/infrastructure/container.js";
import { Area, UserRole } from "../modules/users/domain/user.domain.js";

/**
 * Crea el primer usuario admin.
 *
 * Hace falta porque POST /users exige rol admin: sin esto no hay forma de
 * arrancar (no existe ningún admin que pueda crear al primer admin).
 *
 *   pnpm seed:admin
 *   pnpm seed:admin admin@bodega.cl Clave1234 Roberto Vergara
 */
const [, , emailArg, passwordArg, nombreArg, apellidoArg] = process.argv;

const email = emailArg ?? "admin@bodega.cl";
const password = passwordArg ?? "Admin1234";
const nombre = nombreArg ?? "Admin";
const apellido = apellidoArg ?? "Bodega";

async function main(): Promise<void> {
    await AppDataSource.initialize();

    const existente = await userRepository.findByEmail(email);

    if (existente) {
        console.log(`[SEED] El usuario ${email} ya existe (id: ${existente.id}). No se hace nada.`);
        return;
    }

    const user = await createUserUseCase.execute({
        nombre,
        apellido,
        email,
        password,
        role: UserRole.ADMIN,
        area: Area.GENERAL,
    });

    console.log("[SEED] Admin creado:");
    console.log(`  id:       ${user.id}`);
    console.log(`  email:    ${user.email}`);
    console.log(`  password: ${password}`);
    console.log("[SEED] Cambia esa clave apenas puedas.");
}

main()
    .catch((error: unknown) => {
        console.error("[SEED ERROR]", error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    });
