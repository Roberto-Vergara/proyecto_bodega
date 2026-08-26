import { ValidationError } from "../../shared/domain/errors.js";


// ==========================================================================
// El carro tiene DOS ejes de estado que no hay que mezclar:
//
//   - estado_carro: lo decide el OPERARIO (¿le cabe más? ¿está operativo?)
//   - ocupacion:    lo calcula el SISTEMA a partir de carro_items
//
// Si estuvieran en un solo campo se podrían dar estados imposibles,
// tipo "LLENO pero sin ningún vidrio adentro".
// ==========================================================================

export enum EstadoCarro{
    DISPONIBLE="disponible",
    LLENO="lleno",
    FUERA_SERVICIO="fuera_servicio"
}

export enum OcupacionCarro{
    VACIO="vacio",
    EN_USO="en_uso"
}

export enum UbicacionCarro{
    CORTE="corte",
    PRODUCCION="produccion",
    PRODUCTOS_TERMINADOS="productos_terminados",
}


export interface ReconstruirCarroProps{
    id:string;
    nroCarro:number;
    estado:EstadoCarro;
    ocupacion:OcupacionCarro;
    ubicacion:UbicacionCarro;
    creadoEn:Date;
    actualizadoEn:Date;
}


export class Carro{
    private constructor(
        private readonly _id:string,
        private readonly _nroCarro:number,
        private _estado:EstadoCarro,
        private _ocupacion:OcupacionCarro,
        private _ubicacion:UbicacionCarro,
        private readonly _creadoEn:Date,
        private _actualizadoEn:Date,
    ){}

    static crear(uuid:string,nroCarro:number,ubicacion:UbicacionCarro):Carro{
        if(!Number.isInteger(nroCarro) || nroCarro<=0){
            throw new ValidationError("El numero de carro debe ser un entero positivo");
        }

        const ahora = new Date();

        return new Carro(
            uuid,
            nroCarro,
            EstadoCarro.DISPONIBLE,
            OcupacionCarro.VACIO,
            ubicacion,
            ahora,
            ahora,
        );
    }

    // reconstruir se separa de crear a proposito: crear valida porque es la
    // primera vez, reconstruir confia porque los datos ya vienen de la db
    static reconstruir(props:ReconstruirCarroProps):Carro{
        return new Carro(
            props.id,
            props.nroCarro,
            props.estado,
            props.ocupacion,
            props.ubicacion,
            props.creadoEn,
            props.actualizadoEn,
        );
    }

    // --- lectura ---

    get id(): string { return this._id; }
    get nroCarro(): number { return this._nroCarro; }
    get estado(): EstadoCarro { return this._estado; }
    get ocupacion(): OcupacionCarro { return this._ocupacion; }
    get ubicacion(): UbicacionCarro { return this._ubicacion; }
    get creadoEn(): Date { return this._creadoEn; }
    get actualizadoEn(): Date { return this._actualizadoEn; }

    estaVacio(): boolean {
        return this._ocupacion === OcupacionCarro.VACIO;
    }

    puedeRecibirVidrios(): boolean {
        return this._estado === EstadoCarro.DISPONIBLE;
    }

    // --- decisiones del operario ---

    marcarLleno(): void {
        if(this._estado === EstadoCarro.FUERA_SERVICIO){
            throw new ValidationError("Un carro fuera de servicio no se puede marcar como lleno");
        }

        this._estado = EstadoCarro.LLENO;
        this.tocar();
    }

    marcarDisponible(): void {
        this._estado = EstadoCarro.DISPONIBLE;
        this.tocar();
    }

    marcarFueraDeServicio(): void {
        // se permite aunque tenga vidrios adentro: si el carro se rompe hay que
        // poder sacarlo de circulacion igual, y despues descargarlo
        this._estado = EstadoCarro.FUERA_SERVICIO;
        this.tocar();
    }

    moverA(ubicacion: UbicacionCarro): void {
        this._ubicacion = ubicacion;
        this.tocar();
    }

    // --- lo mantiene el sistema segun carro_items ---

    ocupar(): void {
        this._ocupacion = OcupacionCarro.EN_USO;
        this.tocar();
    }

    vaciar(): void {
        this._ocupacion = OcupacionCarro.VACIO;

        // un carro sin nada adentro no puede seguir marcado como lleno.
        // FUERA_SERVICIO si se respeta: ese lo levanta el operario a mano
        if(this._estado === EstadoCarro.LLENO){
            this._estado = EstadoCarro.DISPONIBLE;
        }

        this.tocar();
    }

    private tocar(): void {
        this._actualizadoEn = new Date();
    }
}
