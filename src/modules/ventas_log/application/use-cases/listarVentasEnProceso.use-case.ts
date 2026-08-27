import type { ICarroItemRepository } from "../../../carro_items/domain/carro-item.repository.js";
import type { IVentaLogRepository } from "../../domain/venta-log.repository.js";


export interface VentaEnProcesoDto{
    cod_venta:number;
    nom_cliente:string|null;
    piezas_en_carros:number;
    // cuantas lineas de carro_items tiene (un item repartido en 2 carros son 2)
    lineas:number;
    carros:number;
    ultima_carga:string;
}


/**
 * Las ventas que tienen vidrios cargados en algun carro AHORA.
 *
 * Es la puerta de entrada del dashboard. Hasta ahora todas las rutas de venta
 * pedian el numero de nota (/ventas/:codVenta), asi que solo podias consultar
 * una venta si ya sabias cual: no habia forma de preguntar "que hay a medio
 * cargar en la planta".
 *
 * No toca DB2: sale todo del espejo local, asi que responde aunque el AS400
 * este caido.
 */
export class ListarVentasEnProcesoUseCase{
    constructor(
        private readonly carroItemRepository:ICarroItemRepository,
        private readonly ventaLogRepository:IVentaLogRepository,
    ){}

    async execute():Promise<VentaEnProcesoDto[]>{
        const ventas = await this.carroItemRepository.ventasEnProceso();

        const resultado:VentaEnProcesoDto[] = [];

        for(const venta of ventas){
            // el nombre del cliente vive en el espejo de la cabecera
            const cabecera = await this.ventaLogRepository.findByCodVenta(venta.codVenta);

            resultado.push({
                cod_venta: venta.codVenta,
                nom_cliente: cabecera?.nomCliente ?? null,
                piezas_en_carros: venta.piezasEnCarros,
                lineas: venta.lineas,
                carros: venta.carros,
                ultima_carga: venta.ultimaCarga.toISOString(),
            });
        }

        return resultado;
    }
}
