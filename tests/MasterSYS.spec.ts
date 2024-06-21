import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { MasterOrder } from '../wrappers/MasterOrder';
import { OrderType, UserOrder } from '../wrappers/UserOrder';
import { ContractProvider } from '@ton/core';

import {
    assertJettonBalanceEqual,
    createJettonOrderPosition,
    deployJettonWithWallet,
    setupMasterOrder,
} from './helpers';
import { setupMasterSYSAndYTJetton, assertJettonBalanceEqualFiva } from './helpers_fiva';
import { MasterSYS } from '../wrappers/MasterSYS';
import exp from 'constants';

describe('MasterSYS', () => {
    let masterSYSCode: Cell;
    let jettonMinterCode: Cell;
    let jettonWalletCode: Cell;


    beforeAll(async () => {
        masterSYSCode = await compile('MasterSYS');
        jettonMinterCode = await compile('JettonMinter');
        jettonWalletCode = await compile('JettonWallet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let sender: SandboxContract<TreasuryContract>;
    let masterSYS: SandboxContract<MasterSYS>;
    let jettonMinter: SandboxContract<JettonMinter>;
    let provider:ContractProvider;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        sender = await blockchain.treasury('sender');

        ({masterSYS, jettonMinter} = await setupMasterSYSAndYTJetton(blockchain, deployer, masterSYSCode,jettonMinterCode,jettonWalletCode));

    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
    });

    it('change the Index values', async () => {
        // const user_order_address = await masterOrder.getWalletAddress(creator.address);
        // const user_order_jetton2_address = await jetton2.jettonMinter.getWalletAddress(user_order_address);

        const result = await masterSYS.sendChangeIndex(sender.getSender(), {
            value: toNano('0.2'),
            queryId: 123,
            newIndex: 1300,
        })

        // User -> Master SYS 
        expect(result.transactions).toHaveTransaction({
            from: sender.address,
            to: masterSYS.address,
            deploy: false,
            success: true,
        })

        const newIndex = await masterSYS.getIndex();
        expect(newIndex).toEqual(1300);
        
    });

    it('mint YT tokens', async () => {
       
        const result = await masterSYS.sendMintReq(sender.getSender() , {
            YTAddress: jettonMinter.address,
            toAddress: sender.address,
            jettonAmount: 1000n,
            amount: toNano('0.2'),
            queryId: Date.now(),
            value: toNano('0.2'),
        });
        // User -> Master
        expect(result.transactions).toHaveTransaction({
            from: sender.address,
            to: masterSYS.address,
            deploy: false,
            success: true,
        });
        // Master -> Jetton Minter
        expect(result.transactions).toHaveTransaction({
            from: masterSYS.address,
            to: jettonMinter.address,
            deploy: false,
            success: true,
        });

        // Jetton Minter -> User wallet
        const sendTokensToAddr = await jettonMinter.getWalletAddress(sender.address);
        expect(result.transactions).toHaveTransaction({
            from: jettonMinter.address,
            to: sendTokensToAddr,
            deploy: true,
            success: true,
        });

        await assertJettonBalanceEqual(blockchain, sendTokensToAddr, 1000n);
    });
});