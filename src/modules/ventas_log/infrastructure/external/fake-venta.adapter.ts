import type { IVentaExternaPort, VentaExterna } from "../../domain/venta-externa.port.js";


// ==========================================================================
// Adapter de mentira para desarrollar y probar sin el AS400.
//
// Se activa con VENTAS_SOURCE=fake. Sirve para dos cosas:
//   - trabajar cuando el AS400 no esta disponible (te corta la conexion a
//     los 40 min y no siempre esta arriba)
//   - tener datos estables para los tests de humo
//
// La venta 777777 son los datos REALES que devolvio DB2, para que lo que se
// pruebe aca se parezca a lo que pasa en produccion.
// ==========================================================================

const VENTAS: VentaExterna[] = [
    {
        codVenta: 777777,
        nomCliente: "VIDRIOS DELL ORTO S.A.",
        rutCliente: "91216000",
        idVendedor: "I15",
        fechaOrden: new Date(Date.UTC(2026, 0, 20)),
        instrucciones: "SENDEROS DE LOS ANDES V2 Y V4",
        montoTotal: 85,
        items: [
            { nroItem: 1, codItem: "CRP8.885", dim1: 545, dim2: 375, dim3: 0, cantidad: 17, marcaPieza: "V4-P" },
            { nroItem: 2, codItem: "CRP8.885", dim1: 595, dim2: 425, dim3: 0, cantidad: 17, marcaPieza: "V4-F" },
            { nroItem: 3, codItem: "CRP8.885", dim1: 795, dim2: 625, dim3: 0, cantidad: 34, marcaPieza: "V2-F" },
            { nroItem: 4, codItem: "CRP8.885", dim1: 753, dim2: 612, dim3: 0, cantidad: 17, marcaPieza: "V4-P" },
        ],
    },
    {
        codVenta: 888888,
        nomCliente: "CONSTRUCTORA CRISTALES CHILE",
        rutCliente: "76543210",
        idVendedor: "A02",
        fechaOrden: new Date(Date.UTC(2026, 1, 10)),
        instrucciones: "EDIFICIO CENTRAL",
        montoTotal: 25,
        items: [
            { nroItem: 1, codItem: "LAM10.10", dim1: 1200, dim2: 800, dim3: 0, cantidad: 25, marcaPieza: "VENTANA-A1" },
        ],
    },

    // --------------------------------------------------------------------
    // Ventas EXCLUSIVAS del script de humo (pnpm smoke:carros).
    //
    // Existen aparte porque el script borra las asignaciones de las ventas
    // que usa en TODOS los carros, para poder correr limpio siempre. Si
    // usara la 777777 (que es una nota de venta real y que alguien puede
    // estar probando a mano), le borraria el trabajo a esa persona.
    //
    // Numeros altos y feos a proposito: nadie los va a teclear por error.
    // --------------------------------------------------------------------
    {
        codVenta: 999001,
        nomCliente: "CLIENTE DE PRUEBA SMOKE",
        rutCliente: "11111111",
        idVendedor: "T01",
        fechaOrden: new Date(Date.UTC(2026, 0, 20)),
        instrucciones: "SOLO PARA TESTS AUTOMATICOS",
        montoTotal: 85,
        items: [
            { nroItem: 1, codItem: "CRP8.885", dim1: 545, dim2: 375, dim3: 0, cantidad: 17, marcaPieza: "V4-P" },
            { nroItem: 2, codItem: "CRP8.885", dim1: 595, dim2: 425, dim3: 0, cantidad: 17, marcaPieza: "V4-F" },
            { nroItem: 3, codItem: "CRP8.885", dim1: 795, dim2: 625, dim3: 0, cantidad: 34, marcaPieza: "V2-F" },
            { nroItem: 4, codItem: "CRP8.885", dim1: 753, dim2: 612, dim3: 0, cantidad: 17, marcaPieza: "V4-P" },
        ],
    },
    {
        codVenta: 999002,
        nomCliente: "OTRO CLIENTE DE PRUEBA SMOKE",
        rutCliente: "22222222",
        idVendedor: "T02",
        fechaOrden: new Date(Date.UTC(2026, 1, 10)),
        instrucciones: "SOLO PARA TESTS AUTOMATICOS",
        montoTotal: 25,
        items: [
            { nroItem: 1, codItem: "LAM10.10", dim1: 1200, dim2: 800, dim3: 0, cantidad: 25, marcaPieza: "VENTANA-A1" },
        ],
    },
];


export class FakeVentaAdapter implements IVentaExternaPort{

    async findByCodigo(cod: number, nroItem?: number): Promise<VentaExterna | null> {
        const venta = VENTAS.find((v)=>v.codVenta === cod);

        if(!venta){
            return null;
        }

        // se copia para que nadie mute el arreglo de arriba entre llamadas
        const items = nroItem === undefined
            ? venta.items
            : venta.items.filter((item)=>item.nroItem === nroItem);

        return {
            ...venta,
            items: items.map((item)=>({...item})),
        };
    }
}
