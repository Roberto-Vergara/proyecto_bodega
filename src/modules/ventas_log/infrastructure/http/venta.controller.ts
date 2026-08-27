import type { NextFunction, Request, Response } from "express";

import { ValidationError } from "../../../shared/domain/errors.js";
import type { DespacharVentaUseCase } from "../../../carro_items/application/use-cases/despacharVenta.use-case.js";
import type { BuscarVentaUseCase } from "../../application/use-cases/buscarVenta.use-case.js";
import type { ListarVentasEnProcesoUseCase } from "../../application/use-cases/listarVentasEnProceso.use-case.js";
import type { ObtenerDistribucionVentaUseCase } from "../../application/use-cases/obtenerDistribucionVenta.use-case.js";


// OHORDÑ en DB2 es NUMERIC(6,0): mas de 6 digitos ni siquiera cabe en la
// columna. Sin este tope, el AS400 responde "Valor numerico fuera de rango"
// despues de un viaje de ida y vuelta, y queda un error feo en el log
const MAX_COD_VENTA = 999999;

// los codigos de venta y los nro de item vienen de la URL, o sea son texto
// que escribio alguien: hay que validarlos antes de pasarlos a una query
export function leerEnteroPositivo(valor:unknown,campo:string):number{
    const texto = typeof valor === "string" ? valor.trim() : String(valor ?? "");

    if(!/^\d+$/.test(texto)){
        throw new ValidationError(`${campo} debe ser un numero entero positivo`);
    }

    const n = Number(texto);

    if(!Number.isSafeInteger(n) || n <= 0){
        throw new ValidationError(`${campo} debe ser un numero entero positivo`);
    }

    return n;
}

function leerCodVenta(req:Request):number{
    const cod = leerEnteroPositivo(req.params["codVenta"],"codVenta");

    if(cod > MAX_COD_VENTA){
        throw new ValidationError(
            `codVenta no puede tener mas de 6 digitos (maximo ${MAX_COD_VENTA})`,
        );
    }

    return cod;
}


export class VentaController{
    constructor(
        private readonly buscarVentaUseCase:BuscarVentaUseCase,
        private readonly obtenerDistribucionVentaUseCase:ObtenerDistribucionVentaUseCase,
        private readonly despacharVentaUseCase:DespacharVentaUseCase,
        private readonly listarVentasEnProcesoUseCase:ListarVentasEnProcesoUseCase,
    ){}

    // GET /ventas -> lo que hay a medio cargar en la planta ahora mismo
    enProceso = async(_req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            res.status(200).json(await this.listarVentasEnProcesoUseCase.execute());
        } catch (error) {
            next(error);
        }
    };

    distribucion = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const codVenta = leerCodVenta(req);
            res.status(200).json(await this.obtenerDistribucionVentaUseCase.execute(codVenta));
        } catch (error) {
            next(error);
        }
    };

    despachar = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const codVenta = leerCodVenta(req);
            res.status(200).json(
                await this.despacharVentaUseCase.execute(codVenta, req.user?.userId ?? null),
            );
        } catch (error) {
            next(error);
        }
    };

    buscar = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const codVenta = leerCodVenta(req);

            // ?nroItem= es opcional: acota el detalle a un solo item
            const nroItemRaw = req.query["nroItem"];
            const nroItem = nroItemRaw === undefined
                ? undefined
                : leerEnteroPositivo(nroItemRaw,"nroItem");

            const venta = await this.buscarVentaUseCase.execute({
                codVenta,
                ...(nroItem !== undefined && { nroItem }),
            });

            res.status(200).json(venta);
        } catch (error) {
            next(error);
        }
    };
}
