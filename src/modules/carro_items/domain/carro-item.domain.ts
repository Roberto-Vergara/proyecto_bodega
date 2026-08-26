import { ValidationError } from "../../shared/domain/errors.js";


// ==========================================================================
// Una fila de carro_items = "tantas unidades de este item de esta venta
// estan fisicamente en este carro".
//
// Es la pieza que resuelve el problema del negocio: como un mismo item de
// venta (ej: 34 vidrios) puede quedar repartido en varios carros, se crea
// una fila por (carro, item). 10 aca + 4 alla = dos filas.
//
// Los campos cod_item / dim1..3 / marca_pieza / cantidad_total_item son un
// SNAPSHOT de lo que DB2 respondio al momento de cargar el carro. Se guardan
// para poder mostrar y validar el contenido de un carro sin volver a pegarle
// al AS400 cada vez que alguien abre la pantalla.
// ==========================================================================

export enum EstadoItemEnCarro{
    // todas las unidades vendidas de este item cayeron en este mismo carro
    COMPLETO_EN_CARRO="COMPLETO_EN_CARRO",
    // este carro lleva solo una parte: el resto esta en otro carro o pendiente
    PARCIAL="PARCIAL",
}


export interface SnapshotItemVenta{
    codItem:string;
    dim1:number;
    dim2:number;
    dim3:number;
    marcaPieza:string|null;
    // cuantas unidades se vendieron en total de este item (LIQYOR en DB2)
    cantidadTotalItem:number;
}

export interface CrearCarroItemProps extends SnapshotItemVenta{
    id:string;
    carroId:string;
    codVenta:number;
    nroItem:number;
    cantidadAsignada:number;
    asignadoPor:string|null;
}

export interface ReconstruirCarroItemProps extends CrearCarroItemProps{
    fechaAsignacion:Date;
    despachadoEn:Date|null;
}


export class CarroItem{
    private constructor(
        private readonly _id:string,
        private _carroId:string,
        private readonly _codVenta:number,
        private readonly _nroItem:number,
        private _cantidadAsignada:number,
        private _codItem:string,
        private _dim1:number,
        private _dim2:number,
        private _dim3:number,
        private _marcaPieza:string|null,
        private _cantidadTotalItem:number,
        private readonly _fechaAsignacion:Date,
        private _despachadoEn:Date|null,
        private readonly _asignadoPor:string|null,
    ){}

    static crear(props:CrearCarroItemProps):CarroItem{
        CarroItem.validarCantidad(props.cantidadAsignada);

        if(!Number.isInteger(props.cantidadTotalItem) || props.cantidadTotalItem<=0){
            throw new ValidationError("La cantidad total del item debe ser un entero positivo");
        }

        if(props.cantidadAsignada > props.cantidadTotalItem){
            throw new ValidationError(
                `No se pueden asignar ${props.cantidadAsignada} unidades: el item ${props.nroItem} ` +
                `de la venta ${props.codVenta} solo tiene ${props.cantidadTotalItem} vendidas`,
            );
        }

        return new CarroItem(
            props.id,
            props.carroId,
            props.codVenta,
            props.nroItem,
            props.cantidadAsignada,
            props.codItem,
            props.dim1,
            props.dim2,
            props.dim3,
            props.marcaPieza,
            props.cantidadTotalItem,
            new Date(),
            null,
            props.asignadoPor,
        );
    }

    static reconstruir(props:ReconstruirCarroItemProps):CarroItem{
        return new CarroItem(
            props.id,
            props.carroId,
            props.codVenta,
            props.nroItem,
            props.cantidadAsignada,
            props.codItem,
            props.dim1,
            props.dim2,
            props.dim3,
            props.marcaPieza,
            props.cantidadTotalItem,
            props.fechaAsignacion,
            props.despachadoEn,
            props.asignadoPor,
        );
    }

    // --- lectura ---

    get id(): string { return this._id; }
    get carroId(): string { return this._carroId; }
    get codVenta(): number { return this._codVenta; }
    get nroItem(): number { return this._nroItem; }
    get cantidadAsignada(): number { return this._cantidadAsignada; }
    get codItem(): string { return this._codItem; }
    get dim1(): number { return this._dim1; }
    get dim2(): number { return this._dim2; }
    get dim3(): number { return this._dim3; }
    get marcaPieza(): string|null { return this._marcaPieza; }
    get cantidadTotalItem(): number { return this._cantidadTotalItem; }
    get fechaAsignacion(): Date { return this._fechaAsignacion; }
    get despachadoEn(): Date|null { return this._despachadoEn; }
    get asignadoPor(): string|null { return this._asignadoPor; }

    estaDespachado(): boolean {
        return this._despachadoEn !== null;
    }

    // derivado, no se guarda: comparar lo que lleva ESTE carro contra el total vendido
    estadoItem(): EstadoItemEnCarro {
        return this._cantidadAsignada === this._cantidadTotalItem
            ? EstadoItemEnCarro.COMPLETO_EN_CARRO
            : EstadoItemEnCarro.PARCIAL;
    }

    // dim3 viene en 0 en las ventas que hemos visto, por eso solo se muestra si trae algo
    dimensiones(): string {
        const base = `${this._dim1} x ${this._dim2}`;
        return this._dim3 > 0 ? `${base} x ${this._dim3} mm` : `${base} mm`;
    }

    // --- comportamiento ---

    sumar(cantidad:number): void {
        this.asegurarNoDespachado();
        CarroItem.validarCantidad(cantidad);

        this._cantidadAsignada += cantidad;
    }

    descontar(cantidad:number): void {
        this.asegurarNoDespachado();
        CarroItem.validarCantidad(cantidad);

        if(cantidad > this._cantidadAsignada){
            throw new ValidationError(
                `No se pueden quitar ${cantidad} unidades: el carro solo tiene ${this._cantidadAsignada}`,
            );
        }

        // llegar a 0 no se permite: una fila en cero es basura.
        // el caso de uso borra la fila cuando se saca todo
        if(cantidad === this._cantidadAsignada){
            throw new ValidationError(
                "Para sacar todas las unidades hay que eliminar la asignacion, no dejarla en cero",
            );
        }

        this._cantidadAsignada -= cantidad;
    }

    moverA(carroIdDestino:string): void {
        this.asegurarNoDespachado();

        if(carroIdDestino === this._carroId){
            throw new ValidationError("El carro de destino es el mismo que el de origen");
        }

        this._carroId = carroIdDestino;
    }

    despachar(): void {
        this.asegurarNoDespachado();
        this._despachadoEn = new Date();
    }

    // cuando volvemos a consultar DB2 la venta pudo cambiar (cambio de medidas,
    // de marca, o le bajaron la cantidad). Refrescamos el snapshot sin tocar
    // lo que fisicamente esta cargado en el carro
    refrescarSnapshot(snapshot:SnapshotItemVenta): void {
        this._codItem = snapshot.codItem;
        this._dim1 = snapshot.dim1;
        this._dim2 = snapshot.dim2;
        this._dim3 = snapshot.dim3;
        this._marcaPieza = snapshot.marcaPieza;
        this._cantidadTotalItem = snapshot.cantidadTotalItem;
    }

    private asegurarNoDespachado(): void {
        if(this.estaDespachado()){
            throw new ValidationError("Esta asignacion ya fue despachada y no se puede modificar");
        }
    }

    private static validarCantidad(cantidad:number): void {
        if(!Number.isInteger(cantidad) || cantidad<=0){
            throw new ValidationError("La cantidad debe ser un entero positivo");
        }
    }
}
