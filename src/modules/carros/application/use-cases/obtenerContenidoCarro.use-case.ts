import type { ICarroItemRepository } from "../../../carro_items/domain/carro-item.repository.js";
import { NotFoundError } from "../../../shared/domain/errors.js";
import type { IVentaLogRepository } from "../../../ventas_log/domain/venta-log.repository.js";
import type { ICarroRepository } from "../../domain/carro.repository.js";
import type { ContenidoCarroDto, LineaContenidoDto } from "../dto/contenidoCarro.dto.js";


/**
 * Que lleva un carro adentro.
 *
 * NO toca DB2: todo sale del snapshot que quedo guardado en carro_items al
 * momento de cargar. Es la pantalla que mas se abre en planta y el AS400 es
 * lento, asi que tiene que responder siempre y rapido.
 */
export class ObtenerContenidoCarroUseCase{
    constructor(
        private readonly carroRepository:ICarroRepository,
        private readonly carroItemRepository:ICarroItemRepository,
        private readonly ventaLogRepository:IVentaLogRepository,
    ){}

    async execute(carroId:string):Promise<ContenidoCarroDto>{
        const carro = await this.carroRepository.findById(carroId);

        if(!carro){
            throw new NotFoundError(`No existe el carro ${carroId}`);
        }

        const items = await this.carroItemRepository.findActivosPorCarro(carroId);

        // un carro puede llevar vidrios de varias ventas distintas: buscamos
        // el nombre del cliente de cada una, una sola vez por venta
        const codigos = [...new Set(items.map((item)=>item.codVenta))];
        const clientes = new Map<number,string>();

        for(const cod of codigos){
            const venta = await this.ventaLogRepository.findByCodVenta(cod);
            if(venta){
                clientes.set(cod, venta.nomCliente);
            }
        }

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

        return {
            carro_id: carro.id,
            nro_carro: carro.nroCarro,
            estado_carro: carro.estado,
            ocupacion: carro.ocupacion,
            ubicacion_carro: carro.ubicacion,
            total_piezas_cargadas: items.reduce((total,item)=>total+item.cantidadAsignada,0),
            contenido,
        };
    }
}
