import {
    method,
    prop,
    SmartContract,
    hash256,
    assert,
    ByteString,
    PubKey,
    Utils,
    toByteString,
} from 'scrypt-ts'
import { ContractState, StateUtils } from './stateUtils'
import { MAST, Module } from './mast'

export class MastContract extends SmartContract {

    @prop()
    operator: PubKey

    /**
     * @param operator - Public key of contract operator.
     */
    constructor(
        operator: PubKey
    ) {
        super(...arguments)
        this.operator = operator
    }

    @method()
    public main(
        state: ContractState,
        moduleScript: ByteString,
        nextModule: Module
    ) {
        // Check passed state is valid.
        assert(
            StateUtils.isValidState(state, this.ctx.utxo.script),
            'Invalid state passed'
        )

        // Check passed module script is correct and matches the one chosen in the prev tx.
        assert(hash256(moduleScript) == state.nextModuleScriptHash, 'Invalid module script passed')

        // Check the next module is actually part of the MAST tree.
        assert(
            MAST.isValidModule(nextModule, state.mastRoot),
            'Invalid next module'
        )

        // Update the state with the next chosen modules script hash.
        state.nextModuleScriptHash = nextModule.scriptHash

        ///////

        // Update state.
        state.someStateVar = toByteString('hello world!', true)

        ///////

        const outContract = Utils.buildOutput(
            StateUtils.appendScriptWithState(moduleScript, state),
            this.ctx.utxo.value
        )
        const outputs: ByteString = outContract + this.buildChangeOutput()
        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }

}
