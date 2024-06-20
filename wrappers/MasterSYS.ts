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

    // async getWalletAddress(provider: ContractProvider, address: Address) {
    //     const result = await provider.get('get_wallet_address', [
    //         {
    //             type: 'slice',
    //             cell: beginCell().storeAddress(address).endCell(),
    //         } as TupleItemSlice,
    //     ]);

    //     return result.stack.readAddress();
    // }

    async getIndex(provider: ContractProvider) {
        const result = await provider.get('get_index',[]);
        return result.stack.readNumber();
    }
}
