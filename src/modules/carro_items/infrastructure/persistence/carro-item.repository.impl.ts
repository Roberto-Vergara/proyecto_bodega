import { IsNull, type EntityManager, type Repository } from "typeorm";

import { AppDataSource } from "../../../shared/infrastructure/database/data-source.js";
import { CarroItem } from "../../domain/carro-item.domain.js";
import type { ICarroItemRepository, ResumenDespacho, UbicacionDeItem } from "../../domain/carro-item.repository.js";
import { CarroItemsEntity } from "./carro_items.entity.js";


export class CarroItemRepositoryImpl implements ICarroItemRepository{

    constructor(private readonly manager?:EntityManager){}

    private get repository():Repository<CarroItemsEntity>{
        return this.manager
            ? this.manager.getRepository(CarroItemsEntity)
            : AppDataSource.getRepository(CarroItemsEntity);
    }

    async save(item: CarroItem): Promise<void> {
        await this.repository.save(this.toEntity(item));
    }

    async saveMuchos(items: CarroItem[]): Promise<void> {
        if(items.length === 0) return;
        await this.repository.save(items.map((item)=>this.toEntity(item)));
    }

    async delete(id: string): Promise<void> {
        await this.repository.delete({id});
    }

    async findById(id: string): Promise<CarroItem | null> {
        const entity = await this.repository.findOneBy({id});
        return entity ? this.toDomain(entity) : null;
    }

    async findActivosPorCarro(carroId: string): Promise<CarroItem[]> {
        const entities = await this.repository.find({
            where:{carro_id:carroId,despachado_en:IsNull()},
            order:{cod_venta:"ASC",nro_item:"ASC"},
        });

        return entities.map((entity)=>this.toDomain(entity));
    }

    async findActivosPorVenta(codVenta: number): Promise<CarroItem[]> {
        const entities = await this.repository.find({
            where:{cod_venta:codVenta,despachado_en:IsNull()},
            order:{nro_item:"ASC"},
        });

        return entities.map((entity)=>this.toDomain(entity));
    }

    async findActivoPorCarroYItem(
        carroId: string,
        codVenta: number,
        nroItem: number,
    ): Promise<CarroItem | null> {
        const entity = await this.repository.findOneBy({
            carro_id:carroId,
            cod_venta:codVenta,
            nro_item:nroItem,
            despachado_en:IsNull(),
        });

        return entity ? this.toDomain(entity) : null;
    }

    async cantidadAsignadaDeItem(codVenta: number, nroItem: number): Promise<number> {
        const fila = await this.repository
            .createQueryBuilder("ci")
            .select("COALESCE(SUM(ci.cantidad_asignada), 0)","total")
            .where("ci.cod_venta = :codVenta",{codVenta})
            .andWhere("ci.nro_item = :nroItem",{nroItem})
            .andWhere("ci.despachado_en IS NULL")
            .getRawOne<{total:string}>();

        return Number(fila?.total ?? 0);
    }

    async cantidadesAsignadasDeVenta(codVenta: number): Promise<Map<number,number>> {
        // una sola consulta agrupada en vez de N queries al asignar un lote
        const filas = await this.repository
            .createQueryBuilder("ci")
            .select("ci.nro_item","nro_item")
            .addSelect("COALESCE(SUM(ci.cantidad_asignada), 0)","total")
            .where("ci.cod_venta = :codVenta",{codVenta})
            .andWhere("ci.despachado_en IS NULL")
            .groupBy("ci.nro_item")
            .getRawMany<{nro_item:number;total:string}>();

        return new Map(filas.map((f)=>[Number(f.nro_item),Number(f.total)]));
    }

    async contarActivosPorCarro(carroId: string): Promise<number> {
        return this.repository.countBy({carro_id:carroId,despachado_en:IsNull()});
    }

    async totalPiezasPorCarro(carroIds: string[]): Promise<Map<string,number>> {
        if(carroIds.length === 0) return new Map();

        const filas = await this.repository
            .createQueryBuilder("ci")
            .select("ci.carro_id","carro_id")
            .addSelect("COALESCE(SUM(ci.cantidad_asignada), 0)","total")
            .where("ci.carro_id IN (:...carroIds)",{carroIds})
            .andWhere("ci.despachado_en IS NULL")
            .groupBy("ci.carro_id")
            .getRawMany<{carro_id:string;total:string}>();

        return new Map(filas.map((f)=>[f.carro_id,Number(f.total)]));
    }

    async distribucionPorVenta(codVenta: number): Promise<Map<number,UbicacionDeItem[]>> {
        const filas = await this.repository
            .createQueryBuilder("ci")
            .innerJoin("carros","c","c.id = ci.carro_id")
            .select("ci.nro_item","nro_item")
            .addSelect("ci.carro_id","carro_id")
            .addSelect("c.nro_carro","nro_carro")
            .addSelect("ci.cantidad_asignada","cantidad")
            .where("ci.cod_venta = :codVenta",{codVenta})
            .andWhere("ci.despachado_en IS NULL")
            .orderBy("c.nro_carro","ASC")
            .getRawMany<{nro_item:number;carro_id:string;nro_carro:number;cantidad:number}>();

        const mapa = new Map<number,UbicacionDeItem[]>();

        for(const fila of filas){
            const nroItem = Number(fila.nro_item);
            const lista = mapa.get(nroItem) ?? [];

            lista.push({
                carroId:fila.carro_id,
                nroCarro:Number(fila.nro_carro),
                cantidad:Number(fila.cantidad),
            });

            mapa.set(nroItem,lista);
        }

        return mapa;
    }

    async resumenDespachoDeVenta(codVenta: number): Promise<ResumenDespacho> {
        // ojo: aca se mira el HISTORICO (despachado_en NO nulo), al reves
        // que todas las otras consultas de este repositorio
        const fila = await this.repository
            .createQueryBuilder("ci")
            .select("COALESCE(SUM(ci.cantidad_asignada), 0)","piezas")
            .addSelect("MAX(ci.despachado_en)","ultimo")
            .where("ci.cod_venta = :codVenta",{codVenta})
            .andWhere("ci.despachado_en IS NOT NULL")
            .getRawOne<{piezas:string;ultimo:Date|null}>();

        return {
            piezasDespachadas: Number(fila?.piezas ?? 0),
            ultimoDespacho: fila?.ultimo ?? null,
        };
    }

    async despacharVenta(codVenta: number): Promise<{carrosAfectados:string[];itemsDespachados:number}>{
        // primero anotamos que carros quedan tocados, porque despues del UPDATE
        // esas filas ya no aparecen como activas y no habria como saberlo
        const filas = await this.repository
            .createQueryBuilder("ci")
            .select("DISTINCT ci.carro_id","carro_id")
            .where("ci.cod_venta = :codVenta",{codVenta})
            .andWhere("ci.despachado_en IS NULL")
            .getRawMany<{carro_id:string}>();

        const resultado = await this.repository.update(
            {cod_venta:codVenta,despachado_en:IsNull()},
            {despachado_en:new Date()},
        );

        return {
            carrosAfectados:filas.map((f)=>f.carro_id),
            itemsDespachados:resultado.affected ?? 0,
        };
    }

    private toEntity(item:CarroItem):CarroItemsEntity{
        const entity = new CarroItemsEntity();
        entity.id = item.id;
        entity.carro_id = item.carroId;
        entity.cod_venta = item.codVenta;
        entity.nro_item = item.nroItem;
        entity.cantidad_asignada = item.cantidadAsignada;
        entity.cod_item = item.codItem;
        entity.dim1 = item.dim1;
        entity.dim2 = item.dim2;
        entity.dim3 = item.dim3;
        entity.marca_pieza = item.marcaPieza;
        entity.cantidad_total_item = item.cantidadTotalItem;
        entity.despachado_en = item.despachadoEn;
        entity.asignado_por = item.asignadoPor;
        return entity;
    }

    private toDomain(entity:CarroItemsEntity):CarroItem{
        return CarroItem.reconstruir({
            id:entity.id,
            carroId:entity.carro_id,
            codVenta:entity.cod_venta,
            nroItem:entity.nro_item,
            cantidadAsignada:entity.cantidad_asignada,
            codItem:entity.cod_item,
            dim1:entity.dim1,
            dim2:entity.dim2,
            dim3:entity.dim3,
            marcaPieza:entity.marca_pieza,
            cantidadTotalItem:entity.cantidad_total_item,
            fechaAsignacion:entity.fecha_asignacion,
            despachadoEn:entity.despachado_en,
            asignadoPor:entity.asignado_por,
        });
    }
}
