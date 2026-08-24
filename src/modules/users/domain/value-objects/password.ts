export class PasswordVO {
    private constructor(private readonly value: string) {}

    // 1. Para claves NUEVAS en texto plano (valida longitud y complejidad)
    static create(raw: string): PasswordVO {
        if (typeof raw !== "string" || raw.trim() === "") {
            throw new Error("La clave es obligatoria");
        }

        if (raw.length < 8) {
            throw new Error("La clave debe tener al menos 8 caracteres");
        }

        if (raw.length > 72) {
            // bcrypt trunca silenciosamente después de 72 bytes: mejor rechazar.
            throw new Error("La clave no puede superar los 72 caracteres");
        }

        if (!/[a-z]/.test(raw) || !/[A-Z]/.test(raw) || !/[0-9]/.test(raw)) {
            throw new Error(
                "La clave debe incluir al menos una minúscula, una mayúscula y un número"
            );
        }

        return new PasswordVO(raw);
    }

    // 2. Para HASHES ya procesados (evita validar reglas de texto plano)
    static fromHash(hash: string): PasswordVO {
        if (typeof hash !== "string" || hash.trim() === "") {
            throw new Error("El hash de la clave es obligatorio");
        }

        return new PasswordVO(hash);
    }

    getValue(): string {
        return this.value;
    }

    toString(): string {
        return "[Clave]";
    }

    toJSON(): string {
        return "[Clave]";
    }
}