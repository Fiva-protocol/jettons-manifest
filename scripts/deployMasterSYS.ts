import { Address, toNano } from '@ton/core';
import { MasterSYS } from '../wrappers/MasterSYS';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const masterSYS = provider.open(
        MasterSYS.createFromConfig(
            {
                    admin: provider.sender().address as Address,
                    tston_total_balance: 0n,
                    yt_total_balance: 0n,
                    pt_total_balance: 0n,
                    maturity: 365n,
                    pool_value_in_ton: 0n,
                    index_tston_ton: 1000,

            },
            await compile('MasterSYS'),
        ),
    );
    await masterSYS.sendDeploy(provider.sender(), toNano('0.1'));

    await provider.waitForDeploy(masterSYS.address);

    // console.log('ID', await masterSYS.getIndex());
}
