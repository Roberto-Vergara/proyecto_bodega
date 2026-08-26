import type { UnitOfWork } from "../../../shared/domain/unit-of-work.port.js";


/**
 * Deja la ocupacion del carro consistente con lo que realmente tiene adentro.
 *
 * La ocupacion (VACIO / EN_USO) es un dato derivado de carro_items, no una
 * decision de nadie. Se guarda igual porque listar carros filtrando por
 * ocupacion tendria que contar filas de otra tabla en cada consulta.
 *
 * Todos los casos de uso que agregan o sacan vidrios terminan llamando aca,
 * para que ese cache no se desincronice.
 */
export async function sincronizarOcupacion(uow:UnitOfWork,carroId:string):Promise<void>{
    const carro = await uow.carros.findById(carroId);

    if(!carro) return;

    const activos = await uow.carroItems.contarActivosPorCarro(carroId);

    if(activos === 0 && !carro.estaVacio()){
        // vaciar() ademas saca el LLENO: un carro sin nada no puede estar lleno
        carro.vaciar();
        await uow.carros.update(carro);
        return;
    }

    if(activos > 0 && carro.estaVacio()){
        carro.ocupar();
        await uow.carros.update(carro);
    }
}
