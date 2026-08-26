import type { ICarroItemRepository } from "../../../carro_items/domain/carro-item.repository.js";
import { NotFoundError } from "../../../shared/domain/errors.js";
import type { IVentaLogRepository } from "../../domain/venta-log.repository.js";


export interface LineaDistribucionDto{
    nro_item:number;
    cod_item:string;
    marca_pieza:string|null;
    dimensiones:string;
    cantidad_total:number;
    cantidad_asignada:number;
    disponible:number;
    en_carros:{carro_id:string;nro_carro:number;cantidad:number}[];
}

export interface DistribucionVentaDto{
    cod_venta:number;
    nom_cliente:string;
    total_piezas_en_carros:number;
    carros:{carro_id:string;nro_carro:number;piezas:number}[];
    items:LineaDistribucionDto[];
}


/**
 * "Donde esta repartida esta venta".
 *
 * A diferencia de BuscarVenta, esta NO consulta DB2: sale todo del snapshot
 * local. Es la consulta que se hace cuando llega el camion y hay que ir a
 * buscar los carros, asi que tiene que responder siempre, aunque el AS400
 * este caido.
 */
export class ObtenerDistribucionVentaUseCase{
    constructor(
        private readonly carroItemRepository:ICarroItemRepository,
        private readonly ventaLogRepository:IVentaLogRepository,
    ){}

    async execute(codVenta:number):Promise<DistribucionVentaDto>{
        const venta = await this.ventaLogRepository.findByCodVenta(codVenta);

        if(!venta){
            throw new NotFoundError(`La venta ${codVenta} nunca se ha consultado en el sistema`);
        }

        const items = await this.carroItemRepository.findActivosPorVenta(codVenta);
        const distribucion = await this.carroItemRepository.distribucionPorVenta(codVenta);

        // el mismo item puede estar en varios carros: se agrupa por nro_item
        const porItem = new Map<number,{asignada:number;muestra:(typeof items)[number]}>();
        const porCarro = new Map<string,{nro_carro:number;piezas:number}>();

        for(const item of items){
            const acumulado = porItem.get(item.nroItem);

            if(acumulado){
                acumulado.asignada += item.cantidadAsignada;
            }else{
                porItem.set(item.nroItem,{asignada:item.cantidadAsignada,muestra:item});
            }
        }

        for(const [nroItem, ubicaciones] of distribucion){
            void nroItem;

            for(const u of ubicaciones){
                const acumulado = porCarro.get(u.carroId);

                if(acumulado){
                    acumulado.piezas += u.cantidad;
                }else{
                    porCarro.set(u.carroId,{nro_carro:u.nroCarro,piezas:u.cantidad});
                }
            }
        }

        const lineas:LineaDistribucionDto[] = [...porItem.entries()]
            .sort((a,b)=>a[0]-b[0])
            .map(([nroItem,{asignada,muestra}])=>({
                nro_item: nroItem,
                cod_item: muestra.codItem,
                marca_pieza: muestra.marcaPieza,
                dimensiones: muestra.dimensiones(),
                cantidad_total: muestra.cantidadTotalItem,
                cantidad_asignada: asignada,
                disponible: Math.max(muestra.cantidadTotalItem - asignada, 0),
                en_carros: (distribucion.get(nroItem) ?? []).map((u)=>({
                    carro_id: u.carroId,
                    nro_carro: u.nroCarro,
                    cantidad: u.cantidad,
                })),
            }));

        return {
            cod_venta: codVenta,
            nom_cliente: venta.nomCliente,
            total_piezas_en_carros: items.reduce((t,i)=>t+i.cantidadAsignada,0),
            carros: [...porCarro.entries()]
                .map(([carroId,{nro_carro,piezas}])=>({carro_id:carroId,nro_carro,piezas}))
                .sort((a,b)=>a.nro_carro-b.nro_carro),
            items: lineas,
        };
    }
}
