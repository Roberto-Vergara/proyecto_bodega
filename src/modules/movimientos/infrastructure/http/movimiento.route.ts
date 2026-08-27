import { Router } from "express";

import { authMiddleware } from "../../../auth/infrastructure/http/auth.middleware.js";
import { listarMovimientosUseCase, tokenService } from "../../../shared/infrastructure/container.js";
import { MovimientoController } from "./movimiento.controller.js";

const router: Router = Router();

const movimientoController = new MovimientoController(listarMovimientosUseCase);

router.use(authMiddleware(tokenService));

// la bitacora completa, para el dashboard.
// ?carroId= &codVenta= &tipo= &usuarioId= &desde= &hasta= &limite= &offset=
router.get("/", movimientoController.listar);

export default router;
