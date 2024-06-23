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

export async function deployJettonWithWalletFiva(
    blockchain: Blockchain,
    deployer: SandboxContract<TreasuryContract>,
    jettonMinterCode: Cell,
    jettonWalletCode: Cell,
    sendTokensToAddr: Address,
    jettonsAmount: bigint,
) {
    const randomSeed = Math.floor(Math.random() * 10000);
    const jettonMinter = blockchain.openContract(
        JettonMinter.createFromConfig(
            {
                adminAddress: deployer.address,
                content: beginCell().storeUint(randomSeed, 256).endCell(),
                jettonWalletCode: jettonWalletCode,
            },
            jettonMinterCode,
        ),
    );
    let result = await jettonMinter.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(result.transactions).toHaveTransaction({
        from: deployer.address,
        to: jettonMinter.address,
        deploy: true,
        success: true,
    });

    result = await jettonMinter.sendMint(deployer.getSender(), {
        toAddress: sendTokensToAddr,
        jettonAmount: jettonsAmount,
        amount: toNano('0.05'),
        queryId: Date.now(),
        value: toNano('0.2'),
    });
    expect(result.transactions).toHaveTransaction({
        from: deployer.address,
        to: jettonMinter.address,
        deploy: false,
        success: true,
    });

    const creator_wallet_addr = await jettonMinter.getWalletAddress(sendTokensToAddr);
    const walletJetton = blockchain.openContract(JettonWallet.createFromAddress(creator_wallet_addr));
    return {
        tstonMinter: jettonMinter,
        tstonWallet: walletJetton,
    };
}