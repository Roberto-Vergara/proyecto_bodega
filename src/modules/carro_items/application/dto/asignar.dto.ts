
export interface ItemAAsignarDto{
    nroItem:number;
    cantidad:number;
}

export interface AsignarItemsInput{
    carroId:string;
    codVenta:number;
    /**
     * Los items y cantidades que el operario esta cargando.
     *
     * Si viene vacio y asignarTodoPendiente es true, se carga todo lo que
     * quede sin asignar de la venta (la "familia entera" en un solo carro).
     */
    items:ItemAAsignarDto[];
    asignarTodoPendiente:boolean;
    usuarioId:string|null;
}

export interface ItemAsignadoDto{
    item_id:string;
    nro_item:number;
    cod_item:string;
    cantidad_asignada_ahora:number;
    cantidad_en_este_carro:number;
    cantidad_total_item:number;
    disponible_despues:number;
}

export interface AsignarItemsOutput{
    carro_id:string;
    nro_carro:number;
    cod_venta:number;
    asignados:ItemAsignadoDto[];
    total_piezas_cargadas:number;
}
