import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    TupleItemInt,
    TupleItemSlice,
} from '@ton/core';

export type MasterSYSConfig = {
    admin: Address;
    tston_total_balance: bigint;
    yt_total_balance: bigint;
    pt_total_balance: bigint;
    maturity: bigint;
    pool_value_in_ton: bigint;
    index_tston_ton:number;
};

export function masterSYSConfigToCell(config: MasterSYSConfig): Cell {
    return beginCell().storeAddress(config.admin).storeCoins(config.tston_total_balance).storeCoins(config.yt_total_balance).storeCoins(config.pt_total_balance)
    .storeCoins(config.maturity).storeCoins(config.pool_value_in_ton).storeUint(config.index_tston_ton,32).endCell();
}

export class MasterSYS implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: {code: Cell, data: Cell}
    ) {}

    static createFromAddress(address: Address) {
        return new MasterSYS(address);
    }

    static createFromConfig(config: MasterSYSConfig, code: Cell, workchain = 0) {
        const data = masterSYSConfigToCell(config);
        const init = { code, data };
        return new MasterSYS(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendChangeIndex(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId: number;
            newIndex: number;
        },
    ) {
        const result = await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(10, 32) // change_index
                .storeUint(opts.queryId, 64)
                .storeUint(opts.newIndex,32)
                .endCell(),
        });

        return result;
    }

async sendMintReq(
    provider: ContractProvider,
    via: Sender,
    opts: {
        YTAddress: Address;
        toAddress: Address;
        jettonAmount: bigint;
        amount: bigint;
        queryId: number;
        value: bigint;
    },
) {
    const result = await provider.internal(via, {
        value: opts.value,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: beginCell()
            .storeUint(12, 32)
            .storeUint(opts.queryId, 64)
            .storeAddress(opts.YTAddress)
            .storeAddress(opts.toAddress)
            .storeCoins(opts.amount)
            .storeCoins(opts.jettonAmount)
            .endCell(),
    });

    return result;
}

async sendClaimInterest(
    provider: ContractProvider,
    via: Sender,
    opts: {
        YTAddress: Address;
        toAddress: Address;
        amount: bigint;
        queryId: number;
        masterAddress: Address;
        fivaTstonAddress: Address;
        userTstonAddress: Address;
    },
) {
    const result = await provider.internal(via, {
        value: opts.amount,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body: beginCell()
            .storeUint(13, 32)
            .storeUint(opts.queryId, 64)
            .storeAddress(opts.YTAddress)
            .storeAddress(opts.toAddress)
            .storeCoins(opts.amount)
            .storeRef(
                beginCell()
                    .storeAddress(opts.masterAddress)
                    .storeAddress(opts.fivaTstonAddress)
                    .storeAddress(opts.userTstonAddress)
                    .endCell(),
            )
            .endCell(),
    });

    return result;
}
    async getIndex(provider: ContractProvider) {
        const result = await provider.get('get_index',[]);
        return result.stack.readNumber();
    }
}
