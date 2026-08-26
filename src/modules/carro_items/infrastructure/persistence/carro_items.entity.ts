import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
} from "typeorm";
import { CarroEntity } from "../../../carros/infrastructure/persistence/carro.entity.js";
import { UserEntity } from "../../../users/infrastructure/persistence/user.entity.js";
import { VentasLogEntity } from "../../../ventas_log/infrastructure/persistence/ventas_log.entity.js";


// Un mismo item de venta no puede estar dos veces ACTIVO en el mismo carro:
// si el operario carga mas unidades del mismo item, se suma a la fila que ya existe.
// Es un indice parcial (WHERE despachado_en IS NULL) para que el historico de
// despachos anteriores no choque con la carga actual.
@Index(
    "uq_carro_item_activo",
    ["carro_id", "cod_venta", "nro_item"],
    { unique: true, where: '"despachado_en" IS NULL' },
)
// consultas tipicas: "que lleva este carro" y "donde esta este item"
@Index("idx_carro_items_carro", ["carro_id"])
@Index("idx_carro_items_venta_item", ["cod_venta", "nro_item"])
@Check("chk_cantidad_asignada_positiva", '"cantidad_asignada" > 0')
@Entity("carro_items")
export class CarroItemsEntity{

    @PrimaryColumn({type:"uuid"})
    id!:string;

    @Column({type:"uuid"})
    carro_id!:string;

    @Column({type:"int"})
    cod_venta!:number;

    @Column({type:"int"})
    nro_item!:number;

    // cuantas unidades de ese item van en ESTE carro
    @Column({type:"int"})
    cantidad_asignada!:number;

    // ---------------------------------------------------------------
    // snapshot de DB2 al momento de cargar el carro.
    // permite mostrar y validar el contenido sin volver a consultar el AS400
    // ---------------------------------------------------------------

    @Column({type:"varchar",length:15})
    cod_item!:string;

    // LIDIM1/2/3 son DECIMAL(7,0) en DB2: enteros, en milimetros
    @Column({type:"int"})
    dim1!:number;

    @Column({type:"int"})
    dim2!:number;

    @Column({type:"int"})
    dim3!:number;

    // LIMARK CHAR(24). NO es unica: dos items distintos pueden compartir marca
    @Column({type:"varchar",length:24,nullable:true})
    marca_pieza!:string|null;

    // LIQYOR: cuantas unidades se vendieron en total de este item.
    // es lo que permite calcular PARCIAL/COMPLETO_EN_CARRO y validar que no
    // se asigne mas de lo vendido
    @Column({type:"int"})
    cantidad_total_item!:number;

    // ---------------------------------------------------------------

    @CreateDateColumn({name:"fecha_asignacion",type:"timestamp"})
    fecha_asignacion!:Date;

    // soft delete: al despachar se marca la fecha y la fila queda de historico
    @Column({type:"timestamp",nullable:true})
    despachado_en!:Date|null;

    @Column({type:"uuid",nullable:true})
    asignado_por!:string|null;

    // --- relaciones ---

    @ManyToOne(()=>CarroEntity,(carro)=>carro.items,{onDelete:"CASCADE"})
    @JoinColumn({name:"carro_id"})
    carro!:CarroEntity;

    // apunta a ventas_log.cod_venta (que es unique), no al uuid:
    // asi la fila se lee sola y no hay que hacer un join extra para saber la nota de venta
    @ManyToOne(()=>VentasLogEntity,(venta)=>venta.items,{onDelete:"RESTRICT"})
    @JoinColumn({name:"cod_venta",referencedColumnName:"cod_venta"})
    venta!:VentasLogEntity;

    // trazabilidad: quien cargo estos vidrios. SET NULL para no perder el
    // historico si algun dia se borra el usuario
    @ManyToOne(()=>UserEntity,{onDelete:"SET NULL",nullable:true})
    @JoinColumn({name:"asignado_por"})
    usuario!:UserEntity|null;
}
