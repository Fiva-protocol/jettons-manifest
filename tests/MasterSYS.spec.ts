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
import { setupMasterSYSAndYTJetton, assertJettonBalanceEqualFiva, deployJettonWithWalletFiva } from './helpers_fiva';
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
    let jettonMinterYT: SandboxContract<JettonMinter>;
    let jettonMinterPT:SandboxContract<JettonMinter>;
    let provider:ContractProvider;
    let tston: {
        tstonMinter: SandboxContract<JettonMinter>;
        tstonWallet: SandboxContract<JettonWallet>;
    };

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        sender = await blockchain.treasury('sender');

        ({masterSYS, jettonMinterYT, jettonMinterPT} = await setupMasterSYSAndYTJetton(blockchain, deployer, masterSYSCode,jettonMinterCode,jettonWalletCode));


        
         //deploy tston test


        tston = await deployJettonWithWalletFiva( //create a dummy tston jetton and minth for master SYS 1000 tokens
            blockchain,
            deployer,
            jettonMinterCode,
            jettonWalletCode,
            masterSYS.address,
            1000n,
        );
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

    it('mint YT tokens and Recieve Index and Interest from The contract', async () => {
        
        console.log('YT Address',jettonMinterYT.address);
        console.log('PT Address',jettonMinterPT.address);
        const result = await masterSYS.sendMintReq(sender.getSender() , {
            YTAddress: jettonMinterYT.address,
            PTAddress: jettonMinterPT.address, //ADD PT ADDRESS
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
            to: jettonMinterYT.address,
            deploy: false,
            success: true,
        });

        // Jetton Minter -> User wallet
        const sendTokensToAddr = await jettonMinterYT.getWalletAddress(sender.address);
        expect(result.transactions).toHaveTransaction({
            from: jettonMinterYT.address,
            to: sendTokensToAddr,
            deploy: true,
            success: true,
        });

        await assertJettonBalanceEqual(blockchain, sendTokensToAddr, 1000n);
        const jettonWallet = blockchain.openContract(JettonWallet.createFromAddress(sendTokensToAddr));
        const {index, interest} =await jettonWallet.getWalletData()
        expect(index).toEqual(1000);
        expect(interest).toEqual(0n);

        const sendTokensToAddrPT = await jettonMinterPT.getWalletAddress(sender.address);
        await assertJettonBalanceEqual(blockchain, sendTokensToAddrPT, 1000n);

    });

    it('correctly calculate Interest when Index changed', async () => {
       
        await masterSYS.sendMintReq(sender.getSender() , {
            YTAddress: jettonMinterYT.address,
            PTAddress: jettonMinterPT.address, // ADD PT address
            toAddress: sender.address,
            jettonAmount: 1000n,
            amount: toNano('0.2'),
            queryId: Date.now(),
            value: toNano('0.2'),
        });

        await masterSYS.sendChangeIndex(sender.getSender(), {
            value: toNano('0.2'),
            queryId: 123,
            newIndex: 1300,
        })

        await masterSYS.sendMintReq(sender.getSender() , {
            YTAddress: jettonMinterYT.address,
            PTAddress: jettonMinterPT.address,
            toAddress: sender.address,
            jettonAmount: 1000n,
            amount: toNano('0.2'),
            queryId: Date.now(),
            value: toNano('0.2'),
        });

        const sendTokensToAddr = await jettonMinterYT.getWalletAddress(sender.address);
        const jettonWallet = blockchain.openContract(JettonWallet.createFromAddress(sendTokensToAddr));
        const {index, interest} =await jettonWallet.getWalletData()
        expect(index).toEqual(1300);
        expect(interest).toEqual(2308000n); /*4 decimal points */

        await masterSYS.sendChangeIndex(sender.getSender(), {
            value: toNano('0.2'),
            queryId: 123,
            newIndex: 1500,
        })

        await masterSYS.sendMintReq(sender.getSender() , {
            YTAddress: jettonMinterYT.address,
            PTAddress: jettonMinterPT.address,
            toAddress: sender.address,
            jettonAmount: 1000n,
            amount: toNano('0.2'),
            queryId: Date.now(),
            value: toNano('0.2'),
        });
        const {index:index_2, interest:interest_2} =await jettonWallet.getWalletData()
        expect(index_2).toEqual(1500);
        expect(interest_2).toEqual(4360000n); /*4 decimal points */
    });

    // it('deploy dummy Jetton, mint this Jetton, mint YT token, change index, and claim rewards', async () => {
    //     await masterSYS.sendMintReq(sender.getSender() , {
    //         YTAddress: jettonMinter.address,
    //         PTAddress: jettonMinter.address,
    //         toAddress: sender.address,
    //         jettonAmount: 1000n,
    //         amount: toNano('0.2'),
    //         queryId: Date.now(),
    //         value: toNano('0.2'),
    //     });

    //     await masterSYS.sendChangeIndex(sender.getSender(), {
    //         value: toNano('0.2'),
    //         queryId: 123,
    //         newIndex: 1300,
    //     })

    //     // logic that user sent request to master contract should be added because master contract will send updeted index to the wallet
    //     // should user update index or use latest from the contract?

    //     const userTstonAddress = await tston.tstonMinter.getWalletAddress(sender.address);
    //     const fivaTstonAddress = await tston.tstonMinter.getWalletAddress(masterSYS.address);
    //     console.log(userTstonAddress)
    //     console.log(fivaTstonAddress)
        
    //     const result = await masterSYS.sendClaimInterest(sender.getSender(),{
    //         YTAddress:jettonMinter.address,
    //         toAddress:sender.address,
    //         amount:toNano('0.2'),
    //         queryId: Date.now(),
    //         masterAddress: masterSYS.address,
    //         fivaTstonAddress:fivaTstonAddress,
    //         userTstonAddress:userTstonAddress,
    //     });

    //     // User -> Master
    //     expect(result.transactions).toHaveTransaction({
    //         from: sender.address,
    //         to: masterSYS.address,
    //         deploy: false,
    //         success: true,
    //     });
    //     console.log('Address of Master:', masterSYS.address)
    //     console.log('Address of YT nibter', jettonMinter.address)
    //     // Master -> Minter YT
    //     expect(result.transactions).toHaveTransaction({
    //         from: masterSYS.address,
    //         to: jettonMinter.address,
    //         deploy: false,
    //         success: true,
    //     });

    //     // Master -> Minter YT
    //     const userYTAddress= await jettonMinter.getWalletAddress(sender.address);
    //     expect(result.transactions).toHaveTransaction({
    //         from: jettonMinter.address,
    //         to: userYTAddress,
    //         deploy: false,
    //         success: true,
    //     });
        
    // }); 
});