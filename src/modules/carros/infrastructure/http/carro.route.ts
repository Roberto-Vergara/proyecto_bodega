import { Router } from "express";

import { authMiddleware } from "../../../auth/infrastructure/http/auth.middleware.js";
import { requireRole } from "../../../auth/infrastructure/http/require-role.middleware.js";
import {
    actualizarCarroUseCase,
    asignarItemsACarroUseCase,
    crearCarroUseCase,
    listarCarrosUseCase,
    listarMovimientosUseCase,
    moverItemsEntreCarrosUseCase,
    obtenerContenidoCarroUseCase,
    quitarItemsDeCarroUseCase,
    tokenService,
    vaciarCarroUseCase,
} from "../../../shared/infrastructure/container.js";
import { UserRole } from "../../../users/domain/user.domain.js";
import { MovimientoController } from "../../../movimientos/infrastructure/http/movimiento.controller.js";
import { CarroController } from "./carro.controller.js";

const router: Router = Router();

const carroController = new CarroController(
    crearCarroUseCase,
    obtenerContenidoCarroUseCase,
    asignarItemsACarroUseCase,
    moverItemsEntreCarrosUseCase,
    quitarItemsDeCarroUseCase,
    listarCarrosUseCase,
    actualizarCarroUseCase,
    vaciarCarroUseCase,
);

const movimientoController = new MovimientoController(listarMovimientosUseCase);

// toda la operacion de carros exige sesion
router.use(authMiddleware(tokenService));

// dar de alta un carro es administracion de flota, no operacion diaria
router.post("/", requireRole(UserRole.ADMIN), carroController.crear);

// ?estado= &ocupacion= &ubicacion=
router.get("/", carroController.listar);

router.get("/:id", carroController.obtener);
// marcar LLENO / DISPONIBLE / FUERA_SERVICIO, o cambiar de ubicacion
router.patch("/:id", carroController.actualizar);
router.post("/:id/items", carroController.asignarItems);
router.post("/:id/items/:carroItemId/mover", carroController.moverItems);
// ?cantidad= para sacar solo una parte; sin el, se saca todo el item
router.delete("/:id/items/:carroItemId", carroController.quitarItems);

// saca todo el contenido de una y lo devuelve en la respuesta
router.post("/:id/vaciar", carroController.vaciar);

// historial del carro: incluye los movimientos donde fue destino
router.get("/:id/movimientos", movimientoController.porCarro);

export default router;
