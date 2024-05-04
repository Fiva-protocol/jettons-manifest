import { Address, toNano } from '@ton/core';
import { MasterOrder } from '../wrappers/MasterOrder';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();
    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Minter address'));
    const fromJettonAddr = Address.parse(args.length > 1 ? args[1] : await ui.input('From jetton address'));
    const fromJettonAmount = Address.parse(args.length > 2 ? args[2] : await ui.input('From jetton amount'));
    const toJettonAddr = Address.parse(args.length > 3 ? args[3] : await ui.input('To jetton address'));
    const toJettonAmount = Address.parse(args.length > 4 ? args[4] : await ui.input('To jetton amount'));

    const masterOrder = provider.open(MasterOrder.createFromAddress(address));
    const fromJetton = provider.open(JettonMinter.createFromAddress(fromJettonAddr));
    const toJetton = provider.open(JettonMinter.createFromAddress(toJettonAddr));

    const orderCreatorAddr = provider.sender().address as Address;
    const userOrderAddr = await masterOrder.getWalletAddress(orderCreatorAddr);
    const userOrderToJettonAddr = await toJetton.getWalletAddress(userOrderAddr);

    const result = await fromJetton.sendTransfer(creator.getSender(), {
        value: toNano('0.3'),
        toAddress: masterOrder.address,
        queryId: 1,
        jettonAmount: fromJettonAmount,
        fwdAmount: toNano('0.2'),
        fwdPayload: beginCell()
            .storeUint(0xc1c6ebf9, 32) // op code - create_order
            .storeUint(123, 64) // query id
            .storeAddress(userOrderToJettonAddr)
            .storeUint(toJettonAmount, 64)
            .endCell(),
    });

    ui.write('Order created successfully!');
}
