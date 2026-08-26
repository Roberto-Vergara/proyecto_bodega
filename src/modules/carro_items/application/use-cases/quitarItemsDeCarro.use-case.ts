import { ConflictError, NotFoundError, ValidationError } from "../../../shared/domain/errors.js";
import type { IUnitOfWorkRunner } from "../../../shared/domain/unit-of-work.port.js";
import { sincronizarOcupacion } from "../service/sincronizar-ocupacion.js";


export interface QuitarItemsInput{
    carroItemId:string;
    // si no viene, se saca todo el item del carro
    cantidad?:number;
}

export interface QuitarItemsOutput{
    quitadas:number;
    carro_id:string;
    // cuantas quedaron en el carro (0 = se elimino la linea)
    quedan_en_el_carro:number;
    carro_quedo_vacio:boolean;
}


/**
 * Descargar vidrios de un carro.
 *
 * Sacar vidrios los devuelve al pool de "pendientes por cargar" de la venta:
 * no es un despacho, no queda historico. Para cerrar el ciclo de una venta
 * esta DespacharVentaUseCase, que si conserva la trazabilidad.
 */
export class QuitarItemsDeCarroUseCase{
    constructor(private readonly uow:IUnitOfWorkRunner){}

    async execute(input:QuitarItemsInput):Promise<QuitarItemsOutput>{
        return this.uow.run(async (uow)=>{
            const item = await uow.carroItems.findById(input.carroItemId);

            if(!item){
                throw new NotFoundError(`No existe la asignacion ${input.carroItemId}`);
            }

            if(item.estaDespachado()){
                throw new ConflictError("Esa asignacion ya fue despachada");
            }

            const cantidad = input.cantidad ?? item.cantidadAsignada;

            if(!Number.isInteger(cantidad) || cantidad <= 0){
                throw new ValidationError("La cantidad debe ser un entero positivo");
            }

            if(cantidad > item.cantidadAsignada){
                throw new ValidationError(
                    `No se pueden quitar ${cantidad} unidades: el carro solo tiene ${item.cantidadAsignada}`,
                );
            }

            const carroId = item.carroId;
            let quedan:number;

            if(cantidad === item.cantidadAsignada){
                // se saca todo: la fila se borra, no se deja en cero
                await uow.carroItems.delete(item.id);
                quedan = 0;
            }else{
                item.descontar(cantidad);
                await uow.carroItems.save(item);
                quedan = item.cantidadAsignada;
            }

            await sincronizarOcupacion(uow, carroId);

            return {
                quitadas: cantidad,
                carro_id: carroId,
                quedan_en_el_carro: quedan,
                carro_quedo_vacio: (await uow.carroItems.contarActivosPorCarro(carroId)) === 0,
            };
        });
    }
}
