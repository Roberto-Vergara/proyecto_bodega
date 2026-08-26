import { ConflictError, NotFoundError, ValidationError } from "../../../shared/domain/errors.js";
import type { IIdGenPort } from "../../../shared/domain/idGen.port.js";
import type { IUnitOfWorkRunner } from "../../../shared/domain/unit-of-work.port.js";
import { VentaLog } from "../../../ventas_log/domain/venta-log.domain.js";
import type { IVentaLogRepository } from "../../../ventas_log/domain/venta-log.repository.js";
import type {
    ItemVentaExterna,
    IVentaExternaPort,
    VentaExterna,
} from "../../../ventas_log/domain/venta-externa.port.js";
import { CarroItem } from "../../domain/carro-item.domain.js";
import { sincronizarOcupacion } from "../service/sincronizar-ocupacion.js";
import type {
    AsignarItemsInput,
    AsignarItemsOutput,
    ItemAAsignarDto,
    ItemAsignadoDto,
} from "../dto/asignar.dto.js";


/**
 * Cargar vidrios en un carro.
 *
 * Es el caso de uso central y el mas delicado, porque tiene que sostener la
 * invariante del negocio: la suma de lo repartido en todos los carros nunca
 * puede pasar de lo que se vendio.
 *
 * Postgres no puede expresar eso con un CHECK (la suma cruza filas), asi que
 * se valida aca adentro de una transaccion, tomando un lock sobre la fila de
 * ventas_log. Ese lock serializa a los operarios que carguen la MISMA nota de
 * venta al mismo tiempo; sin el, los dos leen el mismo "disponible" y entre
 * los dos asignan de mas.
 */
export class AsignarItemsACarroUseCase{
    constructor(
        private readonly uow:IUnitOfWorkRunner,
        private readonly ventaExterna:IVentaExternaPort,
        private readonly ventaLogRepository:IVentaLogRepository,
        private readonly idGen:IIdGenPort,
    ){}

    async execute(input:AsignarItemsInput):Promise<AsignarItemsOutput>{
        const { carroId, codVenta, usuarioId } = input;

        // 1) DB2 primero y FUERA de la transaccion: el AS400 es lento y a veces
        //    se cuelga. Mantener abierta una transaccion de postgres mientras
        //    esperamos al AS400 seria pedir un bloqueo largo por gusto
        const externa = await this.ventaExterna.findByCodigo(codVenta);

        if(!externa){
            throw new NotFoundError(`No existe la venta ${codVenta}`);
        }

        // 2) el espejo tiene que existir antes de poder lockearlo
        await this.asegurarEspejo(externa);

        const itemsDB2 = new Map(externa.items.map((item)=>[item.nroItem,item]));

        // 3) todo lo que toca la base va adentro de la transaccion
        return this.uow.run(async (uow)=>{
            // el lock: a partir de aca, nadie mas asigna esta venta hasta que terminemos
            const venta = await uow.ventas.lockByCodVenta(codVenta);

            if(!venta){
                throw new NotFoundError(`No se pudo bloquear la venta ${codVenta}`);
            }

            const carro = await uow.carros.findById(carroId);

            if(!carro){
                throw new NotFoundError(`No existe el carro ${carroId}`);
            }

            if(!carro.puedeRecibirVidrios()){
                throw new ConflictError(
                    `El carro ${carro.nroCarro} esta en estado "${carro.estado}" y no puede recibir vidrios`,
                );
            }

            // ya con el lock puesto, esta suma es confiable
            const asignadas = await uow.carroItems.cantidadesAsignadasDeVenta(codVenta);

            const solicitados = input.asignarTodoPendiente
                ? this.todoLoPendiente(externa, asignadas)
                : this.validarSolicitud(input.items);

            if(solicitados.length === 0){
                throw new ValidationError(
                    input.asignarTodoPendiente
                        ? `La venta ${codVenta} no tiene unidades pendientes por cargar`
                        : "Hay que indicar al menos un item para asignar",
                );
            }

            const aGuardar:CarroItem[] = [];
            const asignados:ItemAsignadoDto[] = [];

            for(const solicitado of solicitados){
                const itemDB2 = itemsDB2.get(solicitado.nroItem);

                if(!itemDB2){
                    throw new NotFoundError(
                        `El item ${solicitado.nroItem} no existe en la venta ${codVenta}`,
                    );
                }

                const yaAsignada = asignadas.get(solicitado.nroItem) ?? 0;
                const disponible = itemDB2.cantidad - yaAsignada;

                if(solicitado.cantidad > disponible){
                    throw new ConflictError(
                        `No se pueden cargar ${solicitado.cantidad} unidades del item ${solicitado.nroItem}: ` +
                        `de ${itemDB2.cantidad} vendidas ya hay ${yaAsignada} en carros, quedan ${Math.max(disponible,0)}`,
                    );
                }

                const snapshot = {
                    codItem: itemDB2.codItem,
                    dim1: itemDB2.dim1,
                    dim2: itemDB2.dim2,
                    dim3: itemDB2.dim3,
                    marcaPieza: itemDB2.marcaPieza,
                    cantidadTotalItem: itemDB2.cantidad,
                };

                // si el item ya estaba en ESTE carro, se suma a la fila que existe
                // en vez de crear una segunda (lo garantiza el indice unico parcial)
                const existente = await uow.carroItems.findActivoPorCarroYItem(
                    carroId,
                    codVenta,
                    solicitado.nroItem,
                );

                let fila:CarroItem;

                if(existente){
                    existente.refrescarSnapshot(snapshot);
                    existente.sumar(solicitado.cantidad);
                    fila = existente;
                }else{
                    fila = CarroItem.crear({
                        id: this.idGen.generate(),
                        carroId,
                        codVenta,
                        nroItem: solicitado.nroItem,
                        cantidadAsignada: solicitado.cantidad,
                        asignadoPor: usuarioId,
                        ...snapshot,
                    });
                }

                aGuardar.push(fila);

                // se actualiza el acumulado en memoria por si el mismo lote
                // trae dos lineas del mismo item
                asignadas.set(solicitado.nroItem, yaAsignada + solicitado.cantidad);

                asignados.push({
                    item_id: fila.id,
                    nro_item: fila.nroItem,
                    cod_item: fila.codItem,
                    cantidad_asignada_ahora: solicitado.cantidad,
                    cantidad_en_este_carro: fila.cantidadAsignada,
                    cantidad_total_item: fila.cantidadTotalItem,
                    disponible_despues: itemDB2.cantidad - (yaAsignada + solicitado.cantidad),
                });
            }

            await uow.carroItems.saveMuchos(aGuardar);

            // el carro pasa a EN_USO. La ocupacion la maneja el sistema,
            // el estado (LLENO) lo sigue decidiendo el operario
            await sincronizarOcupacion(uow, carroId);

            const enElCarro = await uow.carroItems.findActivosPorCarro(carroId);

            return {
                carro_id: carro.id,
                nro_carro: carro.nroCarro,
                cod_venta: codVenta,
                asignados,
                total_piezas_cargadas: enElCarro.reduce((t,i)=>t+i.cantidadAsignada,0),
            };
        });
    }

    // upsert de la cabecera para que exista la fila que vamos a lockear
    private async asegurarEspejo(externa:VentaExterna):Promise<void>{
        const datos = {
            nomCliente: externa.nomCliente,
            rutCliente: externa.rutCliente,
            idVendedor: externa.idVendedor,
            fechaOrden: externa.fechaOrden,
            instrucciones: externa.instrucciones,
            montoTotal: externa.montoTotal,
        };

        const existente = await this.ventaLogRepository.findByCodVenta(externa.codVenta);

        if(existente){
            existente.refrescarDesdeExterno(datos);
            await this.ventaLogRepository.save(existente);
            return;
        }

        await this.ventaLogRepository.save(VentaLog.crear({
            id: this.idGen.generate(),
            codVenta: externa.codVenta,
            ultimaConsulta: new Date(),
            ...datos,
        }));
    }

    // "cargar la familia entera": todo lo que quede pendiente de la venta
    private todoLoPendiente(
        externa:VentaExterna,
        asignadas:Map<number,number>,
    ):ItemAAsignarDto[]{
        return externa.items
            .map((item:ItemVentaExterna)=>({
                nroItem: item.nroItem,
                cantidad: item.cantidad - (asignadas.get(item.nroItem) ?? 0),
            }))
            .filter((item)=>item.cantidad > 0);
    }

    private validarSolicitud(items:ItemAAsignarDto[]):ItemAAsignarDto[]{
        const vistos = new Set<number>();

        for(const item of items){
            if(!Number.isInteger(item.nroItem) || item.nroItem <= 0){
                throw new ValidationError("nroItem debe ser un entero positivo");
            }

            if(!Number.isInteger(item.cantidad) || item.cantidad <= 0){
                throw new ValidationError(
                    `La cantidad del item ${item.nroItem} debe ser un entero positivo`,
                );
            }

            // si viniera dos veces el mismo item habria que decidir si se suma
            // o se pisa: mejor rechazar y que el cliente mande una sola linea
            if(vistos.has(item.nroItem)){
                throw new ValidationError(`El item ${item.nroItem} viene repetido en la solicitud`);
            }

            vistos.add(item.nroItem);
        }

        return items;
    }
}
