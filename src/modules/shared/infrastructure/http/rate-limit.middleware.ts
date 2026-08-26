import type { NextFunction, Request, Response } from "express";


interface Ventana{
    contador:number;
    // momento (ms) en que se reinicia la cuenta
    reinicioEn:number;
}

export interface RateLimitOptions{
    // largo de la ventana en ms
    ventanaMs:number;
    // cuantas requests se permiten por ventana
    maximo:number;
    mensaje?:string;
    // por defecto limita por IP; en login conviene limitar tambien por email
    clave?:(req:Request)=>string;
}


/**
 * Limitador simple en memoria, pensado para frenar fuerza bruta en /auth/login.
 *
 * Es "por proceso": si mañana levantas varias instancias detrás de un balanceador,
 * cada una lleva su propia cuenta. Para eso habría que moverlo a Redis, pero para
 * un backend de bodega en un solo servidor esto sobra y no agrega dependencias.
 */
export function rateLimit(options:RateLimitOptions){
    const { ventanaMs, maximo } = options;
    const mensaje = options.mensaje ?? "Demasiados intentos, espera un momento";
    const obtenerClave = options.clave ?? ((req:Request)=>req.ip ?? "desconocido");

    const ventanas = new Map<string,Ventana>();

    // limpieza periodica para que el Map no crezca para siempre.
    // unref() para que este timer no le impida a node cerrar el proceso
    const limpieza = setInterval(()=>{
        const ahora = Date.now();
        for(const [clave,ventana] of ventanas){
            if(ventana.reinicioEn <= ahora){
                ventanas.delete(clave);
            }
        }
    }, ventanaMs);
    limpieza.unref();

    return (req:Request,res:Response,next:NextFunction):void=>{
        const clave = obtenerClave(req);
        const ahora = Date.now();
        const ventana = ventanas.get(clave);

        if(!ventana || ventana.reinicioEn <= ahora){
            ventanas.set(clave,{contador:1,reinicioEn:ahora+ventanaMs});
            next();
            return;
        }

        ventana.contador += 1;

        if(ventana.contador > maximo){
            const esperaS = Math.ceil((ventana.reinicioEn - ahora)/1000);
            res.setHeader("Retry-After",String(esperaS));
            res.status(429).json({error:mensaje,retryAfter:esperaS});
            return;
        }

        next();
    };
}
