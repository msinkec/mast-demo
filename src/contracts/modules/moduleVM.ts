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

export class ModuleVM extends SmartContract {

    @method()
    public updateVM(
        partyPubKey: PubKey,
        partySig: Sig,
        pledgedVM: bigint,
        currentState: ContractState,
        nextModule: Module
    ) {
        let updatedState: ContractState = currentState

        assert(
            partyPubKey == updatedState.party1 || partyPubKey == updatedState.party2,
            'Unknown public key'
        )
        assert(this.checkSig(partySig, partyPubKey))

        assert(pledgedVM > 0n, 'Pledged amount too low')

        if (partyPubKey == updatedState.party1) {
            updatedState.party1IM = pledgedVM
        } else {
            updatedState.party2IM = pledgedVM
        }

        if (updatedState.party1VM > 0n && updatedState.party2VM > 0n) {
            assert(
                nextModule.id == MAST.TERMINATION_ID,
                'Contract must terminate in next step.'
            )
        } else {
            assert(
                nextModule.id == toByteString('ModuleVM', true),
                'Next module must be ModuleVM'
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
