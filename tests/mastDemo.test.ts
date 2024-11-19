import { expect, use } from 'chai'
import { ModuleIM } from '../src/contracts/modules/moduleIM'
import { ModuleVM } from '../src/contracts/modules/moduleVM'
import chaiAsPromised from 'chai-as-promised'
import { MerkleTree, buildMerkleTree } from '../src/merkleTree'
import { bsv, ByteString, findSig, hash256, MethodCallOptions, PubKey, Sha256, StatefulNext, toByteString } from 'scrypt-ts'
import { ContractState, StateUtils } from '../src/contracts/stateUtils'
import { myPrivateKey } from './utils/privateKey'
use(chaiAsPromised)

import MODULE_IM_ARTIFACT from '../artifacts/modules/moduleIM.json'
import MODULE_VM_ARTIFACT from '../artifacts/modules/moduleVM.json'
import { getDefaultSigner } from './utils/txHelper'
import { ContractModule } from '../src/contracts/abstract/contractModule'
import { MAST, ModuleInfo } from '../src/contracts/mast'

describe('Test MAST demo', () => {
    let party1, party2: bsv.PrivateKey

    before(async () => {
        party1 = myPrivateKey
        party2 = bsv.PrivateKey.fromRandom(bsv.Networks.testnet)

        await ModuleIM.loadArtifact(MODULE_IM_ARTIFACT)
        await ModuleVM.loadArtifact(MODULE_VM_ARTIFACT)
    })

    it('should pass full run successfully.', async () => {
        // Instantiate all desired modules.
        let instanceModuleIM = new ModuleIM()
        let instanceModuleVM = new ModuleVM()

        // Connect signer.
        const signer = getDefaultSigner([party1, party2])
        await instanceModuleIM.connect(signer)
        await instanceModuleVM.connect(signer)

        // Construct MAST.
        const moduleIMScript: ByteString = toByteString(instanceModuleIM.lockingScript.toHex())
        const moduleIMScriptHash: Sha256 = hash256(moduleIMScript)
        const moduleIMLeafHash: Sha256 = MAST.getLeafHash(ModuleIM.MODULE_ID, moduleIMScriptHash)

        const moduleVMScript: ByteString = toByteString(instanceModuleVM.lockingScript.toHex())
        const moduleVMScriptHash: Sha256 = hash256(moduleVMScript)
        const moduleVMLeafHash: Sha256 = MAST.getLeafHash(ModuleVM.MODULE_ID, moduleVMScriptHash)

        const mastLeaves: Sha256[] = [
            moduleIMLeafHash,
            moduleVMLeafHash
        ]
        const mast: MerkleTree = buildMerkleTree(mastLeaves)

        // Deploy, starting with IM module.
        const state0: ContractState = {
            mastRoot: mast.getRoot(),
            party1: PubKey(party1.publicKey.toByteString()),
            party2: PubKey(party2.publicKey.toByteString()),
            party1IM: 0n,
            party2IM: 0n,
            party1VM: 0n,
            party2VM: 0n
        }
        instanceModuleIM.updateStateHash(
            StateUtils.hashContractState(state0)
        )
        const deployTx = await instanceModuleIM.deployModule()
        console.log('Deployment TXID:', deployTx.id)

        // Perform IM pledges for both parties.
        let nextModuleInfo: ModuleInfo = {
            id: ModuleIM.MODULE_ID,
            script: moduleIMScript,
            scriptHash: moduleIMScriptHash,
            merkleProof: mast.getPaddedMerkleProof(0)
        }

        const party1IMPledge = 1000n
        const state1: ContractState = {
            mastRoot: mast.getRoot(),
            party1: PubKey(party1.publicKey.toByteString()),
            party2: PubKey(party2.publicKey.toByteString()),
            party1IM: party1IMPledge,
            party2IM: 0n,
            party1VM: 0n,
            party2VM: 0n
        }

        let next: ContractModule = instanceModuleIM.next()
        next.updateStateHash(
            StateUtils.hashContractState(state1)
        )

        let callRes = await instanceModuleIM.methods.updateIM(
            PubKey(party1.publicKey.toByteString()),
            (sigResps) => findSig(sigResps, party1.publicKey),
            party1IMPledge,
            state0,
            nextModuleInfo,
            {
                pubKeyOrAddrToSign: party1.publicKey,
                next: {
                    instance: next,
                    balance: 1,
                    atOutputIndex: 0
                } as StatefulNext<ContractModule>
            } as MethodCallOptions<ContractModule>
        )
        instanceModuleIM = next as ModuleIM

        console.log('Party 1 IM pledge:', callRes.tx.id)

        nextModuleInfo = {
            id: ModuleVM.MODULE_ID,
            script: moduleVMScript,
            scriptHash: moduleVMScriptHash,
            merkleProof: mast.getPaddedMerkleProof(1)
        } as ModuleInfo

        const party2IMPledge = 123000n
        const state2: ContractState = {
            mastRoot: mast.getRoot(),
            party1: PubKey(party1.publicKey.toByteString()),
            party2: PubKey(party2.publicKey.toByteString()),
            party1IM: party1IMPledge,
            party2IM: party2IMPledge,
            party1VM: 0n,
            party2VM: 0n
        }

        next = instanceModuleVM.next()
        next.updateStateHash(
            StateUtils.hashContractState(state2)
        )
        
        callRes = await instanceModuleIM.methods.updateIM(
            PubKey(party2.publicKey.toByteString()),
            (sigResps) => findSig(sigResps, party2.publicKey),
            party2IMPledge,
            state1,
            nextModuleInfo,
            {
                pubKeyOrAddrToSign: party2.publicKey,
                next: {
                    instance: next,
                    balance: 1,
                    atOutputIndex: 0
                } as StatefulNext<ContractModule>
            } as MethodCallOptions<ContractModule>
        )
        instanceModuleVM = next as ModuleVM

        console.log('Party 2 IM pledge:', callRes.tx.id)
        
        // Perform VM pledges for both parties.
        const party1VMPledge = 60000n
        const state3: ContractState = {
            mastRoot: mast.getRoot(),
            party1: PubKey(party1.publicKey.toByteString()),
            party2: PubKey(party2.publicKey.toByteString()),
            party1IM: party1IMPledge,
            party2IM: party2IMPledge,
            party1VM: party1VMPledge,
            party2VM: 0n
        }

        next = instanceModuleVM.next()
        next.updateStateHash(
            StateUtils.hashContractState(state3)
        )
        
        callRes = await instanceModuleVM.methods.updateVM(
            PubKey(party1.publicKey.toByteString()),
            (sigResps) => findSig(sigResps, party1.publicKey),
            party1VMPledge,
            state2,
            nextModuleInfo,
            {
                pubKeyOrAddrToSign: party1.publicKey,
                next: {
                    instance: next,
                    balance: 1,
                    atOutputIndex: 0
                } as StatefulNext<ContractModule>
            } as MethodCallOptions<ContractModule>
        )
        instanceModuleVM = next as ModuleVM

        console.log('Party 1 VM pledge:', callRes.tx.id)
        
        nextModuleInfo = {
            id: MAST.TERMINATION_ID,
            script: toByteString(''),
            scriptHash: toByteString(''),
            merkleProof: mast.getPaddedMerkleProof(1) // TODO: Make each element of the tree a null bytes to save some tx size...
        } as ModuleInfo

        const party2VMPledge = 37218n
        const state4: ContractState = {
            mastRoot: mast.getRoot(),
            party1: PubKey(party1.publicKey.toByteString()),
            party2: PubKey(party2.publicKey.toByteString()),
            party1IM: party1IMPledge,
            party2IM: party2IMPledge,
            party1VM: party1VMPledge,
            party2VM: party2VMPledge
        }

        callRes = await instanceModuleVM.methods.updateVM(
            PubKey(party2.publicKey.toByteString()),
            (sigResps) => findSig(sigResps, party2.publicKey),
            party2VMPledge,
            state3,
            nextModuleInfo,
            {
                pubKeyOrAddrToSign: party2.publicKey,
                finalStateHash: StateUtils.hashContractState(state4)
            } as MethodCallOptions<ContractModule>
        )

        console.log('Party 2 VM pledge:', callRes.tx.id)
    })

})
