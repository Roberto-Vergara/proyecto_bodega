import type { NextFunction, Request, Response } from "express";

import { ValidationError } from "../../../shared/domain/errors.js";
import { TipoMovimiento } from "../../domain/movimiento.domain.js";
import type { FiltrosMovimiento } from "../../domain/movimiento.repository.js";
import type { ListarMovimientosUseCase } from "../../application/use-cases/listarMovimientos.use-case.js";


function leerEntero(valor:unknown,campo:string,porDefecto:number):number{
    if(valor === undefined) return porDefecto;

    const texto = typeof valor === "string" ? valor.trim() : String(valor);

    if(!/^\d+$/.test(texto)){
        throw new ValidationError(`${campo} debe ser un numero entero`);
    }

    return Number(texto);
}

function leerFecha(valor:unknown,campo:string):Date|undefined{
    if(valor === undefined) return undefined;

    if(typeof valor !== "string"){
        throw new ValidationError(`${campo} debe ser una fecha ISO`);
    }

    const fecha = new Date(valor);

    if(Number.isNaN(fecha.getTime())){
        throw new ValidationError(`${campo} no es una fecha valida (usa formato ISO)`);
    }

    return fecha;
}


export class MovimientoController{
    constructor(private readonly listarMovimientosUseCase:ListarMovimientosUseCase){}

    // GET /movimientos?carroId=&codVenta=&tipo=&usuarioId=&desde=&hasta=&limite=&offset=
    listar=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            res.status(200).json(await this.consultar(req, this.filtrosDeQuery(req)));
        } catch (error) {
            next(error);
        }
    };

    // GET /carros/:id/movimientos -> el historial de un carro puntual
    porCarro=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const carroId = req.params["id"];

            if(typeof carroId !== "string" || carroId.trim() === ""){
                throw new ValidationError("Falta el id del carro");
            }

            res.status(200).json(await this.consultar(req, {
                ...this.filtrosDeQuery(req),
                carroId,
            }));
        } catch (error) {
            next(error);
        }
    };

    // GET /ventas/:codVenta/movimientos -> todo lo que se hizo con esa venta
    porVenta=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
        try {
            const codVenta = leerEntero(req.params["codVenta"],"codVenta",0);

            if(codVenta <= 0){
                throw new ValidationError("codVenta debe ser un numero entero positivo");
            }

            res.status(200).json(await this.consultar(req, {
                ...this.filtrosDeQuery(req),
                codVenta,
            }));
        } catch (error) {
            next(error);
        }
    };

    private async consultar(req:Request, filtros:FiltrosMovimiento){
        return this.listarMovimientosUseCase.execute(
            filtros,
            leerEntero(req.query["limite"],"limite",50),
            leerEntero(req.query["offset"],"offset",0),
        );
    }

    private filtrosDeQuery(req:Request):FiltrosMovimiento{
        const filtros:FiltrosMovimiento = {};

        const carroId = req.query["carroId"];
        if(typeof carroId === "string" && carroId.trim() !== ""){
            filtros.carroId = carroId;
        }

        const codVenta = req.query["codVenta"];
        if(codVenta !== undefined){
            filtros.codVenta = leerEntero(codVenta,"codVenta",0);
        }

        const tipo = req.query["tipo"];
        if(tipo !== undefined){
            const validos = Object.values(TipoMovimiento);

            if(typeof tipo !== "string" || !validos.includes(tipo as TipoMovimiento)){
                throw new ValidationError(`tipo invalido. Validos: ${validos.join(", ")}`);
            }

            filtros.tipo = tipo as TipoMovimiento;
        }

        const usuarioId = req.query["usuarioId"];
        if(typeof usuarioId === "string" && usuarioId.trim() !== ""){
            filtros.usuarioId = usuarioId;
        }

        const desde = leerFecha(req.query["desde"],"desde");
        if(desde !== undefined) filtros.desde = desde;

        const hasta = leerFecha(req.query["hasta"],"hasta");
        if(hasta !== undefined) filtros.hasta = hasta;

        return filtros;
    }
}
