import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, beginCell, toNano } from '@ton/core';
import '@ton/test-utils';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { OrderType, UserOrder } from '../wrappers/UserOrder';
import { MasterSYS } from '../wrappers/MasterSYS';


export async function setupMasterSYS(
    blockchain: Blockchain,
    deployer: SandboxContract<TreasuryContract>,
    masterSYSCode: Cell,
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

    return masterSYS;
}

// export async function changeIndex(
//     creator: SandboxContract<TreasuryContract>,
//     masterSYS: SandboxContract<MasterSYS>,
//     fromJettonWallet: SandboxContract<JettonWallet>,
//     fromAmount: bigint,
// ) {

//     const result = await fromJettonWallet.sendTransfer(creator.getSender(), {
//         value: toNano('0.3'),
//         toAddress: masterOrder.address,
//         queryId: 1,
//         jettonAmount: fromAmount,
//         fwdAmount: toNano('0.2'),
//         fwdPayload: beginCell()
//             .storeUint(10, 32) // op code - create_order
//             .storeUint(111, 64) // query id
//             .storeUint(OrderType.JETTON_JETTON, 8)
//             .storeAddress(user_order_jetton_address)
//             .storeCoins(toAmount)
//             .storeAddress(toJettonMinter.address)
//             .endCell(),
//     });

//     return result;
// }