import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserEntity } from "../../../users/infrastructure/persistence/user.entity.js";


@Entity("refresh_tokens")
export class RefreshTokenEntity{

    @PrimaryGeneratedColumn("uuid")
    id!:string;

    // sha256 en hex = 64 caracteres fijos
    @Index({unique:true})
    @Column({type:"varchar",length:64})
    tokenHash!:string;

    @Index()
    @Column({ type: "uuid" })
    userId!: string;

    @Column({ type: "timestamp" })
    expiresAt!: Date;

    @Column({ type: "boolean", default: false })
    revoked!: boolean;

    @Column({ type: "timestamp", nullable: true })
    revokedAt!: Date | null;

    @Column({ type: "varchar", length: 255, nullable: true })
    deviceInfo!: string | null; // util para "cerrar sesión en todos los dispositivos"

    @CreateDateColumn()
    createdAt!: Date;

    @ManyToOne(()=>UserEntity,{onDelete:"CASCADE"})
    @JoinColumn({name:"userId"})
    user!:UserEntity;
}
