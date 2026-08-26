import type { Carro, EstadoCarro, OcupacionCarro, UbicacionCarro } from "./carro.domain.js";


export interface FiltrosCarro{
    estado?:EstadoCarro;
    ocupacion?:OcupacionCarro;
    ubicacion?:UbicacionCarro;
}

export interface ICarroRepository{
    create(carro:Carro):Promise<void>;
    update(carro:Carro):Promise<void>;
    findById(id:string):Promise<Carro|null>;
    findByNumero(nroCarro:number):Promise<Carro|null>;
    existsByNumero(nroCarro:number):Promise<boolean>;
    findAll(filtros?:FiltrosCarro):Promise<Carro[]>;
}
