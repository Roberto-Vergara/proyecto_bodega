import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Area, UserRole } from "../../domain/user.domain.js";



@Entity("usuarios")
export class UsuarioEntity{
    @PrimaryColumn({type:"uuid"})
    id!:string;

    @Column("varchar",{length:30})
    nombre!:string;

    @Column("varchar",{length:30})
    apellido!:string;

    @Column("varchar",{length:50})
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
        type:"enum",
        enum:UserRole,
    })
    area!:Area;

    @Column("boolean",{default:true})
    isActive!:boolean

    @CreateDateColumn({name:"creado_en",type:"timestamp"})
    creadoEn!:Date;

    @UpdateDateColumn({ name: "actualizado_en", type: "timestamp" })
    actualizadoEn!: Date;

}