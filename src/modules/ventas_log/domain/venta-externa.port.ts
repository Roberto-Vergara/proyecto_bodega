
// ==========================================================================
// Puerto hacia el sistema comercial (DB2 / AS400).
//
// Para nosotros es SOLO LECTURA: la venta se crea y se modifica alla, nosotros
// solo la consultamos. Todo lo que entra por aca ya viene normalizado (sin los
// CHAR con padding de DB2, con numeros de verdad y fechas de verdad), asi que
// la capa de aplicacion nunca se entera de que existe un AS400.
// ==========================================================================

export interface ItemVentaExterna{
    nroItem:number;
    codItem:string;
    // en milimetros, enteros (LIDIM1/2/3 son DECIMAL(7,0))
    dim1:number;
    dim2:number;
    dim3:number;
    // cuantas unidades se vendieron de este item (LIQYOR)
    cantidad:number;
    // ojo: NO es unica, dos items distintos pueden compartir marca
    marcaPieza:string|null;
}

export interface VentaExterna{
    codVenta:number;
    nomCliente:string;
    rutCliente:string|null;
    idVendedor:string|null;
    fechaOrden:Date|null;
    instrucciones:string|null;
    montoTotal:number|null;
    items:ItemVentaExterna[];
}

export interface IVentaExternaPort{
    /**
     * Busca una venta por su numero de nota.
     *
     * Si viene nroItem, el detalle se acota a ese item: es como el operario
     * busca cuando ya sabe que vidrio esta cargando (nota de venta + item).
     *
     * Devuelve null si la venta no existe. Si el AS400 no responde, lanza.
     */
    findByCodigo(cod:number,nroItem?:number):Promise<VentaExterna|null>;
}
