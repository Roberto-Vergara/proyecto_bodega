
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Email normalizado (trim + minúsculas). Al ser un VO, si tienes una instancia
 * de Email puedes asumir que es válido: la validación vive en un solo lugar.
 */
export class EmailVO {
    private constructor(private readonly value: string) {}

    static create(raw: string): EmailVO {
        if (typeof raw !== "string" || raw.trim() === "") {
            throw new Error("El correo es obligatorio");
        }

        const normalizado = raw.trim().toLowerCase();

        if (normalizado.length > 150) {
            throw new Error("El correo no puede superar los 150 caracteres");
        }

        if (!EMAIL_REGEX.test(normalizado)) {
            throw new Error("El correo electrónico no tiene un formato válido");
        }

        return new EmailVO(normalizado);
    }

    getValue(): string {
        return this.value;
    }

    equals(otro: EmailVO): boolean {
        return this.value === otro.value;
    }

    toString(): string {
        return this.value;
    }
}
