import type { EntityManager, Repository } from "typeorm";

import { AppDataSource } from "../../../shared/infrastructure/database/data-source.js";
import { VentaLog } from "../../domain/venta-log.domain.js";
import type { IVentaLogRepository } from "../../domain/venta-log.repository.js";
import { VentasLogEntity } from "./ventas_log.entity.js";

// SQL Server: violacion de indice unico / clave primaria
const ERROR_CLAVE_DUPLICADA = [2601, 2627];


export class VentaLogRepositoryImpl implements IVentaLogRepository{

    constructor(private readonly manager?:EntityManager){}

    private get repository():Repository<VentasLogEntity>{
        return this.manager
            ? this.manager.getRepository(VentasLogEntity)
            : AppDataSource.getRepository(VentasLogEntity);
    }

    /**
     * Upsert por cod_venta.
     *
     * Se hace a mano porque repository.upsert() de TypeORM no esta soportado
     * en SQL Server (usa ON CONFLICT / ON DUPLICATE KEY, que son de postgres y
     * mysql). Aca: primero UPDATE, y si no toco ninguna fila, INSERT.
     *
     * Si dos requests espejan la misma venta por primera vez al mismo tiempo,
     * los dos ven 0 filas actualizadas y los dos intentan insertar: uno choca
     * con el indice unico. Ese caso se atrapa y se resuelve como update.
     */
    async save(venta: VentaLog): Promise<void> {
        const datos = {
            nom_cliente:venta.nomCliente,
            rut_cliente:venta.rutCliente,
            id_vendedor:venta.idVendedor,
            fecha_orden:venta.fechaOrden,
            instrucciones:venta.instrucciones,
            monto_total:venta.montoTotal,
        };

        const resultado = await this.repository.update({cod_venta:venta.codVenta}, datos);

        if((resultado.affected ?? 0) > 0){
            return;
        }

        try {
            await this.repository.insert({
                id:venta.id,
                cod_venta:venta.codVenta,
                ...datos,
            });
        } catch (error) {
            if(!esClaveDuplicada(error)){
                throw error;
            }

            // se nos adelanto otro request: la fila ya existe, la actualizamos
            await this.repository.update({cod_venta:venta.codVenta}, datos);
        }
    }

    async findByCodVenta(codVenta: number): Promise<VentaLog | null> {
        const entity = await this.repository.findOneBy({cod_venta:codVenta});
        return entity ? this.toDomain(entity) : null;
    }

    async lockByCodVenta(codVenta: number): Promise<VentaLog | null> {
        // en SQL Server esto se traduce a WITH (UPDLOCK, ROWLOCK), que es el
        // equivalente del SELECT ... FOR UPDATE de postgres.
        // Solo tiene efecto dentro de una transaccion: este metodo NO debe
        // usarse fuera de una unidad de trabajo
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
            // el driver de SQL Server devuelve DATE como objeto Date;
            // el new Date() de mas vale por si algun dia vuelve como string
            fechaOrden:entity.fecha_orden === null ? null : new Date(entity.fecha_orden),
            instrucciones:entity.instrucciones,
            // tedious devuelve DECIMAL como number, a diferencia de pg que lo
            // daba como string. El Number() cubre los dos casos
            montoTotal:entity.monto_total === null ? null : Number(entity.monto_total),
            ultimaConsulta:entity.ultima_consulta,
        });
    }
}


function esClaveDuplicada(error:unknown):boolean{
    if(typeof error !== "object" || error === null) return false;

    // TypeORM envuelve el error del driver: el numero puede venir en la raiz
    // o adentro de driverError
    const posibles = [error, (error as {driverError?:unknown}).driverError];

    return posibles.some((e)=>{
        if(typeof e !== "object" || e === null) return false;
        const numero = (e as {number?:unknown}).number;
        return typeof numero === "number" && ERROR_CLAVE_DUPLICADA.includes(numero);
    });
}
