import {
    method,
    SmartContract,
    assert,
    PubKey,
    toByteString,
    Sig,
} from 'scrypt-ts'
import { ContractState } from '../stateUtils'
import { MAST, Module } from '../mast'

export class ModuleIM extends SmartContract {

    @method()
    public updateIM(
        partyPubKey: PubKey,
        partySig: Sig,
        pledgedIM: bigint,
        currentState: ContractState,
        nextModule: Module
    ) {
        let updatedState: ContractState = currentState

        assert(
            partyPubKey == updatedState.party1 || partyPubKey == updatedState.party2,
            'Unknown public key'
        )
        assert(this.checkSig(partySig, partyPubKey))

        assert(pledgedIM > 0n, 'Pledged amount too low')

        if (partyPubKey == updatedState.party1) {
            updatedState.party1IM = pledgedIM
        } else {
            updatedState.party2IM = pledgedIM
        }

        if (updatedState.party1IM > 0n && updatedState.party2IM > 0n) {
            assert(
                nextModule.id == toByteString('ModuleVM', true),
                'Next module must be ModuleVM'
            )
        } else {
            assert(
                nextModule.id == toByteString('ModuleIM', true),
                'Next module must be ModuleIM'
            )
        }

        assert(
            MAST.updateContract(
                nextModule,
                currentState,
                updatedState,
                this.ctx.utxo.script,
                this.buildChangeOutput(),
                this.ctx.hashOutputs
            )
        )
    }

}
