import { Brackets, type EntityManager, type QueryDeepPartialEntity, type Repository } from "typeorm";

import { AppDataSource } from "../../../shared/infrastructure/database/data-source.js";
import { enTandas, filasPorTanda } from "../../../shared/infrastructure/database/sql-server.limits.js";
import { Movimiento } from "../../domain/movimiento.domain.js";
import type {
    FiltrosMovimiento,
    IMovimientoRepository,
    PaginaMovimientos,
} from "../../domain/movimiento.repository.js";
import { MovimientoEntity } from "./movimiento.entity.js";

// cuantas columnas escribe toEntity(): define cuantas filas caben por INSERT
const COLUMNAS_MOVIMIENTO = 14;


export class MovimientoRepositoryImpl implements IMovimientoRepository{

    constructor(private readonly manager?:EntityManager){}

    private get repository():Repository<MovimientoEntity>{
        return this.manager
            ? this.manager.getRepository(MovimientoEntity)
            : AppDataSource.getRepository(MovimientoEntity);
    }

    async registrar(movimiento: Movimiento): Promise<void> {
        // insert y no save: save haria un update si el id ya existiera,
        // y esta tabla no se actualiza nunca
        await this.repository.insert(paraInsertar(this.toEntity(movimiento)));
    }

    async registrarMuchos(movimientos: Movimiento[]): Promise<void> {
        if(movimientos.length === 0) return;

        // vaciar o despachar puede generar muchas filas de una: hay que
        // partirlas para no pasarse de los 2100 parametros de SQL Server
        for(const tanda of enTandas(movimientos, filasPorTanda(COLUMNAS_MOVIMIENTO))){
            await this.repository.insert(tanda.map((m)=>paraInsertar(this.toEntity(m))));
        }
    }

    async buscar(
        filtros: FiltrosMovimiento,
        limite: number,
        offset: number,
    ): Promise<PaginaMovimientos> {
        const qb = this.repository.createQueryBuilder("m");

        if(filtros.carroId !== undefined){
            // el carro cuenta tanto si fue origen como si fue destino: si no,
            // recibir vidrios no apareceria en el historial del que los recibio
            qb.andWhere(new Brackets((w)=>{
                w.where("m.carro_id = :carroId",{carroId:filtros.carroId})
                 .orWhere("m.carro_destino_id = :carroId",{carroId:filtros.carroId});
            }));
        }

        if(filtros.codVenta !== undefined){
            qb.andWhere("m.cod_venta = :codVenta",{codVenta:filtros.codVenta});
        }

        if(filtros.tipo !== undefined){
            qb.andWhere("m.tipo = :tipo",{tipo:filtros.tipo});
        }

        if(filtros.usuarioId !== undefined){
            qb.andWhere("m.usuario_id = :usuarioId",{usuarioId:filtros.usuarioId});
        }

        if(filtros.desde !== undefined){
            qb.andWhere("m.creado_en >= :desde",{desde:filtros.desde});
        }

        if(filtros.hasta !== undefined){
            qb.andWhere("m.creado_en <= :hasta",{hasta:filtros.hasta});
        }

        // lo mas nuevo primero; el id desempata los que caen en el mismo
        // milisegundo (un vaciado escribe varias filas de una)
        qb.orderBy("m.creado_en","DESC").addOrderBy("m.id","DESC");
        qb.take(limite).skip(offset);

        const [entities,total] = await qb.getManyAndCount();

        return {
            movimientos: entities.map((entity)=>this.toDomain(entity)),
            total,
        };
    }

    private toEntity(movimiento:Movimiento):MovimientoEntity{
        const entity = new MovimientoEntity();
        entity.id = movimiento.id;
        entity.lote_id = movimiento.loteId;
        entity.tipo = movimiento.tipo;
        entity.carro_id = movimiento.carroId;
        entity.nro_carro = movimiento.nroCarro;
        entity.carro_destino_id = movimiento.carroDestinoId;
        entity.nro_carro_destino = movimiento.nroCarroDestino;
        entity.cod_venta = movimiento.codVenta;
        entity.nro_item = movimiento.nroItem;
        entity.cod_item = movimiento.codItem;
        entity.cantidad = movimiento.cantidad;
        entity.detalle = movimiento.detalle;
        entity.usuario_id = movimiento.usuarioId;
        entity.creado_en = movimiento.creadoEn;
        return entity;
    }

    private toDomain(entity:MovimientoEntity):Movimiento{
        return Movimiento.reconstruir({
            id:entity.id,
            loteId:entity.lote_id,
            tipo:entity.tipo,
            carroId:entity.carro_id,
            nroCarro:entity.nro_carro,
            carroDestinoId:entity.carro_destino_id,
            nroCarroDestino:entity.nro_carro_destino,
            codVenta:entity.cod_venta,
            nroItem:entity.nro_item,
            codItem:entity.cod_item,
            cantidad:entity.cantidad,
            detalle:entity.detalle,
            usuarioId:entity.usuario_id,
            creadoEn:entity.creado_en,
        });
    }
}


/**
 * QueryDeepPartialEntity no sabe representar la columna de detalle tipada como
 * Record<string,unknown>: intenta recorrer el index signature y termina
 * pidiendo un `() => string`. La entidad que le pasamos ya esta completa y
 * bien tipada, asi que el cast es solo para el borde de TypeORM.
 */
function paraInsertar(entity:MovimientoEntity):QueryDeepPartialEntity<MovimientoEntity>{
    return entity as QueryDeepPartialEntity<MovimientoEntity>;
}
