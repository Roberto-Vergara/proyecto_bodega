import type { IEncrypt } from "../domain/encrypt.port.js";
import bcrypt from "bcrypt";


export class BcryptEncrypt implements IEncrypt{
    hash(plainText: string): Promise<string> {
        return bcrypt.hash(plainText,10)
    }

    compare(plainText: string, hashedText: string): Promise<boolean> {
        return bcrypt.compare(plainText,hashedText);
    }
}