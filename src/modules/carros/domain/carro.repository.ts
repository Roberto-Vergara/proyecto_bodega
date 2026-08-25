import type { Carro } from "./carro.domain.js";



export interface ICarroRepository{
    create(carro:Carro):Promise<void>;
    findById(id:string):Promise<Carro|null>;
    findByNumero(nroCarro:number):Promise<Carro|null>;
}