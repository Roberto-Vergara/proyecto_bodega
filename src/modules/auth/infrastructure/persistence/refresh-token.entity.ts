import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { UserEntity } from "../../../users/infrastructure/persistence/user.entity.js";


@Entity("refresh_tokens")
export class RefreshTokenEntity{

    // lo genera la app, no la base: asi no dependemos de NEWSEQUENTIALID()
    // ni de que el driver devuelva el valor insertado
    @PrimaryColumn({type:"varchar",length:36})
    id!:string;

    // sha256 en hex = 64 caracteres fijos
    @Index({unique:true})
    @Column({type:"varchar",length:64})
    tokenHash!:string;

    // varchar(36) para calzar con usuarios.id (ver comentario alla)
    @Index()
    @Column({ type: "varchar", length: 36 })
    userId!: string;

    // datetime2: en SQL Server "timestamp" es rowversion, no una fecha
    @Column({ type: "datetime2" })
    expiresAt!: Date;

    @Column({ type: "bit", default: false })
    revoked!: boolean;

    @Column({ type: "datetime2", nullable: true })
    revokedAt!: Date | null;

    @Column({ type: "nvarchar", length: 255, nullable: true })
    deviceInfo!: string | null; // util para "cerrar sesión en todos los dispositivos"

    @CreateDateColumn({type:"datetime2"})
    createdAt!: Date;

    @ManyToOne(()=>UserEntity,{onDelete:"CASCADE"})
    @JoinColumn({name:"userId"})
    user!:UserEntity;
}
