import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { EstadoCarro, OcupacionCarro, UbicacionCarro } from "../../domain/carro.domain.js";
import { CarroItemsEntity } from "../../../carro_items/infrastructure/persistence/carro_items.entity.js";



@Entity("carros")
export class CarroEntity{
    // varchar(36) y no uniqueidentifier: SQL Server devuelve los GUID en
    // MAYUSCULAS y romperia las comparaciones de strings en JS
    @PrimaryColumn({type:"varchar",length:36})
    id!:string;

    @Column({type:"int",unique:true})
    nro_carro!:number;

    // SQL Server no tiene enum nativo: simple-enum lo guarda como varchar
    // y TypeORM agrega el CHECK con los valores validos

    // lo decide el operario
    @Column({
        type:"simple-enum",
        enum:EstadoCarro,
        default:EstadoCarro.DISPONIBLE
    })
    estado_carro!:EstadoCarro;

    // lo calcula el sistema a partir de carro_items
    @Column({
        type:"simple-enum",
        enum:OcupacionCarro,
        default:OcupacionCarro.VACIO
    })
    ocupacion!:OcupacionCarro;

    @Column({
        type:"simple-enum",
        enum:UbicacionCarro,
    })
    ubicacion_carro!:UbicacionCarro;

    // datetime2: "timestamp" en SQL Server es rowversion binario, no una fecha
    @CreateDateColumn({name:"creado_en",type:"datetime2"})
    creadoEn!:Date;

    @UpdateDateColumn({name:"actualizado_en",type:"datetime2"})
    actualizadoEn!:Date;

    @OneToMany(()=>CarroItemsEntity,(item)=>item.carro)
    items!:CarroItemsEntity[];
}
