import { bsv, ByteString, ContractTransaction, MethodCallOptions, MethodCallTxBuilder, Sha256, SmartContract, StatefulNext } from 'scrypt-ts'
import { ContractState, StateUtils } from '../stateUtils'


export abstract class ContractModule extends SmartContract {

    constructor() {
        super(...arguments)
    }

    updateStateHash(stateHash: Sha256) {
        this.setDataPartInASM(stateHash)
    }

    async deployModule(): Promise<bsv.Transaction> {
        if (this.dataPart == undefined) {
            throw Error('Contract state hash must be set before deployment. Use the "updateStateHash" method.')
        }

        const tx = await this.deploy(1)
        return tx
    }

    protected override getDefaultTxBuilder<T extends SmartContract>(
        methodName: string
    ): MethodCallTxBuilder<T> {
        return async function (
            current: ContractModule,
            options: MethodCallOptions<ContractModule>,
            ...args: any[]
        ): Promise<ContractTransaction> {
            let next
            if (options.next instanceof Array) {
                next = undefined
            } else {
                next = options.next as StatefulNext<ContractModule>
            }

            const tx = new bsv.Transaction()
            tx.addInput(current.buildContractInput())

            if (!next) {
                if (options['finalStateHash'] == undefined) {
                    throw new Error('Need to set options.finalStateHash when terminating.')
                }
                tx.addOutput(
                    new bsv.Transaction.Output({
                        script: bsv.Script.fromASM(`OP_RETURN ${options['finalStateHash']}`),
                        satoshis: 0
                    })
                )
            } else {
                tx.addOutput(
                    new bsv.Transaction.Output({
                        script: next.instance.lockingScript,
                        satoshis: next.balance
                    })
                )
            }

            const defaultChangeAddr = await current.signer.getDefaultAddress()
            tx.change(options.changeAddress || defaultChangeAddr)

            return Promise.resolve({
                tx,
                atInputIndex: 0,
                nexts: next ? [next] : [],
            })
        } as unknown as MethodCallTxBuilder<T>
    }

}