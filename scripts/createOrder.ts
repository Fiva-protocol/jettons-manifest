import { Address, beginCell, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import dotenv from 'dotenv';
import { MasterOrder } from '../wrappers/MasterOrder';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { UserOrder } from '../wrappers/UserOrder';

dotenv.config();

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();
    const masterOrder = provider.open(
        MasterOrder.createFromAddress(Address.parse(process.env.MASTER_ORDER_ADDRESS as string)),
    );
    const j1addr = Address.parse(process.env.JETTON1_CREATOR_WALLET!);
    const j2addr = Address.parse(process.env.JETTON2!);
    const userJetton1 = provider.open(JettonWallet.createFromAddress(j1addr));
    const userJetton2 = provider.open(JettonMinter.createFromAddress(j2addr));

    const orderCreatorAddr = provider.sender().address as Address;
    const userOrderAddr = await masterOrder.getWalletAddress(orderCreatorAddr);
    const userOrderJettonAddr2 = await userJetton2.getWalletAddress(userOrderAddr);

    await userJetton1.sendTransfer(provider.sender(), {
        value: toNano('0.3'),
        toAddress: masterOrder.address,
        queryId: 1,
        jettonAmount: toNano('10'),
        fwdAmount: toNano('0.2'),
        fwdPayload: beginCell()
            .storeUint(0xc1c6ebf9, 32) // op code - create_order
            .storeUint(123, 64) // query id
            .storeUint(0, 8)
            .storeAddress(userOrderJettonAddr2)
            .storeUint(toNano('20'), 64)
            .endCell(),
    });

    ui.write('Order created successfully!.');
    ui.write(`Order address: ${userOrderAddr}`);

    const userOrderContract = provider.open(UserOrder.createFromAddress(userOrderAddr));
    const orders = await userOrderContract.getOrders();

    ui.write(`Available orders: ${orders.keys()}`);
}
