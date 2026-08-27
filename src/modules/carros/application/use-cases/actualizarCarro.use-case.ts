import { NotFoundError, ValidationError } from "../../../shared/domain/errors.js";
import type { IIdGenPort } from "../../../shared/domain/idGen.port.js";
import type { IUnitOfWorkRunner } from "../../../shared/domain/unit-of-work.port.js";
import { LoteMovimientos } from "../../../movimientos/application/service/lote-movimientos.js";
import { Movimiento } from "../../../movimientos/domain/movimiento.domain.js";
import { Carro, EstadoCarro, type UbicacionCarro } from "../../domain/carro.domain.js";


export interface ActualizarCarroInput{
    carroId:string;
    // lo que decide el operario: si le cabe mas o si esta operativo
    estado?:EstadoCarro;
    ubicacion?:UbicacionCarro;
    usuarioId:string|null;
}


/**
 * Lo que el operario puede cambiar de un carro a mano.
 *
 * El cupo no se calcula: cuando el operario ve que no le cabe nada mas,
 * marca LLENO y el carro deja de aceptar asignaciones. El vidrio varia mucho
 * de tamaño, contar piezas no reflejaria el espacio real.
 *
 * La ocupacion (VACIO/EN_USO) NO se toca desde aca: esa la maneja el sistema
 * segun lo que haya en carro_items.
 *
 * Cada cambio queda en la bitacora con el valor anterior y el nuevo: para el
 * dashboard, saber cuando un carro salio de servicio o cuanto tiempo estuvo
 * marcado LLENO es tan util como saber que vidrios llevaba.
 */
export class ActualizarCarroUseCase{
    constructor(
        private readonly uow:IUnitOfWorkRunner,
        private readonly idGen:IIdGenPort,
    ){}

    async execute(input:ActualizarCarroInput):Promise<Carro>{
        if(input.estado === undefined && input.ubicacion === undefined){
            throw new ValidationError("No hay nada que actualizar");
        }

        return this.uow.run(async (uow)=>{
            const carro = await uow.carros.findById(input.carroId);

            if(!carro){
                throw new NotFoundError(`No existe el carro ${input.carroId}`);
            }

            // se guardan antes de tocar nada, para poder registrar el "de X a Y"
            const estadoAnterior = carro.estado;
            const ubicacionAnterior = carro.ubicacion;

            const lote = new LoteMovimientos(this.idGen, input.usuarioId);
            const referencia = {id:carro.id, nroCarro:carro.nroCarro};
            const movimientos:Movimiento[] = [];

            if(input.estado !== undefined){
                // se pasa por los metodos del dominio y no por un setter, para que
                // se apliquen las reglas (ej: un carro fuera de servicio no puede
                // marcarse como lleno)
                switch(input.estado){
                    case EstadoCarro.LLENO:
                        carro.marcarLleno();
                        break;
                    case EstadoCarro.DISPONIBLE:
                        carro.marcarDisponible();
                        break;
                    case EstadoCarro.FUERA_SERVICIO:
                        carro.marcarFueraDeServicio();
                        break;
                }

                // solo se registra si realmente cambio: marcar LLENO un carro
                // que ya estaba LLENO no es un evento
                if(carro.estado !== estadoAnterior){
                    movimientos.push(Movimiento.cambioEstado(lote.ctx(), referencia, {
                        estado_anterior: estadoAnterior,
                        estado_nuevo: carro.estado,
                    }));
                }
            }

            if(input.ubicacion !== undefined){
                carro.moverA(input.ubicacion);

                if(carro.ubicacion !== ubicacionAnterior){
                    movimientos.push(Movimiento.cambioUbicacion(lote.ctx(), referencia, {
                        ubicacion_anterior: ubicacionAnterior,
                        ubicacion_nueva: carro.ubicacion,
                    }));
                }
            }

            await uow.carros.update(carro);
            await uow.movimientos.registrarMuchos(movimientos);

            return carro;
        });
    }
}
