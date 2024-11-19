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
import { ModuleVM } from './moduleVM'

export class ModuleIM extends ContractModule {
    
    @prop()
    static readonly MODULE_ID: ByteString = toByteString('ModuleIM', true)

    @method()
    public updateIM(
        partyPubKey: PubKey,
        partySig: Sig,
        pledgedIM: bigint,
        currentState: ContractState,
        nextModule: ModuleInfo
    ) {
        let updatedState: ContractState = StateUtils.cloneState(currentState)

        assert(
            partyPubKey == updatedState.party1 || partyPubKey == updatedState.party2,
            'Unknown public key'
        )
        assert(this.checkSig(partySig, partyPubKey))

        assert(pledgedIM > 0n, 'Pledged amount too low')

        if (partyPubKey == updatedState.party1) {
            updatedState.party1IM += pledgedIM
        } else {
            updatedState.party2IM += pledgedIM
        }

        if (updatedState.party1IM > 0n && updatedState.party2IM > 0n) {
            assert(
                //nextModule.id == ModuleVM.MODULE_ID,
                nextModule.id == toByteString('ModuleVM', true),
                'Next module must be ModuleVM'
            )
        } else {
            assert(
                nextModule.id == ModuleIM.MODULE_ID,
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
