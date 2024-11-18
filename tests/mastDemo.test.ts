import { expect, use } from 'chai'
import { ModuleIM } from '../src/contracts/modules/moduleIM'
import { ModuleVM } from '../src/contracts/modules/moduleVM'
import chaiAsPromised from 'chai-as-promised'
import { MerkleTree, buildMerkleTree } from '../src/merkleTree'
import { bsv, ByteString, findSig, hash256, MethodCallOptions, PubKey, Sha256, toByteString } from 'scrypt-ts'
import { ContractState } from '../src/contracts/stateUtils'
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
        party2 = myPrivateKey

        await ModuleIM.loadArtifact(MODULE_IM_ARTIFACT)
        await ModuleVM.loadArtifact(MODULE_VM_ARTIFACT)
    })

    it('should pass full run successfully.', async () => {
        // Instantiate all desired modules.
        const instanceModuleIM = new ModuleIM()
        const instanceModuleVM = new ModuleVM()

        // Connect signer.
        const signer = getDefaultSigner()
        await instanceModuleIM.connect(signer)
        await instanceModuleVM.connect(signer)

        // Construct MAST.
        const moduleIMScript: ByteString = toByteString(instanceModuleIM.lockingScript.toHex())
        const moduleIMScriptHash: Sha256 = hash256(moduleIMScript)
        const moduleIMLeafHash: Sha256 = MAST.getLeafHash(ModuleIM.MODULE_ID, moduleIMScriptHash)

        const moduleVMScript: ByteString = toByteString(instanceModuleIM.lockingScript.toHex())
        const moduleVMScriptHash: Sha256 = hash256(moduleVMScript)
        const moduleVMLeafHash: Sha256 = MAST.getLeafHash(ModuleVM.MODULE_ID, moduleVMScriptHash)

        const mastLeaves: Sha256[] = [
            moduleIMLeafHash,
            moduleVMLeafHash
        ]
        const mast: MerkleTree = buildMerkleTree(mastLeaves)

        // Create initial contract state.
        const contractState: ContractState = {
            mastRoot: mast.getRoot(),
            party1: PubKey(party1.publicKey.toByteString()),
            party2: PubKey(party2.publicKey.toByteString()),
            party1IM: 0n,
            party2IM: 0n,
            party1VM: 0n,
            party2VM: 0n,
        }

        // Deploy, starting with IM module.
        const deployTx = await instanceModuleIM.deployModule(contractState)
        console.log('Deployment TXID:', deployTx.id)

        // Perform IM pledges for both parties.
        const party1IMPledge = 1000n
        const nextModuleInfo: ModuleInfo = {
            id: ModuleIM.MODULE_ID, 
            script: moduleIMScript,
            scriptHash: moduleIMScriptHash,
            merkleProof: mast.getPaddedMerkleProof(0)
        }


        // TODO: Custom method call tx builder! Generic one?
        //
        const callRes = await instanceModuleIM.methods.updateIM(
            PubKey(party1.publicKey.toByteString()),
            (sigResps) => findSig(sigResps, party1.publicKey),
            party1IMPledge,
            contractState,
            nextModuleInfo,
            {
                pubKeyOrAddrToSign: party1.publicKey
            } as MethodCallOptions<ContractModule>
        )

        console.log('Party 1 IM pledge:', callRes.tx.id)

        // TODO: Perform VM pledges for both parties.

    })

})
