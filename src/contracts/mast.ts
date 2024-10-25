import { ByteString, method, Sha256, SmartContractLib } from "scrypt-ts";
import { MerklePath, MerkleProof } from "./merklePath";

export type Module = {
    scriptHash: Sha256
    merkleProof: MerkleProof
}

export class MAST extends SmartContractLib {

    @method()
    static isValidModule(module: Module, mastRoot: Sha256): boolean {
        return MerklePath.calcMerkleRoot(module.scriptHash, module.merkleProof) == mastRoot
    }


}