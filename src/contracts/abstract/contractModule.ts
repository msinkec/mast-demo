import { bsv, ByteString, Sha256, SmartContract } from 'scrypt-ts'
import { ContractState, StateUtils } from '../stateUtils'


export abstract class ContractModule extends SmartContract {

    constructor() {
        super(...arguments)
    }

    async deployModule(state: ContractState): Promise<bsv.Transaction> {
        const stateHash = StateUtils.hashContractState(state)
        this.appendContractStateHash(stateHash)

        const tx = await this.deploy(1)
        return tx
    }

    appendContractStateHash(stateHash: Sha256) {
        this.setDataPartInASM(stateHash)
    }

    getContractStateHash(): ByteString {
        return this.dataPart.toHex()
    }

}