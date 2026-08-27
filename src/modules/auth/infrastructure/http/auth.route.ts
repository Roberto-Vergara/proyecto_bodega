import { Router } from "express";

import {
    cambiarPasswordUseCase,
    findUserByIdUseCase,
    loginUseCase,
    logoutAllUseCase,
    logoutUseCase,
    refreshTokenUseCase,
    tokenService,
} from "../../../shared/infrastructure/container.js";
import { rateLimit } from "../../../shared/infrastructure/http/rate-limit.middleware.js";
import { AuthController } from "./auth.controller.js";
import { authMiddleware } from "./auth.middleware.js";

const router: Router = Router();

const authController = new AuthController(
    loginUseCase,
    refreshTokenUseCase,
    logoutUseCase,
    logoutAllUseCase,
    findUserByIdUseCase,
    cambiarPasswordUseCase,
);

const requireAuth = authMiddleware(tokenService);

// freno de fuerza bruta: 10 intentos de login cada 15 min por IP+email.
// va por email tambien para que un atacante no evite el limite rotando correos
const loginLimiter = rateLimit({
    ventanaMs: 15 * 60 * 1000,
    maximo: 10,
    mensaje: "Demasiados intentos de inicio de sesión, intenta más tarde",
    clave: (req) => {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const email = typeof body["email"] === "string" ? body["email"].toLowerCase() : "";
        return `${req.ip ?? "desconocido"}|${email}`;
    },
});

// el refresh tambien se limita: es el endpoint que entrega tokens nuevos
const refreshLimiter = rateLimit({
    ventanaMs: 15 * 60 * 1000,
    maximo: 60,
});

// --- publicas ---
router.post("/login", loginLimiter, authController.login);
router.post("/refresh", refreshLimiter, authController.refresh);
// logout es publico porque solo necesita el refresh token:
// si el access token ya venció, igual tienes que poder cerrar sesión
router.post("/logout", authController.logout);

// --- protegidas ---
router.get("/me", requireAuth, authController.me);
router.post("/logout-all", requireAuth, authController.logoutAll);
// el propio usuario cambia su clave (pide la actual). Revoca todas las sesiones
router.post("/cambiar-password", requireAuth, authController.cambiarPassword);

export default router;
