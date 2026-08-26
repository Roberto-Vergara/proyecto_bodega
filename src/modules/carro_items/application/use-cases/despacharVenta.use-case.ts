import { ConflictError } from "../../../shared/domain/errors.js";
import type { IUnitOfWorkRunner } from "../../../shared/domain/unit-of-work.port.js";
import { sincronizarOcupacion } from "../service/sincronizar-ocupacion.js";


export interface DespacharVentaOutput{
    cod_venta:number;
    items_despachados:number;
    carros_liberados:{carro_id:string;nro_carro:number;quedo_vacio:boolean}[];
}


/**
 * Cierra el ciclo: los vidrios de la venta salieron de la planta.
 *
 * No se borran las filas, se les pone despachado_en. Asi queda el historico de
 * que salio, cuando y desde que carro, y ademas el indice unico parcial deja
 * volver a usar el mismo carro para la misma venta mas adelante sin chocar.
 *
 * Los carros que quedan sin nada vuelven a VACIO (y si estaban marcados LLENO,
 * se destildan solos).
 */
export class DespacharVentaUseCase{
    constructor(private readonly uow:IUnitOfWorkRunner){}

    async execute(codVenta:number):Promise<DespacharVentaOutput>{
        return this.uow.run(async (uow)=>{
            const { carrosAfectados, itemsDespachados } = await uow.carroItems.despacharVenta(codVenta);

            if(itemsDespachados === 0){
                throw new ConflictError(
                    `La venta ${codVenta} no tiene vidrios cargados en ningun carro`,
                );
            }

            const carrosLiberados:DespacharVentaOutput["carros_liberados"] = [];

            for(const carroId of carrosAfectados){
                await sincronizarOcupacion(uow, carroId);

                const carro = await uow.carros.findById(carroId);

                if(carro){
                    carrosLiberados.push({
                        carro_id: carro.id,
                        nro_carro: carro.nroCarro,
                        quedo_vacio: carro.estaVacio(),
                    });
                }
            }

            return {
                cod_venta: codVenta,
                items_despachados: itemsDespachados,
                carros_liberados: carrosLiberados,
            };
        });
    }
}
