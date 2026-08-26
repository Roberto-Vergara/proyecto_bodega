

export class DomainError extends Error{
    constructor(message:string){
        super(message);
        this.name = "DomainError";
    }
}

export class NotFoundError extends DomainError{
    constructor(message:string){
        super(message);
        this.name = "NotFoundError";
    }
}

export class ConflictError extends DomainError {
    constructor(message: string) {
        super(message);
        this.name = "ConflictError";
    }
}

export class ValidationError extends DomainError {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

// 401: no se pudo identificar al usuario (credenciales malas, token vencido, etc)
export class UnauthorizedError extends DomainError {
    constructor(message: string = "No autenticado") {
        super(message);
        this.name = "UnauthorizedError";
    }
}

// 403: si sabemos quien es, pero no le alcanza el rol
export class ForbiddenError extends DomainError {
    constructor(message: string = "No tienes permisos para esta acción") {
        super(message);
        this.name = "ForbiddenError";
    }
}
