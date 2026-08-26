import type { IIdGenPort } from "../domain/idGen.port.js";
import {v4 as uuidv4} from "uuid";


export class UuidAdapter implements IIdGenPort{
    generate(): string {
        return uuidv4();
    }
}