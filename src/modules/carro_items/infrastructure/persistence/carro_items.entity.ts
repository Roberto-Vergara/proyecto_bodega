import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CarroEntity } from "../../../carros/infrastructure/persistence/carro.entity.js";
import { VentasLog } from "../../../ventas_log/infrastructure/persistence/ventas_log.entity.js";
import { CreateDateColumn } from "typeorm/browser";



@Entity("carro_items")
export class CarroItemsEntity{

    @PrimaryGeneratedColumn("uuid")
    id!:string;

    @Column("int")
    carrito_id!: number;

    @Column("int")
    cod_venta!:number;

    @Column("int")
    nro_item!:number;

    @Column("int")
    cantidad_asignada!:number;

    @CreateDateColumn({ type: 'timestamp' })
    fecha_asignacion!: Date;

    // aqui rompimos la regla de unica responsabilidad y nos estamos acoplando a la existencia de otra tabla osea que dependemos ahora
    // pero ya niai, despues se resuelve
    @ManyToOne(() => CarroEntity, (carro) => carro.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'carro_id' })
    carro!: CarroEntity;

    @ManyToOne(() => VentasLog, (venta) => venta.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cod_venta' })
    venta!: VentasLog;
}