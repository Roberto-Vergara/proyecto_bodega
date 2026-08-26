import type { ICarroItemRepository } from "../../carro_items/domain/carro-item.repository.js";
import type { ICarroRepository } from "../../carros/domain/carro.repository.js";
import type { IVentaLogRepository } from "../../ventas_log/domain/venta-log.repository.js";


/**
 * Los repositorios de una misma transaccion.
 *
 * Asignar vidrios a un carro toca tres tablas (ventas_log, carro_items, carros)
 * y tiene que ser todo o nada. Este puerto deja que los casos de uso pidan
 * atomicidad sin enterarse de que por debajo hay TypeORM.
 */
export interface UnitOfWork{
    ventas:IVentaLogRepository;
    carroItems:ICarroItemRepository;
    carros:ICarroRepository;
}

export interface IUnitOfWorkRunner{
    run<T>(fn:(uow:UnitOfWork)=>Promise<T>):Promise<T>;
}
