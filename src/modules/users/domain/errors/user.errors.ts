import { ConflictError, NotFoundError, UnauthorizedError } from "../../../shared/domain/errors.js";



export class UserNotFoundError extends NotFoundError{
    constructor(identifier:string){
        super(`Usuario no encontrado: ${identifier}`);
        this.name = "UserNotFoundError";
    }
}

export class EmailAlreadyExistsError extends ConflictError {
    constructor(email: string) {
        super(`El email ${email} ya está registrado`);
        this.name = "EmailAlreadyExistsError";
    }
}

// antes era un ValidationError, o sea 400. Credenciales malas son 401:
// el cliente movil necesita distinguir "mandaste mal el body" de "no estas autenticado"
export class InvalidCredentialsError extends UnauthorizedError {
    constructor() {
        super("Credenciales inválidas");
        this.name = "InvalidCredentialsError";
    }
}
