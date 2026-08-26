import type {
    ICarroItemRepository,
    ResumenDespacho,
    UbicacionDeItem,
} from "../../../carro_items/domain/carro-item.repository.js";
import { NotFoundError } from "../../../shared/domain/errors.js";
import type { IIdGenPort } from "../../../shared/domain/idGen.port.js";
import { VentaLog } from "../../domain/venta-log.domain.js";
import type { IVentaLogRepository } from "../../domain/venta-log.repository.js";
import type { IVentaExternaPort, VentaExterna } from "../../domain/venta-externa.port.js";
import type { EnCarroDto, ItemVentaDto, VentaDto } from "../dto/venta.dto.js";


export interface BuscarVentaInput{
    codVenta:number;
    // el operario suele buscar por nota de venta + item, cuando ya sabe
    // que vidrio esta cargando
    nroItem?:number;
}


/**
 * El "autocompletar" de la pantalla de carga.
 *
 * Consulta DB2 (la fuente de verdad de lo comercial), refresca el espejo local
 * y le suma la parte logistica: cuanto de cada item ya esta cargado, cuanto
 * falta y en que carros esta repartido.
 *
 * Si el AS400 no responde pero la venta ya estaba espejada, devuelve lo local
 * marcado como desactualizado en vez de dejar al operario sin nada.
 */
export class BuscarVentaUseCase{
    constructor(
        private readonly ventaExterna:IVentaExternaPort,
        private readonly ventaLogRepository:IVentaLogRepository,
        private readonly carroItemRepository:ICarroItemRepository,
        private readonly idGen:IIdGenPort,
    ){}

    async execute(input:BuscarVentaInput):Promise<VentaDto>{
        const { codVenta, nroItem } = input;

        let externa:VentaExterna|null;

        try {
            externa = await this.ventaExterna.findByCodigo(codVenta, nroItem);
        } catch (error) {
            // DB2 caido: intentamos salvar la consulta con el espejo local
            console.error(`[VENTAS] DB2 no respondio para la venta ${codVenta}:`, error);
            return this.desdeEspejoLocal(codVenta, nroItem);
        }

        if(!externa){
            throw new NotFoundError(`No existe la venta ${codVenta}`);
        }

        await this.refrescarEspejo(externa);

        const asignadas = await this.carroItemRepository.cantidadesAsignadasDeVenta(codVenta);
        const distribucion = await this.carroItemRepository.distribucionPorVenta(codVenta);
        const despacho = await this.carroItemRepository.resumenDespachoDeVenta(codVenta);
        const avisos:string[] = [];

        // esta venta ya salio de la planta antes. Puede ser un reproceso
        // legitimo (devolucion, piezas rehechas) o que la esten cargando de
        // nuevo por error: no bloqueamos, avisamos y que decida el operario
        const avisoDespacho = armarAvisoDespacho(despacho);

        if(avisoDespacho !== null){
            avisos.push(avisoDespacho);
        }

        const items:ItemVentaDto[] = externa.items.map((item)=>{
            const asignada = asignadas.get(item.nroItem) ?? 0;
            const disponible = item.cantidad - asignada;

            // la venta pudo cambiar en DB2 despues de que cargamos los carros
            // (anularon el item, bajaron la cantidad). No tocamos nada solo,
            // pero hay que avisarle a alguien
            if(disponible < 0){
                avisos.push(
                    `El item ${item.nroItem} tiene ${asignada} unidades en carros pero en DB2 ` +
                    `ahora figuran solo ${item.cantidad} vendidas. Hay que revisar los carros.`,
                );
            }

            return {
                nro_item: item.nroItem,
                cod_item: item.codItem,
                dim1: item.dim1,
                dim2: item.dim2,
                dim3: item.dim3,
                dimensiones: formatearDimensiones(item.dim1, item.dim2, item.dim3),
                marca_pieza: item.marcaPieza,
                cantidad_total: item.cantidad,
                cantidad_asignada: asignada,
                disponible: Math.max(disponible, 0),
                en_carros: aEnCarros(distribucion.get(item.nroItem)),
            };
        });

        return {
            cod_venta: externa.codVenta,
            nom_cliente: externa.nomCliente,
            rut_cliente: externa.rutCliente,
            id_vendedor: externa.idVendedor,
            fecha_orden: aFechaISO(externa.fechaOrden),
            instrucciones: externa.instrucciones,
            monto_total: externa.montoTotal,
            desactualizado: false,
            ultima_consulta: new Date().toISOString(),
            ya_despachada: despacho.piezasDespachadas > 0,
            piezas_despachadas: despacho.piezasDespachadas,
            ultimo_despacho: despacho.ultimoDespacho?.toISOString() ?? null,
            items,
            avisos,
        };
    }

    // upsert de la cabecera: si ya estaba, se refresca conservando su id
    private async refrescarEspejo(externa:VentaExterna):Promise<void>{
        const datos = {
            nomCliente: externa.nomCliente,
            rutCliente: externa.rutCliente,
            idVendedor: externa.idVendedor,
            fechaOrden: externa.fechaOrden,
            instrucciones: externa.instrucciones,
            montoTotal: externa.montoTotal,
        };

        const existente = await this.ventaLogRepository.findByCodVenta(externa.codVenta);

        if(existente){
            existente.refrescarDesdeExterno(datos);
            await this.ventaLogRepository.save(existente);
            return;
        }

        await this.ventaLogRepository.save(VentaLog.crear({
            id: this.idGen.generate(),
            codVenta: externa.codVenta,
            ultimaConsulta: new Date(),
            ...datos,
        }));
    }

    /**
     * Modo degradado: DB2 no contesta.
     *
     * Se arma la respuesta con la cabecera espejada y con el snapshot que
     * quedo guardado en carro_items. Solo se ven los items que YA estan
     * cargados en algun carro (de los otros no tenemos copia local), por eso
     * va marcado como desactualizado.
     */
    private async desdeEspejoLocal(codVenta:number, nroItem?:number):Promise<VentaDto>{
        const venta = await this.ventaLogRepository.findByCodVenta(codVenta);

        if(!venta){
            throw new NotFoundError(
                `No se pudo consultar DB2 y la venta ${codVenta} no esta espejada localmente`,
            );
        }

        const activos = await this.carroItemRepository.findActivosPorVenta(codVenta);
        const distribucion = await this.carroItemRepository.distribucionPorVenta(codVenta);
        const despacho = await this.carroItemRepository.resumenDespachoDeVenta(codVenta);
        const avisoDespacho = armarAvisoDespacho(despacho);

        // varios carros pueden tener el mismo item: agrupamos por nro_item
        const porItem = new Map<number,{total:number;asignada:number;muestra:(typeof activos)[number]}>();

        for(const item of activos){
            if(nroItem !== undefined && item.nroItem !== nroItem) continue;

            const acumulado = porItem.get(item.nroItem);

            if(acumulado){
                acumulado.asignada += item.cantidadAsignada;
            }else{
                porItem.set(item.nroItem,{
                    total: item.cantidadTotalItem,
                    asignada: item.cantidadAsignada,
                    muestra: item,
                });
            }
        }

        const items:ItemVentaDto[] = [...porItem.entries()]
            .sort((a,b)=>a[0]-b[0])
            .map(([nro,{total,asignada,muestra}])=>({
                nro_item: nro,
                cod_item: muestra.codItem,
                dim1: muestra.dim1,
                dim2: muestra.dim2,
                dim3: muestra.dim3,
                dimensiones: muestra.dimensiones(),
                marca_pieza: muestra.marcaPieza,
                cantidad_total: total,
                cantidad_asignada: asignada,
                disponible: Math.max(total - asignada, 0),
                en_carros: aEnCarros(distribucion.get(nro)),
            }));

        return {
            cod_venta: venta.codVenta,
            nom_cliente: venta.nomCliente,
            rut_cliente: venta.rutCliente,
            id_vendedor: venta.idVendedor,
            fecha_orden: aFechaISO(venta.fechaOrden),
            instrucciones: venta.instrucciones,
            monto_total: venta.montoTotal,
            desactualizado: true,
            ultima_consulta: venta.ultimaConsulta.toISOString(),
            ya_despachada: despacho.piezasDespachadas > 0,
            piezas_despachadas: despacho.piezasDespachadas,
            ultimo_despacho: despacho.ultimoDespacho?.toISOString() ?? null,
            items,
            avisos: [
                "No se pudo consultar DB2. Estos datos son la ultima copia local y " +
                "solo incluyen los items que ya estan cargados en algun carro.",
                ...(avisoDespacho !== null ? [avisoDespacho] : []),
            ],
        };
    }
}


/**
 * Aviso de "esta venta ya se despacho".
 *
 * Devuelve null si nunca salio nada, que es el caso normal.
 */
function armarAvisoDespacho(despacho:ResumenDespacho):string|null{
    if(despacho.piezasDespachadas === 0){
        return null;
    }

    const cuando = despacho.ultimoDespacho === null
        ? ""
        : ` (ultima salida: ${despacho.ultimoDespacho.toISOString().slice(0,10)})`;

    return (
        `Esta venta ya tiene ${despacho.piezasDespachadas} piezas despachadas${cuando}. ` +
        "Si la vas a cargar de nuevo, confirma que sea un reproceso y no una carga repetida."
    );
}

function aEnCarros(ubicaciones:UbicacionDeItem[]|undefined):EnCarroDto[]{
    return (ubicaciones ?? []).map((u)=>({
        carro_id: u.carroId,
        nro_carro: u.nroCarro,
        cantidad: u.cantidad,
    }));
}

function aFechaISO(fecha:Date|null):string|null{
    if(fecha === null) return null;
    return fecha.toISOString().slice(0,10);
}

// dim3 viene en 0 en todo lo que hemos visto, por eso solo se muestra si trae algo
export function formatearDimensiones(dim1:number,dim2:number,dim3:number):string{
    const base = `${dim1} x ${dim2}`;
    return dim3 > 0 ? `${base} x ${dim3} mm` : `${base} mm`;
}
