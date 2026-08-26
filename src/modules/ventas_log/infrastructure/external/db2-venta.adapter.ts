import { findVenta } from "../../../shared/infrastructure/database/odbc/odbc.connection.js";
import type {
    ItemVentaExterna,
    IVentaExternaPort,
    VentaExterna,
} from "../../domain/venta-externa.port.js";


// ==========================================================================
// Adapter real contra DB2. Aca vive TODA la mugre del AS400 para que no se
// escape al resto de la aplicacion. Lo que se limpia (verificado con la
// salida real de la orden 777777):
//
//   - los CHAR vienen con padding: 'CRP8.885       ', y OHREPÑ ademas viene
//     padeado a la IZQUIERDA ('  I15'), asi que hay que trim() completo
//   - OHDAOR no es una fecha: es NUMERIC(6,0) en formato YYMMDD (260120)
//   - LIDIM1/2/3 y LIQYOR son DECIMAL(7,0): enteros, no decimales
//   - el "array" que devuelve odbc trae pegadas las propiedades statement,
//     parameters, columns y count, asi que hay que aplanarlo
// ==========================================================================


// odbc devuelve un Result: es array-like pero con metadata pegada encima.
// Array.from() se queda solo con las filas
function soloFilas(resultado:unknown):Record<string,unknown>[]{
    if(!Array.isArray(resultado)) return [];
    return Array.from(resultado) as Record<string,unknown>[];
}

function texto(valor:unknown):string|null{
    if(valor === null || valor === undefined) return null;

    // trim() y no trimEnd(): OHREPÑ viene padeado a la izquierda
    const limpio = String(valor).trim();
    return limpio === "" ? null : limpio;
}

function entero(valor:unknown):number{
    const n = Number(valor);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/**
 * Convierte el YYMMDD de DB2 (NUMERIC(6,0)) a una fecha real.
 *
 * 260120 -> 2026-01-20
 *
 * El pivote de siglo es una convencion, no un dato que venga en la base:
 * yy <= 69 se asume 20xx, de ahi para arriba 19xx. Si algun dia aparecen
 * ordenes historicas raras hay que revisar esto.
 */
export function fechaDesdeYYMMDD(valor:unknown):Date|null{
    const n = entero(valor);

    if(n <= 0) return null;

    const yy = Math.trunc(n / 10000);
    const mm = Math.trunc((n % 10000) / 100);
    const dd = n % 100;

    if(mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

    const anio = yy <= 69 ? 2000 + yy : 1900 + yy;

    // UTC a proposito: la columna es DATE, si usaramos hora local el offset
    // de Chile podria correr la fecha un dia para atras
    return new Date(Date.UTC(anio, mm - 1, dd));
}


export class Db2VentaAdapter implements IVentaExternaPort{

    async findByCodigo(cod: number, nroItem?: number): Promise<VentaExterna | null> {
        const resultado = await findVenta(cod, nroItem);

        const cabeceras = soloFilas(resultado.cab_venta);
        const cabecera = cabeceras[0];

        // sin cabecera, la venta no existe en DB2
        if(!cabecera){
            return null;
        }

        const items:ItemVentaExterna[] = soloFilas(resultado.det_venta).map((fila)=>({
            nroItem: entero(fila["nro_item"]),
            codItem: texto(fila["cod_item"]) ?? "",
            dim1: entero(fila["dim1"]),
            dim2: entero(fila["dim2"]),
            dim3: entero(fila["dim3"]),
            cantidad: entero(fila["cantidad"]),
            marcaPieza: texto(fila["marca_pieza"]),
        }));

        const montoTotal = cabecera["monto_total"];

        return {
            codVenta: entero(cabecera["cod_venta"]),
            nomCliente: texto(cabecera["nom_cliente"]) ?? "",
            rutCliente: texto(cabecera["rut_cliente"]),
            idVendedor: texto(cabecera["id_vendedor"]),
            fechaOrden: fechaDesdeYYMMDD(cabecera["fecha_orden"]),
            instrucciones: texto(cabecera["instrucciones"]),
            montoTotal: montoTotal === null || montoTotal === undefined ? null : Number(montoTotal),
            items: items.sort((a,b)=>a.nroItem-b.nroItem),
        };
    }
}
