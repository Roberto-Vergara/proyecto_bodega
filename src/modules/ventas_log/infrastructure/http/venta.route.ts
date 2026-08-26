import { Router } from "express";

import { authMiddleware } from "../../../auth/infrastructure/http/auth.middleware.js";
import {
    buscarVentaUseCase,
    despacharVentaUseCase,
    obtenerDistribucionVentaUseCase,
    tokenService,
} from "../../../shared/infrastructure/container.js";
import { VentaController } from "./venta.controller.js";

const router: Router = Router();

const ventaController = new VentaController(
    buscarVentaUseCase,
    obtenerDistribucionVentaUseCase,
    despacharVentaUseCase,
);

// consultar ventas exige sesion: son datos comerciales del cliente
router.use(authMiddleware(tokenService));

// GET /ventas/777777          -> la venta completa
// GET /ventas/777777?nroItem=3 -> solo ese item
router.get("/:codVenta", ventaController.buscar);

// donde esta repartida la venta. NO toca DB2: responde aunque el AS400 este caido
router.get("/:codVenta/distribucion", ventaController.distribucion);

// cierra el ciclo: los vidrios salieron y los carros se liberan
router.post("/:codVenta/despachar", ventaController.despachar);

export default router;
