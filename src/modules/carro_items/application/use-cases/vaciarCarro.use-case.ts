import type { LineaContenidoDto } from "../../../carros/application/dto/contenidoCarro.dto.js";
import { ConflictError, NotFoundError } from "../../../shared/domain/errors.js";
import type { IIdGenPort } from "../../../shared/domain/idGen.port.js";
import type { IUnitOfWorkRunner } from "../../../shared/domain/unit-of-work.port.js";
import { LoteMovimientos } from "../../../movimientos/application/service/lote-movimientos.js";
import { Movimiento } from "../../../movimientos/domain/movimiento.domain.js";
import { sincronizarOcupacion } from "../service/sincronizar-ocupacion.js";


export interface VaciarCarroInput{
    carroId:string;
    usuarioId:string|null;
    // queda guardado en la bitacora: sirve para saber por que se vacio
    motivo?:string;
}

export interface VaciarCarroOutput{
    carro_id:string;
    nro_carro:number;
    piezas_retiradas:number;
    lineas_retiradas:number;
    /**
     * Lo que HABIA en el carro justo antes de vaciarlo.
     *
     * Se devuelve con la misma forma que GET /carros/:id para que el cliente
     * pueda reusar el tipo: sirve para mostrar el comprobante, imprimir la
     * lista de lo descargado, o volver a cargarlo en otro carro.
     */
    contenido:LineaContenidoDto[];
}


/**
 * Saca TODO el contenido de un carro de una vez.
 *
 * Es descargar en bloque: los vidrios vuelven a "pendientes por cargar" de su
 * venta, no se despachan. Para cerrar el ciclo de una venta esta
 * DespacharVentaUseCase.
 *
 * A diferencia de descargar linea por linea, aca devolvemos el contenido
 * retirado, porque el operario normalmente lo necesita para saber que tiene
 * en las manos despues de vaciar.
 */
export class VaciarCarroUseCase{
    constructor(
        private readonly uow:IUnitOfWorkRunner,
        private readonly idGen:IIdGenPort,
    ){}

    async execute(input:VaciarCarroInput):Promise<VaciarCarroOutput>{
        return this.uow.run(async (uow)=>{
            const carro = await uow.carros.findById(input.carroId);

            if(!carro){
                throw new NotFoundError(`No existe el carro ${input.carroId}`);
            }

            const items = await uow.carroItems.findActivosPorCarro(input.carroId);

            if(items.length === 0){
                throw new ConflictError(`El carro ${carro.nroCarro} ya esta vacio`);
            }

            // el nombre del cliente por venta, para devolver el contenido completo
            const codigos = [...new Set(items.map((item)=>item.codVenta))];
            const clientes = new Map<number,string>();

            for(const cod of codigos){
                const venta = await uow.ventas.findByCodVenta(cod);
                if(venta) clientes.set(cod, venta.nomCliente);
            }

            // se arma la respuesta ANTES de borrar, que es justamente el dato
            // que el operario necesita
            const contenido:LineaContenidoDto[] = items.map((item)=>({
                item_id: item.id,
                cod_venta: item.codVenta,
                nom_cliente: clientes.get(item.codVenta) ?? null,
                nro_item: item.nroItem,
                cod_item: item.codItem,
                marca_pieza: item.marcaPieza,
                dimensiones: item.dimensiones(),
                cantidad_en_este_carro: item.cantidadAsignada,
                cantidad_total_item: item.cantidadTotalItem,
                estado_item: item.estadoItem(),
                fecha_asignacion: item.fechaAsignacion.toISOString(),
            }));

            const lote = new LoteMovimientos(this.idGen, input.usuarioId);
            const referencia = {id:carro.id, nroCarro:carro.nroCarro};

            const movimientos = items.map((item)=>Movimiento.vaciado(
                lote.ctx(),
                referencia,
                {
                    codVenta: item.codVenta,
                    nroItem: item.nroItem,
                    codItem: item.codItem,
                    cantidad: item.cantidadAsignada,
                },
                {
                    marca_pieza: item.marcaPieza,
                    dimensiones: item.dimensiones(),
                    ...(input.motivo !== undefined && { motivo: input.motivo }),
                },
            ));

            for(const item of items){
                await uow.carroItems.delete(item.id);
            }

            await uow.movimientos.registrarMuchos(movimientos);
            await sincronizarOcupacion(uow, input.carroId);

            return {
                carro_id: carro.id,
                nro_carro: carro.nroCarro,
                piezas_retiradas: items.reduce((total,item)=>total+item.cantidadAsignada,0),
                lineas_retiradas: items.length,
                contenido,
            };
        });
    }
}
