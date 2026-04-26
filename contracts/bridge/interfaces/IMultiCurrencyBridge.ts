import { Address } from '../structures/BridgeStructs';

export interface IMultiCurrencyBridge {
  deposit(
    from: Address,
    token: Address,
    amount: bigint,
    targetChain: number
  ): Promise<string>;

  validateTx(id: string, validator: Address): Promise<void>;

  claim(id: string, recipient: Address): Promise<void>;

  emergencyPause(): Promise<void>;
  resume(): Promise<void>;
}