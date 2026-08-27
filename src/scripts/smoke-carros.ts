import "dotenv/config";
import sql from "mssql";

/**
 * Prueba de humo del flujo de carros, contra el servidor corriendo de verdad.
 *
 * Se hace por HTTP y contra el SQL Server real (y no con repos en memoria) a
 * proposito: lo que mas puede fallar aca es SQL — el indice filtrado que evita
 * filas duplicadas y el WITH (UPDLOCK) que evita la sobre-asignacion. Un doble
 * en memoria no probaria ninguna de las dos cosas.
 *
 * Requiere el servidor arriba con VENTAS_SOURCE=fake:
 *   pnpm dev
 *   pnpm smoke:carros
 */

// el puerto sale del .env, no fijo: si cambia PORT, el script lo sigue
const BASE = process.env.SMOKE_BASE_URL
    ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;
const EMAIL = process.env.SMOKE_EMAIL ?? "admin@bodega.cl";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "Admin1234";

// numeros altos para no pisarse con los carros de verdad de la planta
const CARRO_A = 9001;
const CARRO_B = 9002;

// ventas exclusivas del script (solo existen en el adapter fake).
// NO se usa la 777777 a proposito: es una nota de venta real y alguien puede
// estar probandola a mano. limpiar() borra las asignaciones de estas ventas en
// TODOS los carros, asi que tienen que ser de uso exclusivo del test
const VENTA = 999001;
const VENTA_OTRA = 999002;

let token = "";
let fallos = 0;

function check(nombre: string, ok: boolean, extra: unknown = ""): void {
    console.log(`${ok ? "OK   " : "FALLA"}  ${nombre}`, ok ? "" : JSON.stringify(extra));
    if (!ok) fallos++;
}

async function api(
    metodo: string,
    ruta: string,
    body?: unknown,
): Promise<{ status: number; body: any }> {
    const res = await fetch(BASE + ruta, {
        method: metodo,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const texto = await res.text();
    return { status: res.status, body: texto ? JSON.parse(texto) : null };
}

/**
 * Deja la base como si el script nunca hubiera corrido.
 *
 * Borra las asignaciones de las dos ventas de prueba en CUALQUIER carro, no
 * solo en los del script: si no, una corrida anterior deja unidades tomadas y
 * el script falla por datos sucios en vez de por un bug.
 *
 * Justamente por ese alcance, las ventas del script son exclusivas suyas
 * (999001 / 999002). Al principio usaba la 777777 y borraba el trabajo de
 * quien estuviera probando a mano esa nota de venta.
 */
async function limpiar(): Promise<void> {
    const pool = await sql.connect({
        server: process.env.DB_HOST ?? "localhost",
        port: Number(process.env.DB_PORT) || 1433,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        options: {
            encrypt: process.env.DB_ENCRYPT === "true",
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
            enableArithAbort: true,
            // SQL Server 2012 no habla TLS 1.2
            cryptoCredentialsDetails: { minVersion: "TLSv1" },
        },
    });

    const ventas = `(${VENTA}, ${VENTA_OTRA})`;
    const carros = `(${CARRO_A}, ${CARRO_B})`;

    // la bitacora primero: apunta a los carros que vamos a borrar
    await pool.request().query(`DELETE FROM movimientos_carro WHERE cod_venta IN ${ventas}`);
    await pool.request().query(
        `DELETE FROM movimientos_carro
         WHERE carro_id IN (SELECT id FROM carros WHERE nro_carro IN ${carros})
            OR carro_destino_id IN (SELECT id FROM carros WHERE nro_carro IN ${carros})`,
    );

    await pool.request().query(`DELETE FROM carro_items WHERE cod_venta IN ${ventas}`);
    await pool.request().query(
        `DELETE FROM carro_items WHERE carro_id IN (SELECT id FROM carros WHERE nro_carro IN ${carros})`,
    );
    await pool.request().query(`DELETE FROM carros WHERE nro_carro IN ${carros}`);

    // ocupacion es un cache de lo que hay en carro_items, y los DELETE de arriba
    // son SQL crudo: se saltan sincronizarOcupacion(). Si no lo arreglamos aca,
    // dejamos carros marcados EN_USO sin un solo vidrio adentro.
    // En SQL Server los enums son varchar con CHECK, asi que no hay que castear
    // nada (en postgres si habia que hacerlo)
    await pool.request().query(`
        UPDATE c SET
            ocupacion = CASE WHEN EXISTS (
                SELECT 1 FROM carro_items ci
                WHERE ci.carro_id = c.id AND ci.despachado_en IS NULL
            ) THEN 'en_uso' ELSE 'vacio' END,
            estado_carro = CASE
                WHEN c.estado_carro = 'lleno' AND NOT EXISTS (
                    SELECT 1 FROM carro_items ci
                    WHERE ci.carro_id = c.id AND ci.despachado_en IS NULL
                ) THEN 'disponible'
                ELSE c.estado_carro END
        FROM carros c
    `);

    await pool.close();
}

async function main(): Promise<void> {
    // freno de mano: este script borra datos de las ventas de prueba
    const salud = await api("GET", "/health");

    if (salud.status !== 200) {
        throw new Error(`El servidor no responde en ${BASE}. Levantalo con: pnpm dev`);
    }

    if (salud.body?.ventas_source !== "fake") {
        throw new Error(
            `Este script borra las asignaciones de las ventas ${VENTA} y ${VENTA_OTRA} en todos los ` +
            "carros. Esas ventas solo existen en el adapter fake; contra DB2 el codigo podria " +
            "chocar con una orden real. Levanta el servidor con VENTAS_SOURCE=fake.",
        );
    }

    await limpiar();

    const login = await api("POST", "/auth/login", { email: EMAIL, password: PASSWORD });

    if (login.status !== 200) {
        throw new Error(`No se pudo iniciar sesion como ${EMAIL}: ${JSON.stringify(login.body)}`);
    }

    token = login.body.accessToken;

    const a = await api("POST", "/carros", { nro_carro: CARRO_A, ubicacion_carro: "corte" });
    const b = await api("POST", "/carros", { nro_carro: CARRO_B, ubicacion_carro: "corte" });
    check("se crean los dos carros", a.status === 201 && b.status === 201, [a.body, b.body]);

    const idA = a.body.carro_id as string;
    const idB = b.body.carro_id as string;

    // ---- el escenario de planta ----

    let r = await api("POST", `/carros/${idA}/items`, {
        codVenta: VENTA,
        items: [
            { nroItem: 1, cantidad: 17 },
            { nroItem: 2, cantidad: 17 },
            { nroItem: 3, cantidad: 10 },
        ],
    });
    check("carro A recibe items 1, 2 y parte del 3", r.status === 201, r.body);
    check("carro A queda con 44 piezas", r.body?.total_piezas_cargadas === 44, r.body);

    r = await api("POST", `/carros/${idB}/items`, {
        codVenta: VENTA,
        items: [{ nroItem: 3, cantidad: 4 }],
    });
    check("el item 3 se parte: 4 unidades al carro B", r.status === 201, r.body);

    r = await api("POST", `/carros/${idB}/items`, {
        codVenta: VENTA_OTRA,
        items: [{ nroItem: 1, cantidad: 25 }],
    });
    check("un carro puede llevar dos ventas distintas", r.status === 201, r.body);
    check("carro B queda con 29 piezas", r.body?.total_piezas_cargadas === 29, r.body);

    // ---- la invariante ----

    r = await api("POST", `/carros/${idA}/items`, {
        codVenta: VENTA,
        items: [{ nroItem: 3, cantidad: 25 }],
    });
    check("no se puede pasar de lo vendido (quedan 20, se piden 25)", r.status === 409, r.body);

    r = await api("POST", `/carros/${idA}/items`, {
        codVenta: VENTA,
        items: [{ nroItem: 99, cantidad: 1 }],
    });
    check("item que no existe en la venta", r.status === 404, r.body);

    r = await api("POST", `/carros/${idA}/items`, {
        codVenta: VENTA,
        items: [{ nroItem: 4, cantidad: 0 }],
    });
    check("cantidad cero", r.status === 400, r.body);

    // ---- contenido del carro ----

    r = await api("GET", `/carros/${idA}`);
    const item3EnA = r.body.contenido.find((c: any) => c.nro_item === 3);
    check("items completos salen como COMPLETO_EN_CARRO",
        r.body.contenido.filter((c: any) => c.estado_item === "COMPLETO_EN_CARRO").length === 2, r.body);
    check("el item repartido sale como PARCIAL", item3EnA?.estado_item === "PARCIAL", item3EnA);

    r = await api("GET", `/carros/${idB}`);
    check("el carro B muestra el cliente de cada venta",
        new Set(r.body.contenido.map((c: any) => c.nom_cliente)).size === 2, r.body.contenido);

    // ---- mover: fusion ----

    const idItem3EnB = (await api("GET", `/carros/${idB}`)).body.contenido
        .find((c: any) => c.cod_venta === VENTA && c.nro_item === 3).item_id;

    r = await api("POST", `/carros/${idB}/items/${idItem3EnB}/mover`, { carroDestinoId: idA });
    check("mover el item completo al otro carro", r.status === 200, r.body);

    r = await api("GET", `/carros/${idA}`);
    const item3Fusionado = r.body.contenido.filter((c: any) => c.cod_venta === VENTA && c.nro_item === 3);
    check("las dos filas del mismo item se fusionan en una", item3Fusionado.length === 1, item3Fusionado);
    check("la fila fusionada suma 14 (10 + 4)",
        item3Fusionado[0]?.cantidad_en_este_carro === 14, item3Fusionado);

    // ---- mover: split ----

    r = await api("POST", `/carros/${idA}/items/${item3Fusionado[0].item_id}/mover`, {
        carroDestinoId: idB,
        cantidad: 5,
    });
    check("mover solo una parte parte la fila en dos", r.status === 200, r.body);

    r = await api("GET", `/carros/${idA}`);
    check("en el origen quedan 9",
        r.body.contenido.find((c: any) => c.nro_item === 3 && c.cod_venta === VENTA)
            ?.cantidad_en_este_carro === 9, r.body.contenido);

    // ---- quitar ----

    const idItem1 = (await api("GET", `/carros/${idA}`)).body.contenido
        .find((c: any) => c.nro_item === 1).item_id;

    r = await api("DELETE", `/carros/${idA}/items/${idItem1}?cantidad=7`);
    check("quitar una parte deja el resto", r.body?.quedan_en_el_carro === 10, r.body);

    r = await api("DELETE", `/carros/${idA}/items/${idItem1}`);
    check("quitar el resto elimina la linea", r.body?.quedan_en_el_carro === 0, r.body);

    r = await api("GET", `/ventas/${VENTA}`);
    check("lo quitado vuelve a estar disponible en la venta",
        r.body.items.find((i: any) => i.nro_item === 1)?.disponible === 17, r.body.items);

    // ---- concurrencia: el SELECT ... FOR UPDATE ----
    // dos operarios pidiendo al mismo tiempo TODO lo que queda del item 4.
    // sin el lock los dos leerian "quedan 17" y se asignarian 34 en total
    const [c1, c2] = await Promise.all([
        api("POST", `/carros/${idA}/items`, { codVenta: VENTA, items: [{ nroItem: 4, cantidad: 17 }] }),
        api("POST", `/carros/${idB}/items`, { codVenta: VENTA, items: [{ nroItem: 4, cantidad: 17 }] }),
    ]);

    const exitos = [c1, c2].filter((x) => x.status === 201).length;
    const rechazos = [c1, c2].filter((x) => x.status === 409).length;
    check("con dos cargas simultaneas solo una gana", exitos === 1 && rechazos === 1,
        [c1.status, c2.status, c1.body, c2.body]);

    r = await api("GET", `/ventas/${VENTA}`);
    const item4 = r.body.items.find((i: any) => i.nro_item === 4);
    check("el item 4 nunca queda sobre-asignado",
        item4?.cantidad_asignada === 17 && item4?.disponible === 0, item4);

    // ---- estado del carro ----

    r = await api("PATCH", `/carros/${idA}`, { estado_carro: "lleno" });
    check("el operario marca el carro como lleno", r.body?.estado_carro === "lleno", r.body);

    r = await api("POST", `/carros/${idA}/items`, { codVenta: VENTA, items: [{ nroItem: 2, cantidad: 1 }] });
    check("un carro lleno no acepta mas vidrios", r.status === 409, r.body);

    await api("PATCH", `/carros/${idA}`, { estado_carro: "disponible" });

    // ---- despacho ----

    r = await api("GET", `/ventas/${VENTA}/distribucion`);
    check("la distribucion lista los carros de la venta", r.status === 200 && r.body.carros.length === 2, r.body);

    r = await api("POST", `/ventas/${VENTA}/despachar`);
    check("se despacha la venta", r.status === 200 && r.body.items_despachados > 0, r.body);

    r = await api("POST", `/ventas/${VENTA}/despachar`);
    check("no se puede despachar dos veces", r.status === 409, r.body);

    r = await api("GET", `/carros/${idA}`);
    check("el carro que quedo sin nada vuelve a VACIO",
        r.body.ocupacion === "vacio" && r.body.total_piezas_cargadas === 0, r.body);

    r = await api("GET", `/carros/${idB}`);
    check("el otro carro conserva la venta que no se despacho",
        r.body.total_piezas_cargadas === 25, r.body);

    r = await api("GET", `/ventas/${VENTA}`);
    check("despues del despacho la venta vuelve a estar toda disponible",
        r.body.items.every((i: any) => i.cantidad_asignada === 0), r.body.items);

    // ...pero no en silencio: se avisa que ya salio de la planta
    check("la venta despachada queda marcada",
        r.body.ya_despachada === true && r.body.piezas_despachadas > 0 && r.body.ultimo_despacho !== null,
        { ya: r.body.ya_despachada, piezas: r.body.piezas_despachadas, ult: r.body.ultimo_despacho });
    check("y sale un aviso para que no la carguen de nuevo por error",
        r.body.avisos.some((a: string) => a.includes("despachadas")), r.body.avisos);

    r = await api("GET", `/ventas/${VENTA_OTRA}`);
    check("una venta nunca despachada no lleva aviso",
        r.body.ya_despachada === false && r.body.avisos.length === 0, r.body.avisos);

    // ---- vaciar ----

    r = await api("POST", `/carros/${idB}/items`, {
        codVenta: VENTA, items: [{ nroItem: 1, cantidad: 5 }, { nroItem: 2, cantidad: 3 }],
    });
    check("se vuelve a cargar el carro B para probar el vaciado", r.status === 201, r.body);

    r = await api("POST", `/carros/${idB}/vaciar`, { motivo: "prueba de humo" });
    check("vaciar responde 200", r.status === 200, r.body);
    check("vaciar devuelve lo que HABIA adentro",
        r.body.piezas_retiradas === 33 && r.body.lineas_retiradas === 3, r.body);
    check("el contenido devuelto trae los datos del vidrio",
        r.body.contenido.every((c: any) => c.cod_item && c.dimensiones && c.estado_item),
        r.body.contenido);

    r = await api("GET", `/carros/${idB}`);
    check("el carro vaciado queda en VACIO",
        r.body.ocupacion === "vacio" && r.body.total_piezas_cargadas === 0, r.body);

    r = await api("POST", `/carros/${idB}/vaciar`, {});
    check("vaciar un carro ya vacio da 409", r.status === 409, r.body);

    r = await api("GET", `/ventas/${VENTA}`);
    check("lo vaciado vuelve a estar disponible en la venta",
        r.body.items.find((i: any) => i.nro_item === 1)?.disponible === 17, r.body.items);

    // ---- la bitacora ----

    r = await api("GET", `/carros/${idB}/movimientos`);
    const tipos = new Set<string>(r.body.movimientos.map((m: any) => m.tipo));
    check("el historial del carro registra el alta", tipos.has("carro_creado"), [...tipos]);
    check("...las cargas", tipos.has("carga"), [...tipos]);
    check("...los movimientos donde fue ORIGEN y donde fue DESTINO",
        tipos.has("movimiento"), [...tipos]);
    check("...el vaciado", tipos.has("vaciado"), [...tipos]);
    check("...el despacho", tipos.has("despacho"), [...tipos]);
    check("cada movimiento dice quien lo hizo",
        r.body.movimientos.every((m: any) => m.usuario_nombre !== null), r.body.movimientos[0]);
    check("cada movimiento trae una descripcion lista para mostrar",
        r.body.movimientos.every((m: any) => typeof m.descripcion === "string" && m.descripcion.length > 0),
        r.body.movimientos[0]);

    const vaciados = r.body.movimientos.filter((m: any) => m.tipo === "vaciado");
    check("las lineas de un mismo vaciado comparten lote_id",
        vaciados.length === 3 && new Set(vaciados.map((m: any) => m.lote_id)).size === 1,
        vaciados.map((m: any) => m.lote_id));
    check("el motivo queda guardado en el detalle",
        vaciados.every((m: any) => m.detalle?.motivo === "prueba de humo"), vaciados[0]?.detalle);

    r = await api("GET", `/carros/${idA}/movimientos?tipo=cambio_estado`);
    check("se puede filtrar el historial por tipo",
        r.body.movimientos.length > 0 && r.body.movimientos.every((m: any) => m.tipo === "cambio_estado"),
        r.body.movimientos);
    check("el cambio de estado guarda el valor anterior y el nuevo",
        r.body.movimientos.every((m: any) => m.detalle?.estado_anterior && m.detalle?.estado_nuevo),
        r.body.movimientos[0]?.detalle);

    r = await api("GET", `/ventas/${VENTA}/movimientos`);
    check("el historial por venta trae solo esa venta",
        r.body.total > 0 && r.body.movimientos.every((m: any) => m.cod_venta === VENTA),
        r.body.total);

    r = await api("GET", `/movimientos?limite=5`);
    check("la bitacora general pagina", r.body.movimientos.length <= 5 && r.body.total >= 5, {
        n: r.body.movimientos.length, total: r.body.total,
    });

    r = await api("GET", `/movimientos?tipo=basura`);
    check("un tipo invalido da 400", r.status === 400, r.body);

    // ---- ventas en proceso: la entrada del dashboard ----

    r = await api("POST", `/carros/${idA}/items`, {
        codVenta: VENTA, items: [{ nroItem: 2, cantidad: 4 }],
    });
    check("se carga algo para tener una venta en proceso", r.status === 201, r.body);

    r = await api("GET", "/ventas");
    check("GET /ventas responde una lista", r.status === 200 && Array.isArray(r.body), r.body);

    const enProceso = (r.body as any[]).find((v) => v.cod_venta === VENTA);
    check("la venta cargada aparece en el listado", enProceso !== undefined, r.body);
    check("el listado trae cliente, piezas y carros",
        enProceso?.nom_cliente !== null
        && enProceso?.piezas_en_carros === 4
        && enProceso?.carros === 1,
        enProceso);

    r = await api("POST", `/carros/${idA}/vaciar`, {});
    check("se vacia el carro", r.status === 200, r.body);

    r = await api("GET", "/ventas");
    check("una venta sin nada cargado sale del listado",
        (r.body as any[]).every((v) => v.cod_venta !== VENTA), r.body);

    await limpiar();

    console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLAS`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
    console.error("[SMOKE ERROR]", error);
    process.exit(1);
});
