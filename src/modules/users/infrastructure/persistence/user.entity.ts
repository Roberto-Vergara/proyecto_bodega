import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Area, UserRole } from "../../domain/user.domain.js";


@Entity("usuarios")
export class UserEntity{
    // varchar(36) y no uniqueidentifier a proposito: SQL Server devuelve los
    // GUID en MAYUSCULAS, y nosotros los generamos en minusculas con uuid v4.
    // Ese ida y vuelta rompe cualquier comparacion de strings en JS (===, o
    // buscar en un Map por id). Con varchar el id que guardamos es el mismo
    // que leemos, byte por byte
    @PrimaryColumn({type:"varchar",length:36})
    id!:string;

    // nvarchar en vez de varchar: los nombres llevan tildes y ñ, y asi no
    // dependemos de la collation que tenga el servidor
    @Column("nvarchar",{length:100})
    nombre!:string;

    @Column("nvarchar",{length:100})
    apellido!:string;

    // unico a nivel de base de datos: es la ultima linea de defensa contra emails repetidos
    // si dos requests entran a la vez, la validacion del caso de uso no alcanza
    @Index({unique:true})
    @Column("varchar",{length:150})
    email!:string;

    // el hash de bcrypt es ASCII puro
    @Column("varchar",{length:256})
    passHash!:string;

    @Column("bit",{default:true})
    primera_password!:boolean;

    // SQL Server no tiene tipo enum. "simple-enum" lo guarda como varchar y
    // TypeORM crea el CHECK constraint con los valores validos
    @Column({
        type:"simple-enum",
        enum:UserRole,
        default:UserRole.EMPLOYEE
    })
    role!:UserRole;


    @Column({
        // estaba apuntando a UserRole por copy/paste: la columna area guardaba
        // los valores del enum equivocado
        type:"simple-enum",
        enum:Area,
        default:Area.GENERAL
    })
    area!:Area;

    @Column("bit",{default:true})
    isActive!:boolean

    // datetime2 y NO timestamp: en SQL Server "timestamp" es un rowversion
    // binario, no una fecha. Es una de las trampas clasicas al migrar
    @CreateDateColumn({name:"creado_en",type:"datetime2"})
    creadoEn!:Date;

    @UpdateDateColumn({ name: "actualizado_en", type: "datetime2" })
    actualizadoEn!: Date;

}
