import ExcelJS from 'exceljs';
import { listStoredProcedures, listTables } from './odbc.connection.js';

async function exportToExcel() {
    const sps = await listStoredProcedures(['SANFPRD', 'SRPOPRD']);
    const tablas = await listTables(['SANFPRD', 'SRPOPRD']);

    const workbook = new ExcelJS.Workbook();

    // --- Hoja de Stored Procedures ---
    const spSheet = workbook.addWorksheet('Stored Procedures');
    spSheet.columns = [
        { header: 'Schema', key: 'ROUTINE_SCHEMA', width: 15 },
        { header: 'Nombre', key: 'ROUTINE_NAME', width: 55 },
    ];
    spSheet.addRows(sps);
    spSheet.getRow(1).font = { bold: true };
    spSheet.autoFilter = { from: 'A1', to: 'B1' };
    spSheet.views = [{ state: 'frozen', ySplit: 1 }];

    // --- Hoja de Tablas ---
    const tablesSheet = workbook.addWorksheet('Tablas');
    tablesSheet.columns = [
        { header: 'Schema', key: 'TABLE_SCHEMA', width: 15 },
        { header: 'Nombre Tabla', key: 'TABLE_NAME', width: 20 },
        { header: 'Descripción', key: 'TABLE_TEXT', width: 55 },
        { header: 'Tipo', key: 'TABLE_TYPE', width: 10 },
    ];
    tablesSheet.addRows(tablas);
    tablesSheet.getRow(1).font = { bold: true };
    tablesSheet.autoFilter = { from: 'A1', to: 'D1' };
    tablesSheet.views = [{ state: 'frozen', ySplit: 1 }];

    // --- Hoja solo de SANFPRD (la que realmente te interesa) ---
    const sanfSheet = workbook.addWorksheet('Tablas SANFPRD');
    sanfSheet.columns = tablesSheet.columns;
    sanfSheet.addRows(tablas.filter((t) => t.TABLE_SCHEMA === 'SANFPRD'));
    sanfSheet.getRow(1).font = { bold: true };
    sanfSheet.autoFilter = { from: 'A1', to: 'D1' };
    sanfSheet.views = [{ state: 'frozen', ySplit: 1 }];

    const outPath = './surpass_catalogo.xlsx';
    await workbook.xlsx.writeFile(outPath);
    console.log(`Excel generado en: ${outPath}`);
}

exportToExcel().catch((e) => {
    console.error(e);
    process.exit(1);
});