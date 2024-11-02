import { expect, use } from 'chai'
import { ModuleIM } from '../src/contracts/modules/moduleIM'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test MAST demo', () => {

    before(async () => {
        await ModuleIM.loadArtifact()
    })

    it('should pass full run successfully.', async () => {
        // TODO: Instantiate all desired modules.
        // TODO: Construct MAST from modules.

        // TODO: Deploy, starting with IM module.
        // TODO: Perform IM pledges for both parties.
        // TODO: Perform VM pledges for both parties.

    })

})
