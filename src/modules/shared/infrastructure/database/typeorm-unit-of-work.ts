import { CarroItemRepositoryImpl } from "../../../carro_items/infrastructure/persistence/carro-item.repository.impl.js";
import { CarroRepositoryImpl } from "../../../carros/infrastructure/persistence/carro.repository.impl.js";
import { VentaLogRepositoryImpl } from "../../../ventas_log/infrastructure/persistence/venta-log.repository.impl.js";
import type { IUnitOfWorkRunner, UnitOfWork } from "../../domain/unit-of-work.port.js";
import { AppDataSource } from "./data-source.js";


/**
 * Implementacion del puerto de transacciones con TypeORM.
 *
 * Abre una transaccion y arma repositorios ligados a ESE EntityManager, para
 * que todo lo que pase adentro del callback comparta la misma transaccion:
 * si algo falla, se revierte entero.
 *
 * Es lo que permite que lockByCodVenta() (SELECT ... FOR UPDATE) sirva de algo.
 */
export class TypeOrmUnitOfWork implements IUnitOfWorkRunner{

    async run<T>(fn:(uow:UnitOfWork)=>Promise<T>):Promise<T>{
        return AppDataSource.transaction(async (manager)=>{
            const uow:UnitOfWork = {
                ventas:new VentaLogRepositoryImpl(manager),
                carroItems:new CarroItemRepositoryImpl(manager),
                carros:new CarroRepositoryImpl(manager),
            };

            return fn(uow);
        });
    }
}
