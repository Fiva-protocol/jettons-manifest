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
    orderType: number;
    fromAddress: Address | null;
    fromAmount: bigint;
    toAddress: Address | null;
    toAmount: bigint;
};

export enum OrderType {
    JETTON_JETTON = 0,
    JETTON_TON = 1,
    TON_JETTON = 2,
}

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

    static createFromConfig(config: UserOrderConfig, code: Cell, workchain = 0) {
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

    async getOrders(provider: ContractProvider): Promise<Dictionary<bigint, OrderData>> {
        let { stack } = await provider.get('get_orders_data', []);
        let orders: Dictionary<bigint, OrderData> = Dictionary.empty();
        const orders_cell = stack.readCellOpt();
        if (orders_cell) {
            orders = orders_cell?.beginParse().loadDictDirect(Dictionary.Keys.BigUint(256), orderDataSerializer);
        }
        return orders;
    }
}

const orderDataSerializer = {
    serialize: (src: OrderData, builder: Builder) => {
        const val = beginCell()
            .storeUint(src.orderType, 8)
            .storeAddress(src.fromAddress)
            .storeUint(src.fromAmount, 64)
            .storeAddress(src.toAddress)
            .storeUint(src.toAmount, 64)
            .endCell();
        builder.storeRef(val);
    },
    parse: (src: Slice): OrderData => {
        const val = src.loadRef().beginParse();
        const orderType = val.loadUint(8);
        const fromAddress = orderType != OrderType.TON_JETTON ? val.loadAddress() : null;
        const fromAmount = BigInt(val.loadUint(64));
        const toAddress = orderType != OrderType.JETTON_TON ? val.loadAddress() : null;
        const toAmount = BigInt(val.loadUint(64));
        return { orderType, fromAddress, fromAmount, toAddress, toAmount };
    },
};
