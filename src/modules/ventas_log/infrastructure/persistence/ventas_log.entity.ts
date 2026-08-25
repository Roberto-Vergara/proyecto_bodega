import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { CarroItemsEntity } from "../../../carro_items/infrastructure/persistence/carro_items.entity.js";


@Entity("ventas_log")
export class VentasLog{
    @PrimaryGeneratedColumn("increment")
    id!:number;

    @Column({type:"int"})
    cod_venta!:number;

    @Column({type:"varchar",length:100})
    nom_cliente!:string;

    @Column("date")
    fecha_orden!:Date;

    @CreateDateColumn({ type: 'timestamp' })
    ultima_consulta!: Date;

    @OneToMany(()=>CarroItemsEntity,(item)=>item.venta)
    items!:CarroItemsEntity[];
}