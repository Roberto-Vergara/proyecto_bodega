import type { NextFunction, Request, Response } from "express";

import { ValidationError } from "../../../shared/domain/errors.js";
import type { DespacharVentaUseCase } from "../../../carro_items/application/use-cases/despacharVenta.use-case.js";
import type { BuscarVentaUseCase } from "../../application/use-cases/buscarVenta.use-case.js";
import type { ObtenerDistribucionVentaUseCase } from "../../application/use-cases/obtenerDistribucionVenta.use-case.js";


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


export class VentaController{
    constructor(
        private readonly buscarVentaUseCase:BuscarVentaUseCase,
        private readonly obtenerDistribucionVentaUseCase:ObtenerDistribucionVentaUseCase,
        private readonly despacharVentaUseCase:DespacharVentaUseCase,
    ){}

    distribucion = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const codVenta = leerEnteroPositivo(req.params["codVenta"],"codVenta");
            res.status(200).json(await this.obtenerDistribucionVentaUseCase.execute(codVenta));
        } catch (error) {
            next(error);
        }
    };

    despachar = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const codVenta = leerEnteroPositivo(req.params["codVenta"],"codVenta");
            res.status(200).json(await this.despacharVentaUseCase.execute(codVenta));
        } catch (error) {
            next(error);
        }
    };

    buscar = async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const codVenta = leerEnteroPositivo(req.params["codVenta"],"codVenta");

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
