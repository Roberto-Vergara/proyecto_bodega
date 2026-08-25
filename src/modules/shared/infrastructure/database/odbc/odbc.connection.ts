import { odbcConfig } from "../../../../../config/env.config.js"

const {AS400_CONN_STRING,AS400_CONNECT_TIMEOUT_S,AS400_QUERY_TIMEOUT_MS,AS400_SCHEMA} = odbcConfig();

const EXCLUIR_DESPACHO = "DESPACHO       ";

// funcion auxiliar para agregar limite de tiempo
// se hizo porque el db2 suele cortar la comunicacion pero no mata el socket
// posiblemente pusieron un timeout, pero no mataron el socket
function withTimeout<T>(promise:Promise<T>,ms:number,label:string):Promise<T>{
    let timer:NodeJS.Timeout;
    const timeout = new Promise<never>((_,reject)=>{
        timer = setTimeout(()=>reject(new Error(`[ODBC] Timeout (${ms}ms) esperando ODBC: ${label}`)),ms);
    });
    return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}


// permite cargar el odbc de forma peresoza, el usuario que usamos al tener
// un limite de 40 min x conexion me mata el socket, esto lo revive de cierta forma
let _odbc:any = null;
async function loadOdbc():Promise<any>{
    if(_odbc) return _odbc;
    const mod = "odbc";
    try {
        const imported:any = await import(mod);
        _odbc = imported.default ?? imported;
    } catch (e) {
        const detalle = e instanceof Error ? `${(e as any).code ?? ''} ${e.message}`.trim() : String(e);
        throw new Error(`[ODBC] No se pudo cargar 'odbc': ${detalle}`);
    }
    return _odbc;
}


// este es el que logra que hagamos las consultas, simplemente epico
export async function withODBC<T>(fn:(conn:any)=>Promise<T>):Promise<T>{
    const odbc = await loadOdbc();
    const conn:any = await withTimeout<any>(
        odbc.connect({connectionString:AS400_CONN_STRING,connectionTimeout:AS400_CONNECT_TIMEOUT_S,loginTimeout:AS400_CONNECT_TIMEOUT_S}),
        (AS400_CONNECT_TIMEOUT_S + 2)*1000,
        "connect",
    );
    try {
        return await withTimeout(fn(conn),AS400_QUERY_TIMEOUT_MS,"query");
    } finally {
        try {await conn.close();} catch {/*nada */}
    }
}


// lisstamos los procedimientos de las librerias
export async function listStoredProcedures(libraries:string[]): Promise<Record<string,any>[]>{
    return withODBC(async(conn)=>{
        const placeholders = libraries.map(()=>"?").join(",");
        const sql = `
            SELECT ROUTINE_SCHEMA, ROUTINE_NAME
            FROM QSYS2.SYSROUTINES
            WHERE ROUTINE_TYPE = 'PROCEDURE'
              AND ROUTINE_SCHEMA IN (${placeholders})
            ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME
        `;
        const result = await conn.query(sql,libraries);
        return Array.isArray(result)?result:[];
    })
}

// listamos las talblas de las librerias
export async function listTables(libraries: string[]): Promise<Record<string, any>[]> {
    return withODBC(async (conn) => {
        const placeholders = libraries.map(() => '?').join(',');
        const sql = `
            SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TEXT, TABLE_TYPE
            FROM QSYS2.SYSTABLES
            WHERE TABLE_SCHEMA IN (${placeholders})
            ORDER BY TABLE_SCHEMA, TABLE_NAME
        `;
        const result = await conn.query(sql, libraries);
        return Array.isArray(result) ? result : [];
    });
}

export interface ColumnInfo {
    COLUMN_NAME: string;
    DATA_TYPE: string;
    LENGTH: number | null;
    NUMERIC_SCALE: number | null;
    IS_NULLABLE: 'Y' | 'N';
    COLUMN_TEXT: string | null;
}

export interface TableInspection {
    schema: string;
    table: string;
    description: string | null;
    columns: ColumnInfo[];
}

export async function inspectTable(schema: string, table: string): Promise<TableInspection> {
    return withODBC(async (conn) => {
        const tableInfo = await conn.query(
            `SELECT TABLE_TEXT FROM QSYS2.SYSTABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
            [schema, table],
        );

        const columns = await conn.query(
            `SELECT COLUMN_NAME, DATA_TYPE, LENGTH, NUMERIC_SCALE, IS_NULLABLE, COLUMN_TEXT
             FROM QSYS2.SYSCOLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
             ORDER BY ORDINAL_POSITION`,
            [schema, table],
        );

        return {
            schema,
            table,
            description: Array.isArray(tableInfo) && tableInfo[0] ? tableInfo[0].TABLE_TEXT : null,
            columns: Array.isArray(columns) ? (columns as ColumnInfo[]) : [],
        };
    });
}



export async function callSP(sp:string,params:unknown[]=[]):Promise<Record<string,any>[]>{
    return withODBC(async(conn)=>{
        const placeholders = params.map(()=>"?").join(",");
        const sql = `CALL ${AS400_SCHEMA}.${sp}(${placeholders})`;
        const result = await conn.query(sql,params);
        return Array.isArray(result) ? (result as Record<string,any>[]) : [];
    });
}


// codigo que busca venta, este supuestamente mejora al primer codigo que hice buscando traer ventas

export interface VentaCabecera {
    cod_venta: any;
    id_vendedor: any;
    nom_cliente: any;
    rut_cliente: any;
    fecha_orden: any;
    instrucciones: any;
    monto_total: any;
}

export interface VentaDetalle {
    cod_venta: any;
    nro_item: any;
    cod_item: any;
    dim1: any;
    dim2: any;
    dim3: any;
    cantidad: any;
    marca_pieza: any;
}

export interface FindVentaResult {
    cab_venta: VentaCabecera[];
    det_venta: VentaDetalle[];
}

export async function findVenta(
    cod: number | string,
    item?: number | string,
): Promise<FindVentaResult> {
    return withODBC(async (conn) => {
        const queryCabecera = `
            SELECT 
                "OHORDÑ" AS "cod_venta", 
                "OHREPÑ" AS "id_vendedor", 
                "OHSNME" AS "nom_cliente", 
                "OHCSTÑ" AS "rut_cliente", 
                "OHDAOR" AS "fecha_orden", 
                "OHSHIN" AS "instrucciones", 
                "OHTOT$" AS "monto_total" 
            FROM FOMHDR 
            WHERE "OHORDÑ" = ? 
            FETCH FIRST 1 ROWS ONLY`;

        const detalleParams: any[] = [cod];
        let whereDetalle = `"LIORDÑ" = ?`;

        if (item !== undefined) {
            whereDetalle += ` AND "LIITMÑ" = ?`;
            detalleParams.push(item);
        }

        whereDetalle += ` AND "LIPRCD" <> ?`;
        detalleParams.push(EXCLUIR_DESPACHO);

        const queryDetalle = `
            SELECT 
                "LIORDÑ" AS "cod_venta", 
                "LIITMÑ" AS "nro_item", 
                "LIPRCD" AS "cod_item", 
                "LIDIM1" AS "dim1", 
                "LIDIM2" AS "dim2", 
                "LIDIM3" AS "dim3", 
                "LIQYOR" AS "cantidad", 
                "LIMARK" AS "marca_pieza" 
            FROM FOMDET 
            WHERE ${whereDetalle}`;

        const [cabecera, detalle] = await Promise.all([
            conn.query(queryCabecera, [cod]),
            conn.query(queryDetalle, detalleParams),
        ]);

        return {
            cab_venta: Array.isArray(cabecera) ? cabecera : [],
            det_venta: Array.isArray(detalle) ? detalle : [],
        };
    });
}