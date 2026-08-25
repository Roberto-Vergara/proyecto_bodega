


export enum EstadoCarro{
    DISPONIBLE="disponibre",
    EN_USO="en_uso",
    FUERA_SERVICIO="fuera_servicio"
};

export enum UbicacionCarro{
    PRODUCTOS_TERMINADOS="productos_terminados",
    PRODUCCION="produccion",
}


export class Carro{
    private constructor(
        private readonly id:string,
        private nro_carro:number,
        private estado_carro:EstadoCarro,
        private ubicacion_carro:UbicacionCarro
    ){}

    static crear(uuid:string,nro_carro:number,ubicacion_carro:UbicacionCarro):Carro{
        if(nro_carro<=0){
            throw new Error("El numero de carro debe ser positivo");
        }
        return new Carro(
            uuid,
            nro_carro,
            EstadoCarro.DISPONIBLE,
            ubicacion_carro
        )
    }

    static reconstruir(
        id:string,
        nro_carro:number,
        estado_carro:EstadoCarro,
        ubicacion_carro:UbicacionCarro
    ):Carro{
        return new Carro(id, nro_carro, estado_carro, ubicacion_carro);
    }


    getId(): string {
        return this.id;
    }

    getNroCarro(): number {
        return this.nro_carro;
    }

    getEstado(): EstadoCarro {
        return this.estado_carro;
    }

    getUbicacion(): UbicacionCarro {
        return this.ubicacion_carro;
    }

    // --- Comportamiento / reglas de negocio ---

    marcarEnUso(): void {
        if (this.estado_carro !== EstadoCarro.DISPONIBLE) {
            throw new Error(`No se puede usar un carro en estado ${this.estado_carro}`);
        }
        this.estado_carro = EstadoCarro.EN_USO;
    }

    liberar(): void {
        if (this.estado_carro !== EstadoCarro.EN_USO) {
            throw new Error(`No se puede liberar un carro en estado ${this.estado_carro}`);
        }
        this.estado_carro = EstadoCarro.DISPONIBLE;
    }

    marcarFueraDeServicio(): void {
        this.estado_carro = EstadoCarro.FUERA_SERVICIO;
    }

    moverA(ubicacion: UbicacionCarro): void {
        this.ubicacion_carro = ubicacion;
    }
}