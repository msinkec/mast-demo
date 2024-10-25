import { assert, ByteString, hash256, len, method, OpCode, Sha256, slice, SmartContractLib, toByteString } from "scrypt-ts"


export type ContractState = {
    mastRoot: Sha256              // Root of contracts MAST tree.
    nextModuleScriptHash: Sha256  // Script hash (i.e. MAST tree leaf) of next module.

    someStateVar: ByteString
}

export class StateUtils extends SmartContractLib {

    @method()
    static hashContractState(state: ContractState): Sha256 {
        return hash256(
            state.mastRoot +
            state.nextModuleScriptHash +
            state.someStateVar
        )
    }

    @method()
    static appendScriptWithState(script: ByteString, state: ContractState): ByteString {
        return script + OpCode.OP_RETURN + toByteString('20') + StateUtils.hashContractState(state)
    }

    @method()
    static isValidState(state: ContractState, utxoScript: ByteString): boolean {
        const utxoScriptLen = len(utxoScript)
        return slice(utxoScript, utxoScriptLen - 32n, utxoScriptLen) == StateUtils.hashContractState(state)
    }

}