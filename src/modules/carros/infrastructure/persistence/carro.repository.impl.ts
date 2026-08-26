import type { EntityManager, Repository } from "typeorm";

import { AppDataSource } from "../../../shared/infrastructure/database/data-source.js";
import { Carro, type EstadoCarro, type OcupacionCarro, type UbicacionCarro } from "../../domain/carro.domain.js";
import type { FiltrosCarro, ICarroRepository } from "../../domain/carro.repository.js";
import { CarroEntity } from "./carro.entity.js";


// hacemos un implement de la interfaz porque con este vamos a hacer
// injeccion de dependencias, que la verdad es una confusion sin nestjs
export class CarroRepositoryImpl implements ICarroRepository{

    // si viene un manager, este repo trabaja dentro de esa transaccion.
    // si no, usa la conexion normal (ver TypeOrmUnitOfWork)
    constructor(private readonly manager?:EntityManager){}

    // getter perezoso: las rutas se importan antes de AppDataSource.initialize(),
    // asi que pedir el repositorio en el constructor revienta al arrancar
    private get repository():Repository<CarroEntity>{
        return this.manager
            ? this.manager.getRepository(CarroEntity)
            : AppDataSource.getRepository(CarroEntity);
    }

    async create(carro: Carro): Promise<void> {
        await this.repository.insert(this.toEntity(carro));
    }

    async update(carro: Carro): Promise<void> {
        await this.repository.update({id:carro.id},{
            estado_carro:carro.estado,
            ocupacion:carro.ocupacion,
            ubicacion_carro:carro.ubicacion,
        });
    }

    async findById(id: string): Promise<Carro | null> {
        const entity = await this.repository.findOneBy({id});
        // si la entidad está la devolvemos aqui, si no devolvemos null y manejamos el error
        return entity ? this.toDomain(entity) : null;
    }

    async findByNumero(nroCarro: number): Promise<Carro | null> {
        const entity = await this.repository.findOneBy({nro_carro:nroCarro});
        return entity ? this.toDomain(entity) : null;
    }

    async existsByNumero(nroCarro: number): Promise<boolean> {
        return (await this.repository.countBy({nro_carro:nroCarro})) > 0;
    }

    async findAll(filtros: FiltrosCarro = {}): Promise<Carro[]> {
        const where: {
            estado_carro?:EstadoCarro;
            ocupacion?:OcupacionCarro;
            ubicacion_carro?:UbicacionCarro;
        } = {};

        if(filtros.estado !== undefined) where.estado_carro = filtros.estado;
        if(filtros.ocupacion !== undefined) where.ocupacion = filtros.ocupacion;
        if(filtros.ubicacion !== undefined) where.ubicacion_carro = filtros.ubicacion;

        const entities = await this.repository.find({where,order:{nro_carro:"ASC"}});
        return entities.map((entity)=>this.toDomain(entity));
    }

    // si le damos un objeto del tipo carro significa que ya paso por las
    // validaciones del dominio
    private toEntity(carro:Carro):CarroEntity{
        const entity = new CarroEntity();
        entity.id = carro.id;
        entity.nro_carro = carro.nroCarro;
        entity.estado_carro = carro.estado;
        entity.ocupacion = carro.ocupacion;
        entity.ubicacion_carro = carro.ubicacion;
        return entity;
    }

    private toDomain(entity:CarroEntity):Carro{
        return Carro.reconstruir({
            id:entity.id,
            nroCarro:entity.nro_carro,
            estado:entity.estado_carro,
            ocupacion:entity.ocupacion,
            ubicacion:entity.ubicacion_carro,
            creadoEn:entity.creadoEn,
            actualizadoEn:entity.actualizadoEn,
        });
    }
}
