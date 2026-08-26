import type { NextFunction, Request, Response } from "express";

import { ValidationError } from "../../../shared/domain/errors.js";
import type { AsignarItemsACarroUseCase } from "../../../carro_items/application/use-cases/asignarItemsACarro.use-case.js";
import type { ItemAAsignarDto } from "../../../carro_items/application/dto/asignar.dto.js";
import type { CrearCarroUseCase } from "../../application/use-cases/crearCarro.use-case.js";
import type { MoverItemsEntreCarrosUseCase } from "../../../carro_items/application/use-cases/moverItemsEntreCarros.use-case.js";
import type { QuitarItemsDeCarroUseCase } from "../../../carro_items/application/use-cases/quitarItemsDeCarro.use-case.js";
import type { ActualizarCarroUseCase } from "../../application/use-cases/actualizarCarro.use-case.js";
import type { ListarCarrosUseCase } from "../../application/use-cases/listarCarros.use-case.js";
import type { ObtenerContenidoCarroUseCase } from "../../application/use-cases/obtenerContenidoCarro.use-case.js";
import { EstadoCarro, OcupacionCarro, UbicacionCarro } from "../../domain/carro.domain.js";
import { aRespuestaCarro } from "./carro.presenter.js";


function leerIdCarro(req:Request):string{
    const id = req.params["id"];

    if(typeof id !== "string" || id.trim() === ""){
        throw new ValidationError("Falta el id del carro");
    }

    return id;
}

function leerCarroItemId(req:Request):string{
    const id = req.params["carroItemId"];

    if(typeof id !== "string" || id.trim() === ""){
        throw new ValidationError("Falta el id de la asignacion");
    }

    return id;
}

// cantidad opcional: si no viene, la operacion aplica a todo el item
function leerCantidadOpcional(valor:unknown):number|undefined{
    if(valor === undefined) return undefined;

    const texto = typeof valor === "string" ? valor.trim() : String(valor);

    if(!/^\d+$/.test(texto)){
        throw new ValidationError("cantidad debe ser un numero entero positivo");
    }

    const n = Number(texto);

    if(!Number.isSafeInteger(n) || n <= 0){
        throw new ValidationError("cantidad debe ser un numero entero positivo");
    }

    return n;
}


// los filtros del listado son opcionales: si no vienen, no se filtra.
// si vienen con basura, mejor un 400 claro que ignorarlos en silencio
function leerFiltroEnum<T extends Record<string,string>, R>(
    valor:unknown,
    enumerado:T,
    campo:string,
    construir:(valido:T[keyof T])=>R,
):R|Record<string,never>{
    if(valor === undefined) return {};

    const validos = Object.values(enumerado);

    if(typeof valor !== "string" || !validos.includes(valor)){
        throw new ValidationError(campo + " invalido. Validos: " + validos.join(", "));
    }

    return construir(valor as T[keyof T]);
}


export class CarroController{
    constructor(
        private readonly crearCarroUseCase:CrearCarroUseCase,
        private readonly obtenerContenidoCarroUseCase:ObtenerContenidoCarroUseCase,
        private readonly asignarItemsACarroUseCase:AsignarItemsACarroUseCase,
        private readonly moverItemsEntreCarrosUseCase:MoverItemsEntreCarrosUseCase,
        private readonly quitarItemsDeCarroUseCase:QuitarItemsDeCarroUseCase,
        private readonly listarCarrosUseCase:ListarCarrosUseCase,
        private readonly actualizarCarroUseCase:ActualizarCarroUseCase,
    ){}

    listar=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const carros = await this.listarCarrosUseCase.execute({
                ...leerFiltroEnum(req.query["estado"],EstadoCarro,"estado",(v)=>({estado:v})),
                ...leerFiltroEnum(req.query["ocupacion"],OcupacionCarro,"ocupacion",(v)=>({ocupacion:v})),
                ...leerFiltroEnum(req.query["ubicacion"],UbicacionCarro,"ubicacion",(v)=>({ubicacion:v})),
            });

            res.status(200).json(carros);
        } catch (error) {
            next(error);
        }
    };

    actualizar=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const body = (req.body ?? {}) as Record<string,unknown>;
            const estado = body["estado_carro"] ?? body["estado"];
            const ubicacion = body["ubicacion_carro"] ?? body["ubicacion"];

            if(estado !== undefined && !Object.values(EstadoCarro).includes(estado as EstadoCarro)){
                throw new ValidationError(
                    "estado_carro invalido. Validos: " + Object.values(EstadoCarro).join(", "),
                );
            }

            if(ubicacion !== undefined && !Object.values(UbicacionCarro).includes(ubicacion as UbicacionCarro)){
                throw new ValidationError(
                    "ubicacion_carro invalida. Validas: " + Object.values(UbicacionCarro).join(", "),
                );
            }

            const carro = await this.actualizarCarroUseCase.execute({
                carroId: leerIdCarro(req),
                ...(estado !== undefined && { estado: estado as EstadoCarro }),
                ...(ubicacion !== undefined && { ubicacion: ubicacion as UbicacionCarro }),
            });

            res.status(200).json(aRespuestaCarro(carro));
        } catch (error) {
            next(error);
        }
    };

    crear=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const body = (req.body ?? {}) as Record<string,unknown>;
            const {nro_carro,ubicacion_carro} = body;

            if(typeof nro_carro !=="number"){
                throw new ValidationError("nro_carro debe ser un numero");
            }

            if (!Object.values(UbicacionCarro).includes(ubicacion_carro as UbicacionCarro)) {
                throw new ValidationError(
                    `ubicacion_carro invalida. Validas: ${Object.values(UbicacionCarro).join(", ")}`,
                );
            }

            const carro = await this.crearCarroUseCase.execute({
                nro_carro,
                ubicacion_carro: ubicacion_carro as UbicacionCarro,
            });

            res.status(201).json(aRespuestaCarro(carro));
        } catch (error) {
            next(error);
        }
    };

    obtener=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const contenido = await this.obtenerContenidoCarroUseCase.execute(leerIdCarro(req));
            res.status(200).json(contenido);
        } catch (error) {
            next(error);
        }
    };

    asignarItems=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const carroId = leerIdCarro(req);
            const body = (req.body ?? {}) as Record<string,unknown>;

            const codVenta = body["codVenta"] ?? body["cod_venta"];

            if(typeof codVenta !== "number" || !Number.isSafeInteger(codVenta) || codVenta <= 0){
                throw new ValidationError("codVenta debe ser un numero entero positivo");
            }

            const asignarTodoPendiente = body["asignarTodoPendiente"] === true;
            const items = this.leerItems(body["items"], asignarTodoPendiente);

            const resultado = await this.asignarItemsACarroUseCase.execute({
                carroId,
                codVenta,
                items,
                asignarTodoPendiente,
                // quien carga el carro, para trazabilidad
                usuarioId: req.user?.userId ?? null,
            });

            res.status(201).json(resultado);
        } catch (error) {
            next(error);
        }
    };

    moverItems=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const body = (req.body ?? {}) as Record<string,unknown>;
            const carroDestinoId = body["carroDestinoId"] ?? body["carro_destino_id"];

            if(typeof carroDestinoId !== "string" || carroDestinoId.trim() === ""){
                throw new ValidationError("carroDestinoId es obligatorio");
            }

            const cantidad = leerCantidadOpcional(body["cantidad"]);

            const resultado = await this.moverItemsEntreCarrosUseCase.execute({
                carroItemId: leerCarroItemId(req),
                carroDestinoId,
                ...(cantidad !== undefined && { cantidad }),
            });

            res.status(200).json(resultado);
        } catch (error) {
            next(error);
        }
    };

    quitarItems=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const cantidad = leerCantidadOpcional(req.query["cantidad"]);

            const resultado = await this.quitarItemsDeCarroUseCase.execute({
                carroItemId: leerCarroItemId(req),
                ...(cantidad !== undefined && { cantidad }),
            });

            res.status(200).json(resultado);
        } catch (error) {
            next(error);
        }
    };

    private leerItems(valor:unknown, asignarTodoPendiente:boolean):ItemAAsignarDto[]{
        if(asignarTodoPendiente){
            // el caso de uso calcula solo que falta cargar
            return [];
        }

        if(!Array.isArray(valor) || valor.length === 0){
            throw new ValidationError(
                'Hay que mandar "items": [{ nroItem, cantidad }] o bien "asignarTodoPendiente": true',
            );
        }

        return valor.map((crudo)=>{
            const item = (crudo ?? {}) as Record<string,unknown>;
            const nroItem = item["nroItem"] ?? item["nro_item"];
            const cantidad = item["cantidad"];

            if(typeof nroItem !== "number" || typeof cantidad !== "number"){
                throw new ValidationError("Cada item necesita nroItem y cantidad numericos");
            }

            return { nroItem, cantidad };
        });
    }
}
