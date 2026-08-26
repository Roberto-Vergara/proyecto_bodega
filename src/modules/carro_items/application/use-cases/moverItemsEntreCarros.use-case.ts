import { ConflictError, NotFoundError, ValidationError } from "../../../shared/domain/errors.js";
import type { IIdGenPort } from "../../../shared/domain/idGen.port.js";
import type { IUnitOfWorkRunner } from "../../../shared/domain/unit-of-work.port.js";
import { CarroItem } from "../../domain/carro-item.domain.js";
import { sincronizarOcupacion } from "../service/sincronizar-ocupacion.js";


export interface MoverItemsInput{
    carroItemId:string;
    carroDestinoId:string;
    /**
     * Cuantas unidades mover. Si no viene, se mueve todo lo que haya de ese
     * item en el carro de origen.
     */
    cantidad?:number;
}

export interface MoverItemsOutput{
    movidas:number;
    carro_origen_id:string;
    carro_destino_id:string;
    // el id de la fila en el destino (puede ser nueva o una que ya existia)
    item_id_destino:string;
    origen_quedo_vacio:boolean;
}


/**
 * Mover vidrios de un carro a otro.
 *
 * Cubre los tres casos que pasan en planta:
 *   - mover todo el item y que el destino no lo tenga  -> cambia de carro
 *   - mover todo el item y que el destino ya lo tenga  -> se fusionan las filas
 *   - mover solo una parte                             -> se parte en dos filas
 *
 * No toca DB2: mover vidrios no cambia nada de lo comercial, y la suma total
 * repartida no varia, asi que la invariante de "no pasarse de lo vendido"
 * sigue cumpliendose sola.
 */
export class MoverItemsEntreCarrosUseCase{
    constructor(
        private readonly uow:IUnitOfWorkRunner,
        private readonly idGen:IIdGenPort,
    ){}

    async execute(input:MoverItemsInput):Promise<MoverItemsOutput>{
        return this.uow.run(async (uow)=>{
            const origen = await uow.carroItems.findById(input.carroItemId);

            if(!origen){
                throw new NotFoundError(`No existe la asignacion ${input.carroItemId}`);
            }

            if(origen.estaDespachado()){
                throw new ConflictError("Esa asignacion ya fue despachada");
            }

            if(origen.carroId === input.carroDestinoId){
                throw new ValidationError("El carro de destino es el mismo que el de origen");
            }

            const carroDestino = await uow.carros.findById(input.carroDestinoId);

            if(!carroDestino){
                throw new NotFoundError(`No existe el carro ${input.carroDestinoId}`);
            }

            if(!carroDestino.puedeRecibirVidrios()){
                throw new ConflictError(
                    `El carro ${carroDestino.nroCarro} esta en estado "${carroDestino.estado}" y no puede recibir vidrios`,
                );
            }

            const cantidad = input.cantidad ?? origen.cantidadAsignada;

            if(!Number.isInteger(cantidad) || cantidad <= 0){
                throw new ValidationError("La cantidad debe ser un entero positivo");
            }

            if(cantidad > origen.cantidadAsignada){
                throw new ValidationError(
                    `No se pueden mover ${cantidad} unidades: el carro de origen solo tiene ${origen.cantidadAsignada}`,
                );
            }

            const carroOrigenId = origen.carroId;
            const esMovimientoCompleto = cantidad === origen.cantidadAsignada;

            // el destino puede tener ya una fila activa del mismo item:
            // el indice unico parcial no deja tener dos, hay que fusionar
            const existenteEnDestino = await uow.carroItems.findActivoPorCarroYItem(
                input.carroDestinoId,
                origen.codVenta,
                origen.nroItem,
            );

            let itemIdDestino:string;

            if(existenteEnDestino){
                existenteEnDestino.sumar(cantidad);
                await uow.carroItems.save(existenteEnDestino);
                itemIdDestino = existenteEnDestino.id;

                if(esMovimientoCompleto){
                    await uow.carroItems.delete(origen.id);
                }else{
                    origen.descontar(cantidad);
                    await uow.carroItems.save(origen);
                }
            }else if(esMovimientoCompleto){
                // nada que fusionar y se va todo: basta con cambiarle el carro
                origen.moverA(input.carroDestinoId);
                await uow.carroItems.save(origen);
                itemIdDestino = origen.id;
            }else{
                // split: baja en el origen y nace una fila nueva en el destino
                origen.descontar(cantidad);
                await uow.carroItems.save(origen);

                const nueva = CarroItem.crear({
                    id: this.idGen.generate(),
                    carroId: input.carroDestinoId,
                    codVenta: origen.codVenta,
                    nroItem: origen.nroItem,
                    cantidadAsignada: cantidad,
                    codItem: origen.codItem,
                    dim1: origen.dim1,
                    dim2: origen.dim2,
                    dim3: origen.dim3,
                    marcaPieza: origen.marcaPieza,
                    cantidadTotalItem: origen.cantidadTotalItem,
                    asignadoPor: origen.asignadoPor,
                });

                await uow.carroItems.save(nueva);
                itemIdDestino = nueva.id;
            }

            await sincronizarOcupacion(uow, carroOrigenId);
            await sincronizarOcupacion(uow, input.carroDestinoId);

            return {
                movidas: cantidad,
                carro_origen_id: carroOrigenId,
                carro_destino_id: input.carroDestinoId,
                item_id_destino: itemIdDestino,
                origen_quedo_vacio: (await uow.carroItems.contarActivosPorCarro(carroOrigenId)) === 0,
            };
        });
    }
}
