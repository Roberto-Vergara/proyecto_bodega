import type { UbicacionCarro } from "../../domain/carro.domain.js";

export interface CrearCarroInput{
    nro_carro:number;
    ubicacion_carro:UbicacionCarro;
}