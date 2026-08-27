import type { NextFunction, Request, Response } from "express";

import { ForbiddenError, UnauthorizedError, ValidationError } from "../../../shared/domain/errors.js";
import type { CreateUserUseCase } from "../../application/use-cases/createUser.use-case.js";
import type { ActivarUserUseCase } from "../../application/use-cases/activarUser.use-case.js";
import type { DesactivareUserUserCase } from "../../application/use-cases/desactivateUser.use-case.js";
import type { ResetearPasswordUseCase } from "../../application/use-cases/resetearPassword.use-case.js";
import type { FindUserByIdUseCase } from "../../application/use-cases/findUserById.use-case.js";
import type { GetAllUsersUseCase } from "../../application/use-cases/getAllUsers.use-case.js";
import type { UpdateUserUseCase } from "../../application/use-cases/updateUser.use-case.js";
import { Area, UserRole, type User } from "../../domain/user.domain.js";

// nunca devolvemos passHash: el usuario sale del dominio por un unico lugar
// y asi el hash no se escapa por accidente en ningun endpoint
function aRespuesta(user:User){
    return {
        id:user.id,
        nombre:user.nombre,
        apellido:user.apellido,
        email:user.email,
        role:user.role,
        area:user.area,
        isActive:user.isActive,
        primera_password:user.primeraPassword,
        createdAt:user.createdAt,
        updatedAt:user.updatedAt,
    };
}

function leerId(req:Request):string{
    const id = req.params["id"];

    if(typeof id !== "string" || id.trim() === ""){
        throw new ValidationError("Falta el id del usuario");
    }

    return id;
}


export class UserController{
    constructor(
        private readonly createUserUseCase:CreateUserUseCase,
        private readonly getAllUsersUseCase:GetAllUsersUseCase,
        private readonly findUserByIdUseCase:FindUserByIdUseCase,
        private readonly updateUserUseCase:UpdateUserUseCase,
        private readonly desactivarUserUseCase:DesactivareUserUserCase,
        private readonly activarUserUseCase:ActivarUserUseCase,
        private readonly resetearPasswordUseCase:ResetearPasswordUseCase,
    ){}

    activar = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            await this.activarUserUseCase.execute(leerId(req));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    // el admin le pone una clave temporal a alguien que la olvido.
    // queda obligado a cambiarla en cuanto entre
    resetearPassword = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const body = (req.body ?? {}) as Record<string,unknown>;
            const nueva = body["passwordNueva"] ?? body["password_nueva"];

            if(typeof nueva !== "string"){
                throw new ValidationError("passwordNueva es obligatoria");
            }

            await this.resetearPasswordUseCase.execute({
                usuarioId: leerId(req),
                passwordNueva: nueva,
            });

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    crear = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const body = (req.body ?? {}) as Record<string,unknown>;
            const {nombre,apellido,email,password,role,area} = body;

            if(typeof nombre !== "string" || typeof apellido !== "string"){
                throw new ValidationError("nombre y apellido son obligatorios");
            }

            if(typeof email !== "string" || typeof password !== "string"){
                throw new ValidationError("email y password son obligatorios");
            }

            // los enums se validan aca: si llegan con basura, postgres reventaria
            // con un error de tipo y el cliente veria un 500 en vez de un 400
            if(!Object.values(UserRole).includes(role as UserRole)){
                throw new ValidationError(`role invalido. Validos: ${Object.values(UserRole).join(", ")}`);
            }

            if(!Object.values(Area).includes(area as Area)){
                throw new ValidationError(`area invalida. Validas: ${Object.values(Area).join(", ")}`);
            }

            const user = await this.createUserUseCase.execute({
                nombre,
                apellido,
                email,
                password,
                role: role as UserRole,
                area: area as Area,
            });

            res.status(201).json(aRespuesta(user));
        } catch (error) {
            next(error);
        }
    };

    listar = async(_req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const users = await this.getAllUsersUseCase.execute();
            res.status(200).json(users.map(aRespuesta));
        } catch (error) {
            next(error);
        }
    };

    obtener = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const id = leerId(req);
            this.verificarAccesoPropioOAdmin(req,id);

            const user = await this.findUserByIdUseCase.execute(id);
            res.status(200).json(aRespuesta(user));
        } catch (error) {
            next(error);
        }
    };

    actualizar = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const id = leerId(req);
            this.verificarAccesoPropioOAdmin(req,id);

            const body = (req.body ?? {}) as Record<string,unknown>;
            const {nombre,apellido,email} = body;

            if(nombre !== undefined && typeof nombre !== "string"){
                throw new ValidationError("nombre debe ser texto");
            }
            if(apellido !== undefined && typeof apellido !== "string"){
                throw new ValidationError("apellido debe ser texto");
            }
            if(email !== undefined && typeof email !== "string"){
                throw new ValidationError("email debe ser texto");
            }

            if(nombre === undefined && apellido === undefined && email === undefined){
                throw new ValidationError("No hay nada que actualizar");
            }

            await this.updateUserUseCase.execute({
                id,
                ...(nombre !== undefined && {nombre}),
                ...(apellido !== undefined && {apellido}),
                ...(email !== undefined && {email}),
            });

            const user = await this.findUserByIdUseCase.execute(id);
            res.status(200).json(aRespuesta(user));
        } catch (error) {
            next(error);
        }
    };

    desactivar = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const id = leerId(req);
            await this.desactivarUserUseCase.execute(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    // un employee solo puede ver/editar su propia ficha; el admin, la de cualquiera
    private verificarAccesoPropioOAdmin(req:Request,id:string):void{
        if(!req.user){
            throw new UnauthorizedError();
        }

        if(req.user.role !== UserRole.ADMIN && req.user.userId !== id){
            throw new ForbiddenError();
        }
    }
}
