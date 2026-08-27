import type { Movimiento, TipoMovimiento } from "./movimiento.domain.js";


export interface FiltrosMovimiento{
    // incluye tambien los movimientos donde el carro fue DESTINO,
    // si no, mover vidrios desapareceria del historial del carro que los recibio
    carroId?:string;
    codVenta?:number;
    tipo?:TipoMovimiento;
    usuarioId?:string;
    desde?:Date;
    hasta?:Date;
}

export interface PaginaMovimientos{
    movimientos:Movimiento[];
    total:number;
}


export interface IMovimientoRepository{
    // no hay update ni delete: la bitacora es append-only
    registrar(movimiento:Movimiento):Promise<void>;
    registrarMuchos(movimientos:Movimiento[]):Promise<void>;

    buscar(filtros:FiltrosMovimiento,limite:number,offset:number):Promise<PaginaMovimientos>;
}
