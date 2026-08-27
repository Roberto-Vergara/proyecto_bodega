import type { CarroItem } from "./carro-item.domain.js";


// una linea de "en que carros esta repartido este item"
export interface UbicacionDeItem{
    carroId:string;
    nroCarro:number;
    cantidad:number;
}

// lo que ya salio de la planta de una venta. Se mira el historico
// (despachado_en NO nulo), al reves que el resto de las consultas
export interface ResumenDespacho{
    piezasDespachadas:number;
    ultimoDespacho:Date|null;
}

// una venta que tiene vidrios cargados en algun carro ahora mismo
export interface VentaEnProceso{
    codVenta:number;
    piezasEnCarros:number;
    lineas:number;
    carros:number;
    ultimaCarga:Date;
}


export interface ICarroItemRepository{
    save(item:CarroItem):Promise<void>;
    saveMuchos(items:CarroItem[]):Promise<void>;
    delete(id:string):Promise<void>;

    findById(id:string):Promise<CarroItem|null>;

    // "activo" = todavia no despachado. El historico nunca cuenta para los calculos
    findActivosPorCarro(carroId:string):Promise<CarroItem[]>;
    findActivosPorVenta(codVenta:number):Promise<CarroItem[]>;
    findActivoPorCarroYItem(carroId:string,codVenta:number,nroItem:number):Promise<CarroItem|null>;

    // suma de lo ya repartido de un item, en todos los carros.
    // es lo que se compara contra la cantidad vendida para no pasarse
    cantidadAsignadaDeItem(codVenta:number,nroItem:number):Promise<number>;

    // idem pero para varios items de una venta de una sola consulta,
    // para no hacer N queries al asignar un lote. Clave: nro_item
    cantidadesAsignadasDeVenta(codVenta:number):Promise<Map<number,number>>;

    contarActivosPorCarro(carroId:string):Promise<number>;

    // total de piezas por carro, para el listado. Clave: carro_id
    totalPiezasPorCarro(carroIds:string[]):Promise<Map<string,number>>;

    // en que carros esta repartido cada item de una venta. Clave: nro_item
    distribucionPorVenta(codVenta:number):Promise<Map<number,UbicacionDeItem[]>>;

    // el dashboard necesita entrar por "que hay a medio cargar", no solo
    // consultando una nota de venta que ya conoces
    ventasEnProceso():Promise<VentaEnProceso[]>;

    // para avisar si una venta ya se despacho antes y alguien la esta
    // volviendo a cargar (reproceso legitimo o carga repetida por error)
    resumenDespachoDeVenta(codVenta:number):Promise<ResumenDespacho>;

    // despacho: marca todo lo activo de la venta y devuelve los carros afectados,
    // para poder recalcular su ocupacion
    despacharVenta(codVenta:number):Promise<{carrosAfectados:string[];itemsDespachados:number}>;
}
