import { ConflictError } from "../../../shared/domain/errors.js";
import type { IIdGenPort } from "../../../shared/domain/idGen.port.js";
import type { IUnitOfWorkRunner } from "../../../shared/domain/unit-of-work.port.js";
import { LoteMovimientos } from "../../../movimientos/application/service/lote-movimientos.js";
import { Movimiento } from "../../../movimientos/domain/movimiento.domain.js";
import { Carro } from "../../domain/carro.domain.js";
import type { CrearCarroInput } from "../dto/crearCarroDto.js";


export class CrearCarroUseCase{

    constructor(
        // pasa por la unidad de trabajo para que el alta y su movimiento
        // se escriban en la misma transaccion
        private readonly uow:IUnitOfWorkRunner,
        private readonly idGen:IIdGenPort
    ){}

    async execute(input:CrearCarroInput, usuarioId:string|null = null):Promise<Carro>{
        return this.uow.run(async (uow)=>{
            const carroExiste = await uow.carros.findByNumero(input.nro_carro);

            if(carroExiste){
                throw new ConflictError(`Ya existe un carro con el numero ${input.nro_carro}`);
            }

            const id = this.idGen.generate();

            const carro = Carro.crear(id,input.nro_carro,input.ubicacion_carro);

            await uow.carros.create(carro);

            const lote = new LoteMovimientos(this.idGen, usuarioId);

            await uow.movimientos.registrar(Movimiento.carroCreado(
                lote.ctx(),
                {id:carro.id, nroCarro:carro.nroCarro},
                {
                    ubicacion: carro.ubicacion,
                    estado: carro.estado,
                },
            ));

            return carro;
        });
    }
}
