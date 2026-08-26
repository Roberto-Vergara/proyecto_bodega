
// donde esta repartido un item
export interface EnCarroDto{
    carro_id:string;
    nro_carro:number;
    cantidad:number;
}

export interface ItemVentaDto{
    nro_item:number;
    cod_item:string;
    dim1:number;
    dim2:number;
    dim3:number;
    dimensiones:string;
    marca_pieza:string|null;
    // lo que se vendio (DB2)
    cantidad_total:number;
    // lo que ya esta cargado en carros
    cantidad_asignada:number;
    // lo que falta por cargar
    disponible:number;
    en_carros:EnCarroDto[];
}

export interface VentaDto{
    cod_venta:number;
    nom_cliente:string;
    rut_cliente:string|null;
    id_vendedor:string|null;
    fecha_orden:string|null;
    instrucciones:string|null;
    monto_total:number|null;
    /**
     * true cuando no pudimos hablar con DB2 y estamos devolviendo el espejo
     * local. Los datos sirven, pero pueden estar viejos: el cliente deberia
     * mostrarlo para que nadie tome decisiones a ciegas.
     */
    desactualizado:boolean;
    ultima_consulta:string|null;
    /**
     * true si esta venta ya salio de la planta alguna vez.
     *
     * No bloquea nada: en planta se reprocesan pedidos (devoluciones, piezas
     * rehechas) y un bloqueo duro estorbaria mas de lo que ayuda. Es para que
     * el operario vea que esta volviendo a cargar algo ya despachado y decida.
     */
    ya_despachada:boolean;
    piezas_despachadas:number;
    ultimo_despacho:string|null;
    items:ItemVentaDto[];
    // cosas raras que hay que mostrarle al operario (ej: la venta cambio en DB2)
    avisos:string[];
}
