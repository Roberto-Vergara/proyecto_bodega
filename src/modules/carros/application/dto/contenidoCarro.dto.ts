import type { EstadoItemEnCarro } from "../../../carro_items/domain/carro-item.domain.js";
import type { EstadoCarro, OcupacionCarro, UbicacionCarro } from "../../domain/carro.domain.js";


export interface LineaContenidoDto{
    item_id:string;
    cod_venta:number;
    nom_cliente:string|null;
    nro_item:number;
    cod_item:string;
    marca_pieza:string|null;
    dimensiones:string;
    // cuantas de estas piezas van en ESTE carro
    cantidad_en_este_carro:number;
    // cuantas se vendieron en total
    cantidad_total_item:number;
    // derivado: COMPLETO_EN_CARRO si todo el item cayo aca, PARCIAL si no
    estado_item:EstadoItemEnCarro;
    fecha_asignacion:string;
}

export interface ContenidoCarroDto{
    carro_id:string;
    nro_carro:number;
    estado_carro:EstadoCarro;
    ocupacion:OcupacionCarro;
    ubicacion_carro:UbicacionCarro;
    total_piezas_cargadas:number;
    contenido:LineaContenidoDto[];
}
