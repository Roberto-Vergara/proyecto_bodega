import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { CarroEntity } from "../../../carros/infrastructure/persistence/carro.entity.js";
import { UserEntity } from "../../../users/infrastructure/persistence/user.entity.js";
import { TipoMovimiento } from "../../domain/movimiento.domain.js";


// serializa/deserializa el detalle a mano. El parse va en try/catch porque la
// bitacora se lee mucho y un JSON corrupto no puede tumbar la consulta entera
const detalleJson = {
    to(valor:Record<string,unknown>|null):string|null{
        return valor === null || valor === undefined ? null : JSON.stringify(valor);
    },
    from(valor:string|null):Record<string,unknown>|null{
        if(valor === null || valor === undefined) return null;

        try {
            return JSON.parse(valor) as Record<string,unknown>;
        } catch {
            return null;
        }
    },
};


// el dashboard va a consultar sobre todo por carro y por venta, y siempre
// ordenado por fecha: por eso los indices compuestos
@Index("idx_mov_carro_fecha", ["carro_id", "creado_en"])
@Index("idx_mov_destino_fecha", ["carro_destino_id", "creado_en"])
@Index("idx_mov_venta_fecha", ["cod_venta", "creado_en"])
@Index("idx_mov_fecha", ["creado_en"])
@Index("idx_mov_lote", ["lote_id"])
@Entity("movimientos_carro")
export class MovimientoEntity{

    @PrimaryColumn({type:"varchar",length:36})
    id!:string;

    // todas las filas nacidas de una misma llamada comparten este id
    @Column({type:"varchar",length:36})
    lote_id!:string;

    // SQL Server no tiene enum nativo
    @Column({type:"simple-enum",enum:TipoMovimiento})
    tipo!:TipoMovimiento;

    @Column({type:"varchar",length:36,nullable:true})
    carro_id!:string|null;

    // denormalizado: si se borra el carro, el log sigue siendo legible
    @Column({type:"int",nullable:true})
    nro_carro!:number|null;

    @Column({type:"varchar",length:36,nullable:true})
    carro_destino_id!:string|null;

    @Column({type:"int",nullable:true})
    nro_carro_destino!:number|null;

    @Column({type:"int",nullable:true})
    cod_venta!:number|null;

    @Column({type:"int",nullable:true})
    nro_item!:number|null;

    @Column({type:"varchar",length:15,nullable:true})
    cod_item!:string|null;

    @Column({type:"int",nullable:true})
    cantidad!:number|null;

    // contexto libre segun el tipo de evento.
    //
    // era jsonb en postgres. SQL Server 2012 no tiene tipo JSON (llego en 2016),
    // asi que se guarda como texto. No se usa "simple-json" de TypeORM porque
    // en mssql lo mapea a ntext, que Microsoft tiene deprecado desde 2005;
    // nvarchar(MAX) hace lo mismo y no esta condenado a desaparecer.
    // Se pierde poder filtrar por dentro con SQL, pero en 2012 tampoco se podia
    @Column({type:"nvarchar",length:"MAX",nullable:true,transformer:detalleJson})
    detalle!:Record<string,unknown>|null;

    @Column({type:"varchar",length:36,nullable:true})
    usuario_id!:string|null;

    @CreateDateColumn({name:"creado_en",type:"datetime2"})
    creado_en!:Date;

    // --- relaciones ---
    // NO ACTION en todas: SQL Server no acepta multiples caminos de cascada
    // hacia la misma tabla (carros aparece dos veces aca). Igual el log NO
    // debe borrarse cuando se borra un carro: un log que desaparece no sirve

    @ManyToOne(()=>CarroEntity,{onDelete:"NO ACTION",nullable:true})
    @JoinColumn({name:"carro_id"})
    carro!:CarroEntity|null;

    @ManyToOne(()=>CarroEntity,{onDelete:"NO ACTION",nullable:true})
    @JoinColumn({name:"carro_destino_id"})
    carroDestino!:CarroEntity|null;

    @ManyToOne(()=>UserEntity,{onDelete:"NO ACTION",nullable:true})
    @JoinColumn({name:"usuario_id"})
    usuario!:UserEntity|null;
}
