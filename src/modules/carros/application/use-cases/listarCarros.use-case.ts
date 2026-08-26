import type { ICarroItemRepository } from "../../../carro_items/domain/carro-item.repository.js";
import type { EstadoCarro, OcupacionCarro, UbicacionCarro } from "../../domain/carro.domain.js";
import type { FiltrosCarro, ICarroRepository } from "../../domain/carro.repository.js";


export interface CarroListadoDto{
    carro_id:string;
    nro_carro:number;
    estado_carro:EstadoCarro;
    ocupacion:OcupacionCarro;
    ubicacion_carro:UbicacionCarro;
    total_piezas_cargadas:number;
    // si puede recibir mas vidrios ahora mismo
    puede_recibir:boolean;
}


export class ListarCarrosUseCase{
    constructor(
        private readonly carroRepository:ICarroRepository,
        private readonly carroItemRepository:ICarroItemRepository,
    ){}

    async execute(filtros:FiltrosCarro = {}):Promise<CarroListadoDto[]>{
        const carros = await this.carroRepository.findAll(filtros);

        // una sola consulta agrupada para todos los carros, en vez de
        // contar piezas carro por carro
        const piezas = await this.carroItemRepository.totalPiezasPorCarro(
            carros.map((carro)=>carro.id),
        );

        return carros.map((carro)=>({
            carro_id: carro.id,
            nro_carro: carro.nroCarro,
            estado_carro: carro.estado,
            ocupacion: carro.ocupacion,
            ubicacion_carro: carro.ubicacion,
            total_piezas_cargadas: piezas.get(carro.id) ?? 0,
            puede_recibir: carro.puedeRecibirVidrios(),
        }));
    }
}
