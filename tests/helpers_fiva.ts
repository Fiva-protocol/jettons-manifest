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
    const jettonMinterYT = blockchain.openContract(
        JettonMinter.createFromConfig(
            {
                adminAddress: masterSYS.address,
                content: beginCell().storeUint(randomSeed, 256).endCell(),
                jettonWalletCode: jettonWalletCode,
            },
            jettonMinterCode,
        ),
    );
    let result_jetton = await jettonMinterYT.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(result_jetton.transactions).toHaveTransaction({
        from: deployer.address,
        to: jettonMinterYT.address,
        deploy: true,
        success: true,
    });

    //deploy pt token

    const randomSeedpt = Math.floor(Math.random() * 2000);
    const jettonMinterPT = blockchain.openContract(
        JettonMinter.createFromConfig(
            {
                adminAddress: masterSYS.address,
                content: beginCell().storeUint(randomSeedpt, 256).endCell(),
                jettonWalletCode: jettonWalletCode,
            },
            jettonMinterCode,
        ),
    );
    let result_jetton_pt = await jettonMinterPT.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(result_jetton_pt.transactions).toHaveTransaction({
        from: deployer.address,
        to: jettonMinterPT.address,
        deploy: true,
        success: true,
    });

    return {
        masterSYS: masterSYS,
        jettonMinterYT: jettonMinterYT,
        jettonMinterPT: jettonMinterPT,
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

    expect(await jettonMinter.getTotalsupply()).toEqual(jettonsAmount);

    const creator_wallet_addr = await jettonMinter.getWalletAddress(sendTokensToAddr);
    const walletJetton = blockchain.openContract(JettonWallet.createFromAddress(creator_wallet_addr));
    return {
        tstonMinter: jettonMinter,
        tstonWallet: walletJetton,
    };
}

export async function mintTokens (
    creator: SandboxContract<TreasuryContract>,
    masterSYS: SandboxContract<MasterSYS>,
    UserTstonWallet: SandboxContract<JettonWallet>,
    jettonAmount: bigint,
    queryId: number,
    YTAddress:Address,
    PTAddress:Address,
    toAddress:Address,

) {

    const result = await UserTstonWallet.sendTransfer(creator.getSender(), {
        value: toNano('0.3'),
        toAddress: masterSYS.address,
        queryId: 1,
        jettonAmount: jettonAmount,
        fwdAmount: toNano('0.2'),
        fwdPayload: beginCell()
            .storeUint(0xc1c6ebf9, 32) // op code - create_order
            .storeUint(111, 64) // query id
            .storeAddress(YTAddress)
            .storeAddress(PTAddress)
            .storeAddress(toAddress)
            .storeCoins(toNano('0.2'))
            .storeCoins(jettonAmount)
            .endCell(),
    });

    return result;
}