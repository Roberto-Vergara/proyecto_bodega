import { Column, Entity, Index, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { CarroItemsEntity } from "../../../carro_items/infrastructure/persistence/carro_items.entity.js";


@Entity("ventas_log")
export class VentasLogEntity{
    @PrimaryColumn({type:"uuid"})
    id!:string;

    // unico porque es la llave natural que viene de DB2 (OHORDÑ) y porque
    // carro_items apunta aca por cod_venta, no por el uuid
    @Index({unique:true})
    @Column({type:"int"})
    cod_venta!:number;

    // los largos salen de los tipos reales de FOMHDR:
    // OHSNME CHAR(30), OHCSTÑ CHAR(8), OHREPÑ CHAR(5), OHSHIN CHAR(40)
    @Column({type:"varchar",length:30})
    nom_cliente!:string;

    @Column({type:"varchar",length:8,nullable:true})
    rut_cliente!:string|null;

    @Column({type:"varchar",length:5,nullable:true})
    id_vendedor!:string|null;

    // en DB2 OHDAOR es NUMERIC(6,0) con formato YYMMDD (ej: 260120).
    // el adapter la convierte a fecha real antes de llegar aca
    @Column({type:"date",nullable:true})
    fecha_orden!:Date|null;

    @Column({type:"varchar",length:40,nullable:true})
    instrucciones!:string|null;

    // se espeja pero no se usa en ningun calculo (ver venta-log.domain.ts)
    @Column({type:"numeric",precision:11,scale:2,nullable:true})
    monto_total!:string|null;

    // cuando fue la ultima vez que sincronizamos contra DB2
    @UpdateDateColumn({name:"ultima_consulta",type:"timestamp"})
    ultima_consulta!:Date;

    @OneToMany(()=>CarroItemsEntity,(item)=>item.venta)
    items!:CarroItemsEntity[];
}
