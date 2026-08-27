import type { IEncrypt } from "../../../shared/domain/encrypt.port.js";
import { InvalidCredentialsError } from "../../../users/domain/errors/user.errors.js";
import type { IUserRepository } from "../../../users/domain/user.repository.js";
import type { LoginInputDto, LoginOutputDto } from "../dto/auth.dto.js";
import type { TokenIssuer } from "../service/token-issuer.js";

// hash falso (de la palabra "dummy") solo para quemar tiempo cuando el usuario no existe.
// si no lo hacemos, un email inexistente responde en 1ms y uno real en ~80ms:
// con eso cualquiera puede averiguar que correos estan registrados
const HASH_SEÑUELO = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";


export class LoginUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly passwordHasher: IEncrypt,
        private readonly tokenIssuer: TokenIssuer,
    ) {}

    async execute(input: LoginInputDto): Promise<LoginOutputDto> {
        const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
        const password = typeof input.password === "string" ? input.password : "";

        if (email === "" || password === "") {
            throw new InvalidCredentialsError();
        }

        const user = await this.userRepository.findByEmail(email);

        const passwordValida = await this.passwordHasher.compare(
            password,
            user ? user.passHash : HASH_SEÑUELO,
        );

        // un solo error para "no existe", "esta desactivado" y "clave mala":
        // al cliente no le decimos cual de las tres fue
        if (!user || !user.isActive || !passwordValida) {
            throw new InvalidCredentialsError();
        }

        const tokens = await this.tokenIssuer.issue(user, input.deviceInfo);

        return {
            ...tokens,
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                role: user.role,
                area: user.area,
                primera_password: user.primeraPassword,
            },
        };
    }
}
