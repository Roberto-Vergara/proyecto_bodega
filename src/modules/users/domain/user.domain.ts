import { ValidationError } from "../../shared/domain/errors.js";
import { EmailVO } from "./value-objects/email.js";
import { NameVO } from "./value-objects/name.js";
import { PasswordVO } from "./value-objects/password.js";

export enum UserRole {
  ADMIN = "admin",
  EMPLOYEE = "employee", 
}

export enum Area {
  DESPACHO = "despacho",
  LOGISTICA = "logistica",
  GENERAL = "general",
}

export interface CreateUserProps {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  pass_hash: string;
  role: UserRole;
  area: Area;
}

export interface ReconstituteUserProps extends CreateUserProps {
  isActive?: boolean;
  // true mientras el usuario siga usando la clave que le pusieron al crearlo
  primeraPassword?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  private constructor(
    private readonly _id: string,
    private _nombre: NameVO,
    private _apellido: NameVO,
    private _email: EmailVO,
    private _passHash: PasswordVO,
    private _role: UserRole,
    private _area: Area,
    private _isActive: boolean,
    private _primeraPassword: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(props: CreateUserProps): User {
    if (!props.id || props.id.trim() === "") {
      throw new ValidationError("El ID del usuario es obligatorio.");
    }

    if (!props.pass_hash || props.pass_hash.trim() === "") {
      throw new ValidationError("La clave hasheada es obligatoria.");
    }

    const now = new Date();

    return new User(
      props.id,
      NameVO.create(props.nombre, "nombre"),
      NameVO.create(props.apellido, "apellido"), 
      EmailVO.create(props.email),
      PasswordVO.fromHash(props.pass_hash), 
      props.role, 
      props.area, 
      true, 
      // la clave se la puso otra persona: hay que obligarlo a cambiarla
      true,
      now,
      now
    );
  }

  static reconstitute(props: ReconstituteUserProps): User {
    return new User(
      props.id,
      NameVO.create(props.nombre, "nombre"),
      NameVO.create(props.apellido, "apellido"),
      EmailVO.create(props.email),
      PasswordVO.fromHash(props.pass_hash),
      props.role,
      props.area,
      props.isActive ?? true,
      props.primeraPassword ?? false,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date()
    );
  }

  cambiarNombre(nombre: string, apellido: string): void {
    this._nombre = NameVO.create(nombre, "nombre");
    this._apellido = NameVO.create(apellido, "apellido");
    this._updatedAt = new Date();
  }

  cambiarEmail(email: string): void {
    this._email = EmailVO.create(email);
    this._updatedAt = new Date();
  }

  desactivar(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  activar(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  /**
   * El propio usuario cambia su clave.
   *
   * Recibe el hash ya calculado: el dominio no sabe de bcrypt, eso es
   * infraestructura. La validacion de fortaleza la hace PasswordVO antes.
   */
  cambiarPassword(nuevoHash: string): void {
    this._passHash = PasswordVO.fromHash(nuevoHash);
    // ya no es la clave que le pusieron: deja de estar obligado a cambiarla
    this._primeraPassword = false;
    this._updatedAt = new Date();
  }

  /**
   * Un admin le resetea la clave a alguien que la olvido.
   *
   * A diferencia de cambiarPassword(), deja primeraPassword en true: el
   * usuario tiene que cambiarla en cuanto entre, porque el admin la conoce.
   */
  resetearPassword(nuevoHash: string): void {
    this._passHash = PasswordVO.fromHash(nuevoHash);
    this._primeraPassword = true;
    this._updatedAt = new Date();
  }

  get id(): string { return this._id; }
  get nombre(): string { return this._nombre.getValue(); }
  get apellido(): string { return this._apellido.getValue(); }
  get email(): string { return this._email.getValue(); }
  get passHash(): string { return this._passHash.getValue(); }
  get role(): UserRole { return this._role; }
  get area(): Area { return this._area; }
  get isActive(): boolean { return this._isActive; }
  get primeraPassword(): boolean { return this._primeraPassword; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
}