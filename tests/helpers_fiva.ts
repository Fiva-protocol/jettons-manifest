import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, beginCell, toNano } from '@ton/core';
import '@ton/test-utils';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { OrderType, UserOrder } from '../wrappers/UserOrder';
import { MasterSYS } from '../wrappers/MasterSYS';


export async function setupMasterSYSAndYTJetton(
    blockchain: Blockchain,
    deployer: SandboxContract<TreasuryContract>,
    masterSYSCode: Cell,
    jettonMinterCode: Cell,
    jettonWalletCode: Cell,
) {
    const masterSYS = blockchain.openContract(
        MasterSYS.createFromConfig(
            {
                admin: deployer.address,
                tston_total_balance: 0n,
                yt_total_balance: 0n,
                pt_total_balance: 0n,
                maturity: 365n,
                pool_value_in_ton: 0n,
                index_tston_ton: 1000,
            },
            masterSYSCode,
        ),
    );
    let result = await masterSYS.sendDeploy(deployer.getSender(), toNano('0.5'));
    expect(result.transactions).toHaveTransaction({
        from: deployer.address,
        to: masterSYS.address,
        deploy: true,
        success: true,
    });

    const randomSeed = Math.floor(Math.random() * 10000);
    const jettonMinter = blockchain.openContract(
        JettonMinter.createFromConfig(
            {
                adminAddress: masterSYS.address,
                content: beginCell().storeUint(randomSeed, 256).endCell(),
                jettonWalletCode: jettonWalletCode,
            },
            jettonMinterCode,
        ),
    );
    let result_jetton = await jettonMinter.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(result_jetton.transactions).toHaveTransaction({
        from: deployer.address,
        to: jettonMinter.address,
        deploy: true,
        success: true,
    });

    return {
        masterSYS: masterSYS,
        jettonMinter: jettonMinter,
     };

     
}

export async function assertJettonBalanceEqualFiva(blockchain: Blockchain, jettonAddress: Address, equalTo: bigint) {
    const jettonWallet = blockchain.openContract(JettonWallet.createFromAddress(jettonAddress));
    expect(await jettonWallet.getJettonBalance()).toEqual(equalTo);
}

// export async function createJettonOrderPosition(
//     sender: SandboxContract<TreasuryContract>,
//     masterOrder: SandboxContract<MasterOrder>,
//     fromJettonWallet: SandboxContract<JettonWallet>,
//     fromAmount: bigint,
//     YTJetton: SandboxContract<JettonMinter>,
//     toAmount: bigint,
// ) {
//     // const user_order_address = await masterOrder.getWalletAddress(creator.address);
//     const sender_yt_jetton_address = await YTJetton.getWalletAddress(sender.address);

//     const result = await fromJettonWallet.sendTransfer(creator.getSender(), {
//         value: toNano('0.3'),
//         toAddress: masterOrder.address,
//         queryId: 1,
//         jettonAmount: fromAmount,
//         fwdAmount: toNano('0.2'),
//         fwdPayload: beginCell()
//             .storeUint(0xc1c6ebf9, 32) // op code - create_order
//             .storeUint(111, 64) // query id
//             .storeUint(OrderType.JETTON_JETTON, 8)
//             .storeAddress(user_order_jetton_address)
//             .storeCoins(toAmount)
//             .storeAddress(toJettonMinter.address)
//             .endCell(),
//     });

//     return result;
// }