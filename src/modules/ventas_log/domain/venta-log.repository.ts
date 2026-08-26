import type { VentaLog } from "./venta-log.domain.js";


export interface IVentaLogRepository{
    save(venta:VentaLog):Promise<void>;
    findByCodVenta(codVenta:number):Promise<VentaLog|null>;

    /**
     * Igual que findByCodVenta pero tomando un lock de fila (SELECT ... FOR UPDATE).
     *
     * Es lo que serializa las asignaciones de una misma nota de venta: sin esto,
     * dos operarios cargando al mismo tiempo leen el mismo "disponible" y entre
     * los dos asignan mas vidrios de los que se vendieron.
     *
     * Solo tiene efecto dentro de una transaccion (ver IUnitOfWorkRunner).
     */
    lockByCodVenta(codVenta:number):Promise<VentaLog|null>;
}
