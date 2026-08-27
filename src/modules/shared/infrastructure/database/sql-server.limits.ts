
/**
 * SQL Server acepta como maximo 2100 parametros por sentencia.
 *
 * Es un limite de la BASE, no del driver, y no se puede subir. Nos pega en
 * dos lugares:
 *
 *   1. INSERT de varias filas: TypeORM arma un solo INSERT con N filas x M
 *      columnas de parametros. Con 14 columnas, a las 150 filas revienta.
 *   2. WHERE ... IN (:...ids): un parametro por id.
 *
 * En vez de confiar en que "nunca van a ser tantos", se parte en tandas.
 * El error que tira si te pasas es feo y poco descriptivo
 * ("The incoming request has too many parameters"), y aparece recien en
 * produccion cuando alguien carga un carro grande.
 */
export const MAX_PARAMETROS_SQL_SERVER = 2100;

// margen para los parametros que TypeORM agrega por su cuenta
const MARGEN = 100;

/**
 * Cuantas filas caben en un INSERT segun cuantas columnas tenga la tabla.
 */
export function filasPorTanda(columnas:number):number{
    if(columnas <= 0) return 1;

    return Math.max(1, Math.floor((MAX_PARAMETROS_SQL_SERVER - MARGEN) / columnas));
}

/**
 * Parte un arreglo en tandas de a lo mas `tamano` elementos.
 */
export function enTandas<T>(items:T[], tamano:number):T[][]{
    if(items.length === 0) return [];

    const tandas:T[][] = [];

    for(let i = 0; i < items.length; i += tamano){
        tandas.push(items.slice(i, i + tamano));
    }

    return tandas;
}
