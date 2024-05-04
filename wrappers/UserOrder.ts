import {
    Address,
    beginCell,
    Builder,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode,
    Slice,
} from '@ton/core';

export type UserOrderConfig = {
    owner: Address;
    masterContract: Address;
    orders: Dictionary<bigint, Cell>;
};

export type OrderData = {
    fromAddress: Address;
    fromAmount: bigint;
    toAddress: Address;
    toAmount: bigint;
};

export function userOrderConfigToCell(config: UserOrderConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        .storeAddress(config.masterContract)
        .storeDict(config.orders)
        .endCell();
}

export class UserOrder implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new UserOrder(address);
    }

    static createFromConfig(
        config: UserOrderConfig,
        code: Cell,
        workchain = 0,
    ) {
        const data = userOrderConfigToCell(config);
        const init = { code, data };
        return new UserOrder(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async getOrders(
        provider: ContractProvider,
    ): Promise<Dictionary<bigint, OrderData>> {
        let { stack } = await provider.get('get_orders_data', []);
        let orders: Dictionary<bigint, OrderData> = Dictionary.empty();
        const orders_cell = stack.readCellOpt();
        if (orders_cell) {
            orders = orders_cell
                ?.beginParse()
                .loadDictDirect(
                    Dictionary.Keys.BigUint(256),
                    orderDataSerializer,
                );
        }
        return orders;
    }
}

const orderDataSerializer = {
    serialize: (src: OrderData, builder: Builder) => {
        const val = beginCell()
            .storeAddress(src.fromAddress)
            .storeUint(src.fromAmount, 64)
            .storeAddress(src.toAddress)
            .storeUint(src.toAmount, 64)
            .endCell();
        builder.storeRef(val);
    },
    parse: (src: Slice): OrderData => {
        const val = src.loadRef().beginParse();
        const fromAddress = val.loadAddress();
        const fromAmount = BigInt(val.loadUint(64));
        const toAddress = val.loadAddress();
        const toAmount = BigInt(val.loadUint(64));
        return { fromAddress, fromAmount, toAddress, toAmount };
    },
};
