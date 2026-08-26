import { Router } from "express";

import { authMiddleware } from "../../../auth/infrastructure/http/auth.middleware.js";
import { requireRole } from "../../../auth/infrastructure/http/require-role.middleware.js";
import {
    createUserUseCase,
    desactivarUserUseCase,
    findUserByIdUseCase,
    getAllUsersUseCase,
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
);

// todo /users exige sesion valida
router.use(authMiddleware(tokenService));

const soloAdmin = requireRole(UserRole.ADMIN);

router.post("/", soloAdmin, userController.crear);
router.get("/", soloAdmin, userController.listar);
router.delete("/:id", soloAdmin, userController.desactivar);

// estas dos dejan pasar tambien al dueño de la cuenta;
// el chequeo fino (admin o yo mismo) esta dentro del controlador
router.get("/:id", userController.obtener);
router.patch("/:id", userController.actualizar);

export default router;
