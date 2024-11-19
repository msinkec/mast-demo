import {
    method,
    assert,
    PubKey,
    toByteString,
    Sig,
    ByteString,
    prop,
} from 'scrypt-ts'
import { ContractState, StateUtils } from '../stateUtils'
import { MAST, ModuleInfo } from '../mast'
import { ContractModule } from '../abstract/contractModule'

export class ModuleVM extends ContractModule {
    
    @prop()
    static readonly MODULE_ID: ByteString = toByteString('ModuleVM', true)

    @method()
    public updateVM(
        partyPubKey: PubKey,
        partySig: Sig,
        pledgedVM: bigint,
        currentState: ContractState,
        nextModule: ModuleInfo
    ) {
        let updatedState: ContractState = StateUtils.cloneState(currentState)

        assert(
            partyPubKey == updatedState.party1 || partyPubKey == updatedState.party2,
            'Unknown public key'
        )
        assert(this.checkSig(partySig, partyPubKey))

        assert(pledgedVM > 0n, 'Pledged amount too low')

        if (partyPubKey == updatedState.party1) {
            updatedState.party1VM = pledgedVM
        } else {
            updatedState.party2VM = pledgedVM
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
