import { NotFoundError, ValidationError } from "../../../shared/domain/errors.js";
import { Carro, EstadoCarro, type UbicacionCarro } from "../../domain/carro.domain.js";
import type { ICarroRepository } from "../../domain/carro.repository.js";


export interface ActualizarCarroInput{
    carroId:string;
    // lo que decide el operario: si le cabe mas o si esta operativo
    estado?:EstadoCarro;
    ubicacion?:UbicacionCarro;
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
 */
export class ActualizarCarroUseCase{
    constructor(private readonly carroRepository:ICarroRepository){}

    async execute(input:ActualizarCarroInput):Promise<Carro>{
        if(input.estado === undefined && input.ubicacion === undefined){
            throw new ValidationError("No hay nada que actualizar");
        }

        const carro = await this.carroRepository.findById(input.carroId);

        if(!carro){
            throw new NotFoundError(`No existe el carro ${input.carroId}`);
        }

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
        }

        if(input.ubicacion !== undefined){
            carro.moverA(input.ubicacion);
        }

        await this.carroRepository.update(carro);

        return carro;
    }
}
