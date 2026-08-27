import type { IIdGenPort } from "../../../shared/domain/idGen.port.js";
import type { ContextoMovimiento } from "../../domain/movimiento.domain.js";


/**
 * Agrupa todos los movimientos que genera UNA llamada a la API.
 *
 * Vaciar un carro con 5 items escribe 5 filas en la bitacora. Sin un id de
 * lote comun, el dashboard las mostraria como 5 acciones sueltas en vez de
 * una sola ("Juan vacio el carro 3"). Se crea uno por caso de uso y se pide
 * un contexto nuevo por cada fila.
 */
export class LoteMovimientos{
    private readonly loteId:string;

    constructor(
        private readonly idGen:IIdGenPort,
        private readonly usuarioId:string|null,
    ){
        this.loteId = idGen.generate();
    }

    ctx():ContextoMovimiento{
        return {
            id: this.idGen.generate(),
            loteId: this.loteId,
            usuarioId: this.usuarioId,
        };
    }
}
