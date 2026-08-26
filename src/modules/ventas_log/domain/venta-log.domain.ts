import { ValidationError } from "../../shared/domain/errors.js";


// ==========================================================================
// Espejo local de la CABECERA de una venta que vive en DB2 (FOMHDR).
//
// Para nosotros DB2 es solo lectura: esto es una copia para no golpear el
// AS400 en cada request y para que carro_items tenga a que apuntar aunque
// el AS400 este caido (que segun la experiencia pasa seguido).
// ==========================================================================

export interface VentaLogProps{
    id:string;
    codVenta:number;
    nomCliente:string;
    rutCliente:string|null;
    idVendedor:string|null;
    fechaOrden:Date|null;
    instrucciones:string|null;
    // se espeja porque viene gratis en el SELECT, pero NO se usa en ningun
    // calculo: en la orden 777777 vino 85, que es exactamente la suma de las
    // cantidades (17+17+34+17), asi que no esta claro que sea plata
    montoTotal:number|null;
    ultimaConsulta:Date;
}


export class VentaLog{
    private constructor(
        private readonly _id:string,
        private readonly _codVenta:number,
        private _nomCliente:string,
        private _rutCliente:string|null,
        private _idVendedor:string|null,
        private _fechaOrden:Date|null,
        private _instrucciones:string|null,
        private _montoTotal:number|null,
        private _ultimaConsulta:Date,
    ){}

    static crear(props:VentaLogProps):VentaLog{
        if(!Number.isInteger(props.codVenta) || props.codVenta<=0){
            throw new ValidationError("El codigo de venta debe ser un entero positivo");
        }

        return new VentaLog(
            props.id,
            props.codVenta,
            props.nomCliente,
            props.rutCliente,
            props.idVendedor,
            props.fechaOrden,
            props.instrucciones,
            props.montoTotal,
            props.ultimaConsulta,
        );
    }

    static reconstruir(props:VentaLogProps):VentaLog{
        return new VentaLog(
            props.id,
            props.codVenta,
            props.nomCliente,
            props.rutCliente,
            props.idVendedor,
            props.fechaOrden,
            props.instrucciones,
            props.montoTotal,
            props.ultimaConsulta,
        );
    }

    // se llama cada vez que volvemos a consultar DB2: la cabecera puede haber
    // cambiado (cambio de cliente, de instrucciones de despacho, etc)
    refrescarDesdeExterno(datos:Omit<VentaLogProps,"id"|"codVenta"|"ultimaConsulta">):void{
        this._nomCliente = datos.nomCliente;
        this._rutCliente = datos.rutCliente;
        this._idVendedor = datos.idVendedor;
        this._fechaOrden = datos.fechaOrden;
        this._instrucciones = datos.instrucciones;
        this._montoTotal = datos.montoTotal;
        this._ultimaConsulta = new Date();
    }

    get id(): string { return this._id; }
    get codVenta(): number { return this._codVenta; }
    get nomCliente(): string { return this._nomCliente; }
    get rutCliente(): string|null { return this._rutCliente; }
    get idVendedor(): string|null { return this._idVendedor; }
    get fechaOrden(): Date|null { return this._fechaOrden; }
    get instrucciones(): string|null { return this._instrucciones; }
    get montoTotal(): number|null { return this._montoTotal; }
    get ultimaConsulta(): Date { return this._ultimaConsulta; }
}
