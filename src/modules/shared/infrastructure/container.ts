// ==========================================================================
// composition root
// aca se arma UNA sola vez el grafo de dependencias (repos, servicios, casos de uso)
// y las rutas solo lo consumen. Sin esto cada archivo de rutas creaba sus propias
// instancias y terminabas con dos JwtTokenService, dos repos, etc.
// ==========================================================================
import { TokenIssuer } from "../../auth/application/service/token-issuer.js";
import { LoginUseCase } from "../../auth/application/use-case/login.use-case.js";
import { LogoutUseCase } from "../../auth/application/use-case/logout.use-case.js";
import { LogoutAllUseCase } from "../../auth/application/use-case/logout-all.use-case.js";
import { RefreshTokenUseCase } from "../../auth/application/use-case/refresh-token.use-case.js";
import { RefreshTokenRepositoryImpl } from "../../auth/infrastructure/persistence/refresh-token.repository.impl.js";

import { ActivarUserUseCase } from "../../users/application/use-cases/activarUser.use-case.js";
import { CambiarPasswordUseCase } from "../../users/application/use-cases/cambiarPassword.use-case.js";
import { CreateUserUseCase } from "../../users/application/use-cases/createUser.use-case.js";
import { ResetearPasswordUseCase } from "../../users/application/use-cases/resetearPassword.use-case.js";
import { DesactivareUserUserCase } from "../../users/application/use-cases/desactivateUser.use-case.js";
import { FindUserByIdUseCase } from "../../users/application/use-cases/findUserById.use-case.js";
import { GetAllUsersUseCase } from "../../users/application/use-cases/getAllUsers.use-case.js";
import { UpdateUserUseCase } from "../../users/application/use-cases/updateUser.use-case.js";
import { UserRepositoryImpl } from "../../users/infrastructure/persistence/user.repository.impl.js";

import { ActualizarCarroUseCase } from "../../carros/application/use-cases/actualizarCarro.use-case.js";
import { CrearCarroUseCase } from "../../carros/application/use-cases/crearCarro.use-case.js";
import { ListarCarrosUseCase } from "../../carros/application/use-cases/listarCarros.use-case.js";
import { ReconciliarOcupacionesUseCase } from "../../carros/application/use-cases/reconciliarOcupaciones.use-case.js";
import { ObtenerContenidoCarroUseCase } from "../../carros/application/use-cases/obtenerContenidoCarro.use-case.js";
import { CarroRepositoryImpl } from "../../carros/infrastructure/persistence/carro.repository.impl.js";

import { AsignarItemsACarroUseCase } from "../../carro_items/application/use-cases/asignarItemsACarro.use-case.js";
import { DespacharVentaUseCase } from "../../carro_items/application/use-cases/despacharVenta.use-case.js";
import { VaciarCarroUseCase } from "../../carro_items/application/use-cases/vaciarCarro.use-case.js";
import { MoverItemsEntreCarrosUseCase } from "../../carro_items/application/use-cases/moverItemsEntreCarros.use-case.js";
import { QuitarItemsDeCarroUseCase } from "../../carro_items/application/use-cases/quitarItemsDeCarro.use-case.js";
import { CarroItemRepositoryImpl } from "../../carro_items/infrastructure/persistence/carro-item.repository.impl.js";

import { ListarMovimientosUseCase } from "../../movimientos/application/use-cases/listarMovimientos.use-case.js";
import { MovimientoRepositoryImpl } from "../../movimientos/infrastructure/persistence/movimiento.repository.impl.js";
import { BuscarVentaUseCase } from "../../ventas_log/application/use-cases/buscarVenta.use-case.js";
import { ListarVentasEnProcesoUseCase } from "../../ventas_log/application/use-cases/listarVentasEnProceso.use-case.js";
import { ObtenerDistribucionVentaUseCase } from "../../ventas_log/application/use-cases/obtenerDistribucionVenta.use-case.js";
import type { IVentaExternaPort } from "../../ventas_log/domain/venta-externa.port.js";
import { Db2VentaAdapter } from "../../ventas_log/infrastructure/external/db2-venta.adapter.js";
import { FakeVentaAdapter } from "../../ventas_log/infrastructure/external/fake-venta.adapter.js";
import { VentaLogRepositoryImpl } from "../../ventas_log/infrastructure/persistence/venta-log.repository.impl.js";

import { ventasSource } from "../../../config/env.config.js";
import { TypeOrmUnitOfWork } from "./database/typeorm-unit-of-work.js";
import { BcryptEncrypt } from "./BcriptEncrypt.js";
import { JwtTokenService } from "./security/jwtTokenService.js";
import { UuidAdapter } from "./uuidAdapter.js";

// --- adaptadores de infraestructura ---
export const tokenService = new JwtTokenService();
export const passwordHasher = new BcryptEncrypt();
export const idGen = new UuidAdapter();

// de donde salen las ventas. En fake no se toca el AS400 para nada
const fuenteVentas = ventasSource();
export const ventaExterna:IVentaExternaPort = fuenteVentas === "fake"
    ? new FakeVentaAdapter()
    : new Db2VentaAdapter();

console.log(`[VENTAS] Fuente de ventas: ${fuenteVentas.toUpperCase()}`);

// --- repositorios ---
// piden el repositorio de typeorm de forma perezosa, asi que se pueden instanciar
// antes de AppDataSource.initialize()
export const userRepository = new UserRepositoryImpl();
export const refreshTokenRepository = new RefreshTokenRepositoryImpl();
export const carroRepository = new CarroRepositoryImpl();
export const carroItemRepository = new CarroItemRepositoryImpl();
export const ventaLogRepository = new VentaLogRepositoryImpl();
export const movimientoRepository = new MovimientoRepositoryImpl();

// --- transacciones ---
export const unitOfWork = new TypeOrmUnitOfWork();

// --- servicios de aplicacion ---
const tokenIssuer = new TokenIssuer(tokenService, refreshTokenRepository);

// --- casos de uso: auth ---
export const loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenIssuer);
export const refreshTokenUseCase = new RefreshTokenUseCase(
    refreshTokenRepository,
    userRepository,
    tokenService,
    tokenIssuer,
);
export const logoutUseCase = new LogoutUseCase(refreshTokenRepository, tokenService);
export const logoutAllUseCase = new LogoutAllUseCase(refreshTokenRepository);

// --- casos de uso: usuarios ---
export const createUserUseCase = new CreateUserUseCase(userRepository, passwordHasher, idGen);
export const getAllUsersUseCase = new GetAllUsersUseCase(userRepository);
export const findUserByIdUseCase = new FindUserByIdUseCase(userRepository);
export const updateUserUseCase = new UpdateUserUseCase(userRepository);
export const desactivarUserUseCase = new DesactivareUserUserCase(userRepository);
export const activarUserUseCase = new ActivarUserUseCase(userRepository);
export const cambiarPasswordUseCase = new CambiarPasswordUseCase(
    userRepository,
    passwordHasher,
    refreshTokenRepository,
);
export const resetearPasswordUseCase = new ResetearPasswordUseCase(
    userRepository,
    passwordHasher,
    refreshTokenRepository,
);

// --- casos de uso: carros ---
export const crearCarroUseCase = new CrearCarroUseCase(unitOfWork, idGen);
export const obtenerContenidoCarroUseCase = new ObtenerContenidoCarroUseCase(
    carroRepository,
    carroItemRepository,
    ventaLogRepository,
);
export const listarCarrosUseCase = new ListarCarrosUseCase(carroRepository, carroItemRepository);
export const actualizarCarroUseCase = new ActualizarCarroUseCase(unitOfWork, idGen);
export const reconciliarOcupacionesUseCase = new ReconciliarOcupacionesUseCase(
    carroRepository,
    carroItemRepository,
);

// --- casos de uso: carro_items ---
export const asignarItemsACarroUseCase = new AsignarItemsACarroUseCase(
    unitOfWork,
    ventaExterna,
    ventaLogRepository,
    idGen,
);
export const moverItemsEntreCarrosUseCase = new MoverItemsEntreCarrosUseCase(unitOfWork, idGen);
export const quitarItemsDeCarroUseCase = new QuitarItemsDeCarroUseCase(unitOfWork, idGen);
export const vaciarCarroUseCase = new VaciarCarroUseCase(unitOfWork, idGen);
export const despacharVentaUseCase = new DespacharVentaUseCase(unitOfWork, idGen);

// --- casos de uso: movimientos (la bitacora) ---
export const listarMovimientosUseCase = new ListarMovimientosUseCase(
    movimientoRepository,
    userRepository,
);

// --- casos de uso: ventas ---
export const buscarVentaUseCase = new BuscarVentaUseCase(
    ventaExterna,
    ventaLogRepository,
    carroItemRepository,
    idGen,
);
export const obtenerDistribucionVentaUseCase = new ObtenerDistribucionVentaUseCase(
    carroItemRepository,
    ventaLogRepository,
);
export const listarVentasEnProcesoUseCase = new ListarVentasEnProcesoUseCase(
    carroItemRepository,
    ventaLogRepository,
);
