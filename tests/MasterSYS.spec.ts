import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { MasterOrder } from '../wrappers/MasterOrder';
import { OrderType, UserOrder } from '../wrappers/UserOrder';
import {
    assertJettonBalanceEqual,
    createJettonOrderPosition,
    deployJettonWithWallet,
    setupMasterOrder,
} from './helpers';
import { setupMasterSYS } from './helpers_fiva';
import { MasterSYS } from '../wrappers/MasterSYS';
import exp from 'constants';

describe('MasterSYS', () => {
    let masterSYSCode: Cell;


    beforeAll(async () => {
        masterSYSCode = await compile('MasterSYS');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let creator: SandboxContract<TreasuryContract>;
    let masterSYS: SandboxContract<MasterSYS>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        creator = await blockchain.treasury('creator');

        masterSYS = await setupMasterSYS(blockchain, deployer, masterSYSCode);


    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
    });

    it('change the Index values', async () => {
        // const user_order_address = await masterOrder.getWalletAddress(creator.address);
        // const user_order_jetton2_address = await jetton2.jettonMinter.getWalletAddress(user_order_address);

        const result = await masterSYS.sendChangeIndex(creator.getSender(), {
            value: toNano('0.2'),
            queryId: 123,
            newIndex: 1300,
        })

        // User -> Master SYS 
        expect(result.transactions).toHaveTransaction({
            from: creator.address,
            to: masterSYS.address,
            deploy: false,
            success: true,
        })

        const newIndex = await masterSYS.getIndex();
        expect(newIndex).toEqual(1300);
    });
})