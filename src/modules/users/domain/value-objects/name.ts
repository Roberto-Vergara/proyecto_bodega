import { ValidationError } from "../../../shared/domain/errors.js";




export class NameVO{
    private constructor(private readonly value:string){}
    
    static create(raw: string, campo = "nombre"): NameVO {
        if (typeof raw !== "string" || raw.trim() === "") {
            throw new ValidationError(`El ${campo} es obligatorio`);
        }

        const limpio = raw.trim().replace(/\s+/g, " ");

        if (limpio.length < 2) {
            throw new ValidationError(`El ${campo} debe tener al menos 2 caracteres`);
        }

        if (limpio.length > 100) {
            throw new ValidationError(`El ${campo} no puede superar los 100 caracteres`);
        }

        return new NameVO(limpio);
    }

    getValue(): string {
        return this.value;
    }

    toString(): string {
        return this.value;
    }
}