import { Router } from "express";

import { authMiddleware } from "../../../auth/infrastructure/http/auth.middleware.js";
import { requireRole } from "../../../auth/infrastructure/http/require-role.middleware.js";
import {
    activarUserUseCase,
    createUserUseCase,
    desactivarUserUseCase,
    findUserByIdUseCase,
    getAllUsersUseCase,
    resetearPasswordUseCase,
    tokenService,
    updateUserUseCase,
} from "../../../shared/infrastructure/container.js";
import { UserRole } from "../../domain/user.domain.js";
import { UserController } from "./user.controller.js";

const router: Router = Router();

const userController = new UserController(
    createUserUseCase,
    getAllUsersUseCase,
    findUserByIdUseCase,
    updateUserUseCase,
    desactivarUserUseCase,
    activarUserUseCase,
    resetearPasswordUseCase,
);

// todo /users exige sesion valida
router.use(authMiddleware(tokenService));

const soloAdmin = requireRole(UserRole.ADMIN);

router.post("/", soloAdmin, userController.crear);
router.get("/", soloAdmin, userController.listar);
router.delete("/:id", soloAdmin, userController.desactivar);
// volver a habilitar a alguien que se desactivo por error
router.patch("/:id/activar", soloAdmin, userController.activar);
// clave temporal para quien la olvido (en planta no hay correo para recuperarla)
router.post("/:id/resetear-password", soloAdmin, userController.resetearPassword);

// estas dos dejan pasar tambien al dueño de la cuenta;
// el chequeo fino (admin o yo mismo) esta dentro del controlador
router.get("/:id", userController.obtener);
router.patch("/:id", userController.actualizar);

export default router;
