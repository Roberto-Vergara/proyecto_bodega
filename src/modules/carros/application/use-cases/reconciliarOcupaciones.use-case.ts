import type { ICarroItemRepository } from "../../../carro_items/domain/carro-item.repository.js";
import type { ICarroRepository } from "../../domain/carro.repository.js";


/**
 * Deja la ocupacion de TODOS los carros consistente con lo que realmente
 * tienen adentro.
 *
 * La ocupacion (VACIO / EN_USO) es un dato derivado de carro_items que se
 * guarda por comodidad, para poder filtrar el listado sin contar filas de otra
 * tabla en cada consulta. Los casos de uso la mantienen al dia, pero si
 * alguien toca carro_items con SQL a mano el cache queda mintiendo: carros
 * marcados EN_USO sin un solo vidrio.
 *
 * Se corre al arrancar el servidor. Es una consulta por carro y solo pasa una
 * vez, asi que el costo es despreciable frente a la tranquilidad de que el
 * dato nunca quede torcido en silencio.
 */
export class ReconciliarOcupacionesUseCase{
    constructor(
        private readonly carroRepository:ICarroRepository,
        private readonly carroItemRepository:ICarroItemRepository,
    ){}

    async execute():Promise<number>{
        const carros = await this.carroRepository.findAll();

        if(carros.length === 0) return 0;

        const piezas = await this.carroItemRepository.totalPiezasPorCarro(
            carros.map((carro)=>carro.id),
        );

        let corregidos = 0;

        for(const carro of carros){
            const tieneVidrios = (piezas.get(carro.id) ?? 0) > 0;

            if(tieneVidrios && carro.estaVacio()){
                carro.ocupar();
            }else if(!tieneVidrios && !carro.estaVacio()){
                // vaciar() ademas destilda el LLENO: un carro sin nada no puede estar lleno
                carro.vaciar();
            }else{
                continue;
            }

            await this.carroRepository.update(carro);
            corregidos++;
        }

        return corregidos;
    }
}
