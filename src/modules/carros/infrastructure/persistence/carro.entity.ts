import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { EstadoCarro, UbicacionCarro } from "../../domain/carro.domain.js";
import { CarroItemsEntity } from "../../../carro_items/infrastructure/persistence/carro_items.entity.js";



@Entity("carros")
export class CarroEntity{
    @PrimaryGeneratedColumn("uuid")
    id!:string;

    @Column({type:"int",unique:true})
    nro_carro!:number;

    @Column({
        type:"enum",
        enum:EstadoCarro,
        default:EstadoCarro.DISPONIBLE
    })
    estado_carro!:EstadoCarro;

    @Column({
        type:"enum",
        enum:UbicacionCarro,
    })
    ubicacion_carro!:UbicacionCarro;

    @OneToMany(()=>CarroItemsEntity,(item)=>item.carro)
    items!:CarroItemsEntity[];
}