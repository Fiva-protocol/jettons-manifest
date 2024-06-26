import { crc32 } from './crc32';

export const Opcodes = {
    supply: crc32('supply'),
    mint: crc32('mint'),
    redeem: crc32('redeem')
};