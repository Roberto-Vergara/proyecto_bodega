import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { EstadoCarro, OcupacionCarro, UbicacionCarro } from "../../domain/carro.domain.js";
import { CarroItemsEntity } from "../../../carro_items/infrastructure/persistence/carro_items.entity.js";



@Entity("carros")
export class CarroEntity{
    // el id lo genera el dominio con UuidAdapter, igual que en usuarios,
    // asi que es PrimaryColumn y no PrimaryGeneratedColumn
    @PrimaryColumn({type:"uuid"})
    id!:string;

    @Column({type:"int",unique:true})
    nro_carro!:number;

    // lo decide el operario
    @Column({
        type:"enum",
        enum:EstadoCarro,
        default:EstadoCarro.DISPONIBLE
    })
    estado_carro!:EstadoCarro;

    // lo calcula el sistema a partir de carro_items
    @Column({
        type:"enum",
        enum:OcupacionCarro,
        default:OcupacionCarro.VACIO
    })
    ocupacion!:OcupacionCarro;

    @Column({
        type:"enum",
        enum:UbicacionCarro,
    })
    ubicacion_carro!:UbicacionCarro;

    @CreateDateColumn({name:"creado_en",type:"timestamp"})
    creadoEn!:Date;

    @UpdateDateColumn({name:"actualizado_en",type:"timestamp"})
    actualizadoEn!:Date;

    @OneToMany(()=>CarroItemsEntity,(item)=>item.carro)
    items!:CarroItemsEntity[];
}
