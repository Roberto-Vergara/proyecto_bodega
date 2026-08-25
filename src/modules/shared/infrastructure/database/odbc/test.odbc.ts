import { listStoredProcedures,listTables,inspectTable,findVenta } from "./odbc.connection.js";

// const sps = await listStoredProcedures(["SANFPRD","SRPOPRD"]);
// const tablas = await listTables(["SANFPRD",'SRPOPRD']);
// const info = await inspectTable('SANFPRD', 'FOMHDR');

// console.log(`\nTabla: ${info.schema}.${info.table} — ${info.description}\n`);

// for (const col of info.columns) {
//     const tipo = col.NUMERIC_SCALE != null
//         ? `${col.DATA_TYPE}(${col.LENGTH},${col.NUMERIC_SCALE})`
//         : `${col.DATA_TYPE}(${col.LENGTH})`;
//     console.log(
//         `${col.COLUMN_NAME.padEnd(10)} ${tipo.padEnd(18)} ${col.IS_NULLABLE === 'Y' ? 'NULL' : 'NOT NULL'}  — ${col.COLUMN_TEXT ?? ''}`,
//     );
// }

const {cab_venta, det_venta} = await findVenta(777777);
console.log(
  `============== CABECERA ==============\n`,
  cab_venta,
  `\n\n============== DETALLE ==============\n`,
  det_venta
);