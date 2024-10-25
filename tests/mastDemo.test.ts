import { expect, use } from 'chai'
import { MastDemo } from '../src/contracts/mastDemo'
import { getDefaultSigner } from './utils/txHelper'
import { MethodCallOptions } from 'scrypt-ts'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `MastDemo`', () => {
    before(async () => {
        await MastDemo.loadArtifact()
    })

    it('should pass the public method unit test successfully.', async () => {
        // Create an initial instance of the counter smart contract.
        const counter = new MastDemo(0n)
        await counter.connect(getDefaultSigner())

        // Deploy the instance.
        const deployTx = await counter.deploy(1)
        console.log(`Deployed contract "MastDemo": ${deployTx.id}`)

        let prevInstance = counter

        // Perform multiple contract calls:
        for (let i = 0; i < 3; i++) {
            // 1. Build a new contract instance.
            const newMastDemo = prevInstance.next()

            // 2. Apply updates on the new instance in accordance to the contracts requirements.
            newMastDemo.increment()

            // 3. Perform the contract call.
            const call = async () => {
                const callRes = await prevInstance.methods.incrementOnChain({
                    next: {
                        instance: newMastDemo,
                        balance: 1,
                    },
                } as MethodCallOptions<MastDemo>)
                
                console.log(`Called "incrementOnChain" method: ${callRes.tx.id}`)
            }
            await expect(call()).not.to.be.rejected

            // Set new instance as the current one.
            prevInstance = newMastDemo
        }
    })
})
