import { ByteString, hash256, len, method, OpCode, PubKey, Sha256, slice, SmartContractLib, toByteString, int2ByteString } from "scrypt-ts"


export type ContractState = {
    mastRoot: Sha256      // Root of contracts MAST tree.

    party1: PubKey
    party2: PubKey
    party1IM: bigint
    party2IM: bigint
    party1VM: bigint
    party2VM: bigint
}

export class StateUtils extends SmartContractLib {

    @method()
    static hashContractState(contractState: ContractState): Sha256 {
        return hash256(
            contractState.mastRoot +

            contractState.party1 +
            contractState.party2 +
            int2ByteString(contractState.party1IM) +
            int2ByteString(contractState.party2IM) +
            int2ByteString(contractState.party1VM) +
            int2ByteString(contractState.party2VM)
        )
    }

    @method()
    static appendScriptWithState(
        script: ByteString,
        contractState: ContractState
    ): ByteString {
        return script +
            OpCode.OP_RETURN +
            toByteString('20') +
            StateUtils.hashContractState(contractState)
    }

    @method()
    static isValidState(
        contractState: ContractState,
        utxoScript: ByteString
    ): boolean {
        const utxoScriptLen = len(utxoScript)
        return slice(utxoScript, utxoScriptLen - 32n, utxoScriptLen) ==
            StateUtils.hashContractState(contractState)
    }

}