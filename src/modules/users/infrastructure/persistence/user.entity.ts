import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Area, UserRole } from "../../domain/user.domain.js";



@Entity("usuarios")
export class UserEntity{
    @PrimaryColumn({type:"uuid"})
    id!:string;

    @Column("varchar",{length:100})
    nombre!:string;

    @Column("varchar",{length:100})
    apellido!:string;

    // unico a nivel de base de datos: es la ultima linea de defensa contra emails repetidos
    // si dos requests entran a la vez, la validacion del caso de uso no alcanza
    @Index({unique:true})
    @Column("varchar",{length:150})
    email!:string;

    @Column("varchar",{length:256})
    passHash!:string;

    @Column("boolean",{default:true})
    primera_password!:boolean;

    @Column({
        type:"enum",
        enum:UserRole,
        default:UserRole.EMPLOYEE
    })
    role!:UserRole;


    @Column({
        // estaba apuntando a UserRole por copy/paste: la columna area guardaba
        // los valores del enum equivocado
        type:"enum",
        enum:Area,
        default:Area.GENERAL
    })
    area!:Area;

    @Column("boolean",{default:true})
    isActive!:boolean

    @CreateDateColumn({name:"creado_en",type:"timestamp"})
    creadoEn!:Date;

    @UpdateDateColumn({ name: "actualizado_en", type: "timestamp" })
    actualizadoEn!: Date;

}
