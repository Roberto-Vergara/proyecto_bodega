import type { IUserRepository } from "../../../users/domain/user.repository.js";
import { TipoMovimiento } from "../../domain/movimiento.domain.js";
import type { FiltrosMovimiento, IMovimientoRepository } from "../../domain/movimiento.repository.js";


export interface MovimientoDto{
    id:string;
    lote_id:string;
    tipo:TipoMovimiento;
    // frase lista para mostrar en el dashboard sin tener que armarla en el front
    descripcion:string;
    carro_id:string|null;
    nro_carro:number|null;
    carro_destino_id:string|null;
    nro_carro_destino:number|null;
    cod_venta:number|null;
    nro_item:number|null;
    cod_item:string|null;
    cantidad:number|null;
    detalle:Record<string,unknown>|null;
    usuario_id:string|null;
    usuario_nombre:string|null;
    creado_en:string;
}

export interface ListarMovimientosOutput{
    movimientos:MovimientoDto[];
    total:number;
    limite:number;
    offset:number;
}


const LIMITE_POR_DEFECTO = 50;
const LIMITE_MAXIMO = 200;


export class ListarMovimientosUseCase{
    constructor(
        private readonly movimientoRepository:IMovimientoRepository,
        private readonly userRepository:IUserRepository,
    ){}

    async execute(
        filtros:FiltrosMovimiento,
        limite = LIMITE_POR_DEFECTO,
        offset = 0,
    ):Promise<ListarMovimientosOutput>{
        const limiteReal = Math.min(Math.max(limite,1), LIMITE_MAXIMO);
        const offsetReal = Math.max(offset,0);

        const { movimientos, total } = await this.movimientoRepository.buscar(
            filtros,
            limiteReal,
            offsetReal,
        );

        // el nombre de quien hizo cada cosa. Se resuelve aca y no con un JOIN
        // para no acoplar la tabla de bitacora a la de usuarios: son pocos
        // usuarios distintos por pagina, asi que sale barato
        const idsUsuarios = [...new Set(
            movimientos.map((m)=>m.usuarioId).filter((id):id is string => id !== null),
        )];

        const nombres = new Map<string,string>();

        for(const id of idsUsuarios){
            const user = await this.userRepository.findById(id);
            if(user) nombres.set(id, `${user.nombre} ${user.apellido}`);
        }

        return {
            movimientos: movimientos.map((m)=>({
                id: m.id,
                lote_id: m.loteId,
                tipo: m.tipo,
                descripcion: describir(m.tipo, {
                    nroCarro: m.nroCarro,
                    nroCarroDestino: m.nroCarroDestino,
                    cantidad: m.cantidad,
                    codItem: m.codItem,
                    codVenta: m.codVenta,
                    nroItem: m.nroItem,
                    detalle: m.detalle,
                }),
                carro_id: m.carroId,
                nro_carro: m.nroCarro,
                carro_destino_id: m.carroDestinoId,
                nro_carro_destino: m.nroCarroDestino,
                cod_venta: m.codVenta,
                nro_item: m.nroItem,
                cod_item: m.codItem,
                cantidad: m.cantidad,
                detalle: m.detalle,
                usuario_id: m.usuarioId,
                usuario_nombre: m.usuarioId === null ? null : (nombres.get(m.usuarioId) ?? null),
                creado_en: m.creadoEn.toISOString(),
            })),
            total,
            limite: limiteReal,
            offset: offsetReal,
        };
    }
}


interface DatosDescripcion{
    nroCarro:number|null;
    nroCarroDestino:number|null;
    cantidad:number|null;
    codItem:string|null;
    codVenta:number|null;
    nroItem:number|null;
    detalle:Record<string,unknown>|null;
}

/**
 * Arma la frase que se muestra en el dashboard.
 *
 * Se genera al leer y no al escribir a proposito: si algun dia cambia la
 * redaccion, el historial viejo tambien la toma. Si estuviera guardada en la
 * tabla, quedarian frases con formatos distintos segun la epoca.
 */
function describir(tipo:TipoMovimiento, d:DatosDescripcion):string{
    const carro = d.nroCarro === null ? "un carro" : `el carro ${d.nroCarro}`;
    // "de el carro" suena mal: la contraccion hay que hacerla a mano
    const delCarro = d.nroCarro === null ? "un carro" : `del carro ${d.nroCarro}`;
    const vidrios = `${d.cantidad ?? 0} x ${d.codItem ?? "?"} (venta ${d.codVenta ?? "?"} item ${d.nroItem ?? "?"})`;

    switch(tipo){
        case TipoMovimiento.CARRO_CREADO:
            return `Se creo ${carro}`;
        case TipoMovimiento.CARGA:
            return `Se cargaron ${vidrios} en ${carro}`;
        case TipoMovimiento.MOVIMIENTO:
            return `Se movieron ${vidrios} del carro ${d.nroCarro ?? "?"} al carro ${d.nroCarroDestino ?? "?"}`;
        case TipoMovimiento.DESCARGA:
            return `Se descargaron ${vidrios} ${delCarro}`;
        case TipoMovimiento.VACIADO:
            return `Se vacio ${carro}: salieron ${vidrios}`;
        case TipoMovimiento.DESPACHO:
            return `Se despacharon ${vidrios} desde ${carro}`;
        case TipoMovimiento.CAMBIO_ESTADO:
            return `${carro} paso de "${d.detalle?.["estado_anterior"] ?? "?"}" a "${d.detalle?.["estado_nuevo"] ?? "?"}"`;
        case TipoMovimiento.CAMBIO_UBICACION:
            return `${carro} se movio de "${d.detalle?.["ubicacion_anterior"] ?? "?"}" a "${d.detalle?.["ubicacion_nueva"] ?? "?"}"`;
    }
}
