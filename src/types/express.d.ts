import type { TokenPayload } from "../modules/shared/domain/token.port.js";

// declaration merging: le agregamos "user" al Request de express para que
// authMiddleware pueda dejar ahi el payload del token y los controladores lo lean tipado.
// hacerlo aca (y no con una interfaz propia) evita pelear con los tipos de RequestHandler
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export {};
