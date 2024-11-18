import { assert, ByteString, hash256, method, prop, Sha256, SmartContractLib, toByteString, Utils } from "scrypt-ts";
import { MerklePath, MerkleProof } from "./merklePath";
import { ContractState, StateUtils } from "./stateUtils";

export type ModuleInfo = {
    id: ByteString
    script: ByteString
    scriptHash: Sha256
    merkleProof: MerkleProof
}

export class MAST extends SmartContractLib {

    @prop()
    static readonly TERMINATION_ID: ByteString = toByteString('TERMINATE', true)

    @method()
    static updateContract(
        nextModule: ModuleInfo,
        currentState: ContractState,
        updatedState: ContractState,
        utxoScript: ByteString,
        changeOutput: ByteString,
        hashOutputs: ByteString
    ): boolean {
        // Check passed state is valid.
        assert(
            StateUtils.isValidState(currentState, utxoScript),
            'Invalid state passed'
        )

        let contractOutput = toByteString('')
        if (nextModule.id != MAST.TERMINATION_ID) {
            // Check the next module is valid 
            // and is actually part of the MAST.
            assert(
                MAST.isValidModule(nextModule, currentState.mastRoot),
                'Invalid next module'
            )

            contractOutput = Utils.buildOutput(
                StateUtils.appendScriptWithState(nextModule.script, updatedState),
                1n
            )
        }

        const outputs: ByteString = contractOutput + changeOutput
        assert(hashOutputs == hash256(outputs), 'hashOutputs mismatch')

        return true
    }

    @method()
    static isValidModule(module: ModuleInfo, mastRoot: Sha256): boolean {
        const scriptHash = hash256(module.script)
        const leafHash = MAST.getLeafHash(module.id, scriptHash)
        return scriptHash == module.scriptHash &&
            MerklePath.calcMerkleRoot(leafHash, module.merkleProof) == mastRoot
    }

    @method()
    static getLeafHash(moduleId: ByteString, scriptHash: Sha256): Sha256 {
        return hash256(hash256(moduleId) + scriptHash)
    }

}