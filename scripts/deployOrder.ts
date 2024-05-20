import { Address, toNano } from '@ton/core';
import { MasterOrder } from '../wrappers/MasterOrder';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const masterOrder = provider.open(
        MasterOrder.createFromConfig(
            {
                admin: provider.sender().address as Address,
                userOrderCode: await compile('UserOrder'),
            },
            await compile('MasterOrder'),
        ),
    );
    await masterOrder.sendDeploy(provider.sender(), toNano('0.1'));

    await provider.waitForDeploy(masterOrder.address);

    console.log('ID', await masterOrder.getStatus());
}
