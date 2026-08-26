import type { Carro } from "../../domain/carro.domain.js";


// un solo lugar que decide como se ve un carro en el JSON de la API,
// para que /carros y /carros/:id no se vayan desincronizando
export function aRespuestaCarro(carro:Carro){
    return {
        carro_id: carro.id,
        nro_carro: carro.nroCarro,
        estado_carro: carro.estado,
        ocupacion: carro.ocupacion,
        ubicacion_carro: carro.ubicacion,
    };
}
