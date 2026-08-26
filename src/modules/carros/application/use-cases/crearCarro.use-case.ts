import { ConflictError } from "../../../shared/domain/errors.js";
import type { IIdGenPort } from "../../../shared/domain/idGen.port.js";
import { Carro, type UbicacionCarro } from "../../domain/carro.domain.js";
import type { ICarroRepository } from "../../domain/carro.repository.js";
import type { CrearCarroInput } from "../dto/crearCarroDto.js";





export class CrearCarroUseCase{
    
    constructor(
        private readonly carroRepository:ICarroRepository,
        private readonly idGen:IIdGenPort
    ){}

    async execute(input:CrearCarroInput):Promise<Carro>{
        const carroExiste = await this.carroRepository.findByNumero(input.nro_carro);

        if(carroExiste){
            throw new ConflictError(`Ya existe un carro con el numero ${input.nro_carro}`);
        }

        const id = this.idGen.generate();

        const carro = Carro.crear(id,input.nro_carro,input.ubicacion_carro);

        await this.carroRepository.create(carro);

        return carro;
    }
}