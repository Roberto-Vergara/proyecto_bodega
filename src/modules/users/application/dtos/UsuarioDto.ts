import type { Area, UserRole } from "../../domain/user.domain.js";



export interface CrearUsuarioDto{
    nombre:string;
    apellido:string;
    email:string;
    password:string;
    role:UserRole;
    area:Area;
}

export interface AutenticarUsuarioDto{
    email:string;
    password:string;
}


// los ? significa que pueden venir o no(opcionales en pocas palabras)
export interface UpdateUserDto{
    id:string;
    nombre?:string;
    apellido?:string;
    email?:string;
}