import { Address, beginCell, toNano } from '@ton/core';
import { FreeJettonMinter } from '../wrappers/FreeJettonMinter';
import { compile, NetworkProvider } from '@ton/blueprint';

type JettonMinterContent = {
    type: 0 | 1;
    uri: string;
};

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();
    const contentUrl = args.length > 0 ? args[0] : await ui.input('Jetton content URL');

    const jetton = provider.open(
        FreeJettonMinter.createFromConfig(
            {
                adminAddress: provider.sender().address as Address,
                content: jettonContentToCell({ type: 1, uri: contentUrl }),
                jettonWalletCode: await compile('JettonWallet'),
            },
            await compile('FreeJettonMinter'),
        ),
    );
    await jetton.sendDeploy(provider.sender(), toNano('0.1'));
    await provider.waitForDeploy(jetton.address);

    console.log('Deployed jetton address:', await jetton.address);
}

export function jettonContentToCell(content: JettonMinterContent) {
    return beginCell().storeUint(content.type, 8).storeStringTail(content.uri).endCell();
}
