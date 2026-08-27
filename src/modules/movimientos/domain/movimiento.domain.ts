
// ==========================================================================
// Bitacora de todo lo que le pasa a un carro y a los vidrios que lleva.
//
// Es APPEND-ONLY: se escribe una fila y no se toca nunca mas. No hay update
// ni delete. Esa es toda la gracia — si un movimiento se pudiera editar,
// dejaria de servir como registro de lo que realmente ocurrio.
//
// Se escribe DENTRO de la misma transaccion que la operacion que lo genera,
// asi que es imposible que exista una carga sin su movimiento, o un
// movimiento de algo que despues se revirtio.
// ==========================================================================

export enum TipoMovimiento{
    CARRO_CREADO="carro_creado",
    // vidrios que entran al carro
    CARGA="carga",
    // vidrios que pasan de un carro a otro
    MOVIMIENTO="movimiento",
    // vidrios que salen del carro y vuelven a pendientes
    DESCARGA="descarga",
    // se saco TODO el contenido del carro de una
    VACIADO="vaciado",
    // los vidrios salieron de la planta
    DESPACHO="despacho",
    CAMBIO_ESTADO="cambio_estado",
    CAMBIO_UBICACION="cambio_ubicacion",
}


export interface MovimientoProps{
    id:string;
    /**
     * Agrupa las filas que nacieron de una misma llamada.
     *
     * Vaciar un carro con 5 items genera 5 movimientos: el loteId permite que
     * el dashboard los muestre como una sola accion en vez de cinco sueltas.
     */
    loteId:string;
    tipo:TipoMovimiento;

    carroId:string|null;
    // denormalizado a proposito: si algun dia se borra el carro, el log
    // tiene que seguir siendo legible por si solo
    nroCarro:number|null;

    // solo en MOVIMIENTO
    carroDestinoId:string|null;
    nroCarroDestino:number|null;

    // null en los eventos que son del carro y no de un vidrio
    codVenta:number|null;
    nroItem:number|null;
    codItem:string|null;
    cantidad:number|null;

    // contexto extra segun el tipo (estado anterior/nuevo, motivo, etc)
    detalle:Record<string,unknown>|null;

    usuarioId:string|null;
    creadoEn:Date;
}


// lo que todo movimiento necesita saber de quien y cuando
export interface ContextoMovimiento{
    id:string;
    loteId:string;
    usuarioId:string|null;
}


export class Movimiento{
    private constructor(private readonly props:MovimientoProps){}

    static reconstruir(props:MovimientoProps):Movimiento{
        return new Movimiento(props);
    }

    // --- fabricas por tipo ---
    // una por evento en vez de un constructor generico: en el sitio de la
    // llamada se lee que paso, y no se puede olvidar un campo del tipo

    static carroCreado(
        ctx:ContextoMovimiento,
        carro:{id:string;nroCarro:number},
        detalle:Record<string,unknown>,
    ):Movimiento{
        return Movimiento.base(ctx, TipoMovimiento.CARRO_CREADO, carro, detalle);
    }

    static carga(
        ctx:ContextoMovimiento,
        carro:{id:string;nroCarro:number},
        vidrio:{codVenta:number;nroItem:number;codItem:string;cantidad:number},
        detalle:Record<string,unknown>|null = null,
    ):Movimiento{
        return Movimiento.base(ctx, TipoMovimiento.CARGA, carro, detalle, vidrio);
    }

    static movimiento(
        ctx:ContextoMovimiento,
        origen:{id:string;nroCarro:number},
        destino:{id:string;nroCarro:number},
        vidrio:{codVenta:number;nroItem:number;codItem:string;cantidad:number},
        detalle:Record<string,unknown>|null = null,
    ):Movimiento{
        const mov = Movimiento.base(ctx, TipoMovimiento.MOVIMIENTO, origen, detalle, vidrio);
        mov.props.carroDestinoId = destino.id;
        mov.props.nroCarroDestino = destino.nroCarro;
        return mov;
    }

    static descarga(
        ctx:ContextoMovimiento,
        carro:{id:string;nroCarro:number},
        vidrio:{codVenta:number;nroItem:number;codItem:string;cantidad:number},
        detalle:Record<string,unknown>|null = null,
    ):Movimiento{
        return Movimiento.base(ctx, TipoMovimiento.DESCARGA, carro, detalle, vidrio);
    }

    static vaciado(
        ctx:ContextoMovimiento,
        carro:{id:string;nroCarro:number},
        vidrio:{codVenta:number;nroItem:number;codItem:string;cantidad:number},
        detalle:Record<string,unknown>|null = null,
    ):Movimiento{
        return Movimiento.base(ctx, TipoMovimiento.VACIADO, carro, detalle, vidrio);
    }

    static despacho(
        ctx:ContextoMovimiento,
        carro:{id:string;nroCarro:number},
        vidrio:{codVenta:number;nroItem:number;codItem:string;cantidad:number},
        detalle:Record<string,unknown>|null = null,
    ):Movimiento{
        return Movimiento.base(ctx, TipoMovimiento.DESPACHO, carro, detalle, vidrio);
    }

    static cambioEstado(
        ctx:ContextoMovimiento,
        carro:{id:string;nroCarro:number},
        detalle:{estado_anterior:string;estado_nuevo:string},
    ):Movimiento{
        return Movimiento.base(ctx, TipoMovimiento.CAMBIO_ESTADO, carro, detalle);
    }

    static cambioUbicacion(
        ctx:ContextoMovimiento,
        carro:{id:string;nroCarro:number},
        detalle:{ubicacion_anterior:string;ubicacion_nueva:string},
    ):Movimiento{
        return Movimiento.base(ctx, TipoMovimiento.CAMBIO_UBICACION, carro, detalle);
    }

    private static base(
        ctx:ContextoMovimiento,
        tipo:TipoMovimiento,
        carro:{id:string;nroCarro:number},
        detalle:Record<string,unknown>|null,
        vidrio?:{codVenta:number;nroItem:number;codItem:string;cantidad:number},
    ):Movimiento{
        return new Movimiento({
            id: ctx.id,
            loteId: ctx.loteId,
            tipo,
            carroId: carro.id,
            nroCarro: carro.nroCarro,
            carroDestinoId: null,
            nroCarroDestino: null,
            codVenta: vidrio?.codVenta ?? null,
            nroItem: vidrio?.nroItem ?? null,
            codItem: vidrio?.codItem ?? null,
            cantidad: vidrio?.cantidad ?? null,
            detalle,
            usuarioId: ctx.usuarioId,
            creadoEn: new Date(),
        });
    }

    // --- lectura ---
    // sin setters: un movimiento ya escrito no se modifica

    get id(): string { return this.props.id; }
    get loteId(): string { return this.props.loteId; }
    get tipo(): TipoMovimiento { return this.props.tipo; }
    get carroId(): string|null { return this.props.carroId; }
    get nroCarro(): number|null { return this.props.nroCarro; }
    get carroDestinoId(): string|null { return this.props.carroDestinoId; }
    get nroCarroDestino(): number|null { return this.props.nroCarroDestino; }
    get codVenta(): number|null { return this.props.codVenta; }
    get nroItem(): number|null { return this.props.nroItem; }
    get codItem(): string|null { return this.props.codItem; }
    get cantidad(): number|null { return this.props.cantidad; }
    get detalle(): Record<string,unknown>|null { return this.props.detalle; }
    get usuarioId(): string|null { return this.props.usuarioId; }
    get creadoEn(): Date { return this.props.creadoEn; }
}
