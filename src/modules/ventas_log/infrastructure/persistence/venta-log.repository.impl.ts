import type { EntityManager, Repository } from "typeorm";

import { AppDataSource } from "../../../shared/infrastructure/database/data-source.js";
import { VentaLog } from "../../domain/venta-log.domain.js";
import type { IVentaLogRepository } from "../../domain/venta-log.repository.js";
import { VentasLogEntity } from "./ventas_log.entity.js";


export class VentaLogRepositoryImpl implements IVentaLogRepository{

    constructor(private readonly manager?:EntityManager){}

    private get repository():Repository<VentasLogEntity>{
        return this.manager
            ? this.manager.getRepository(VentasLogEntity)
            : AppDataSource.getRepository(VentasLogEntity);
    }

    async save(venta: VentaLog): Promise<void> {
        // upsert por cod_venta: si la venta ya estaba espejada se refresca,
        // si no se inserta. Asi BuscarVenta puede llamarse cuantas veces sea
        await this.repository.upsert(
            {
                id:venta.id,
                cod_venta:venta.codVenta,
                nom_cliente:venta.nomCliente,
                rut_cliente:venta.rutCliente,
                id_vendedor:venta.idVendedor,
                fecha_orden:venta.fechaOrden,
                instrucciones:venta.instrucciones,
                monto_total:venta.montoTotal === null ? null : String(venta.montoTotal),
            },
            {
                conflictPaths:["cod_venta"],
                // no pisamos el id que ya tenia la fila en la base
                skipUpdateIfNoValuesChanged:false,
            },
        );
    }

    async findByCodVenta(codVenta: number): Promise<VentaLog | null> {
        const entity = await this.repository.findOneBy({cod_venta:codVenta});
        return entity ? this.toDomain(entity) : null;
    }

    async lockByCodVenta(codVenta: number): Promise<VentaLog | null> {
        // pessimistic_write = SELECT ... FOR UPDATE.
        // sin transaccion abierta TypeORM lanza error, que es justo lo que
        // queremos: este metodo NO debe usarse fuera de una unidad de trabajo
        const entity = await this.repository.findOne({
            where:{cod_venta:codVenta},
            lock:{mode:"pessimistic_write"},
        });

        return entity ? this.toDomain(entity) : null;
    }

    private toDomain(entity:VentasLogEntity):VentaLog{
        return VentaLog.reconstruir({
            id:entity.id,
            codVenta:entity.cod_venta,
            nomCliente:entity.nom_cliente,
            rutCliente:entity.rut_cliente,
            idVendedor:entity.id_vendedor,
            // postgres devuelve DATE como string 'YYYY-MM-DD'
            fechaOrden:entity.fecha_orden === null ? null : new Date(entity.fecha_orden),
            instrucciones:entity.instrucciones,
            // numeric siempre vuelve como string desde pg, para no perder precision
            montoTotal:entity.monto_total === null ? null : Number(entity.monto_total),
            ultimaConsulta:entity.ultima_consulta,
        });
    }
}
