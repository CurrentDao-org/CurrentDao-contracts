import { IERC20 } from './interfaces/IERC20';
export declare class WattToken implements IERC20 {
    readonly name: string;
    readonly symbol: string;
    readonly decimals: number;
    private _totalSupply;
    private balances;
    private allowances;
    private admin;
    private minters;
    private burners;
    private paused;
    private events;
    constructor(adminAddress: string);
    private whenNotPaused;
    private onlyAdmin;
    pause(caller: string): void;
    unpause(caller: string): void;
    grantMinterRole(caller: string, account: string): void;
    grantBurnerRole(caller: string, account: string): void;
    mint(caller: string, to: string, amount: number): boolean;
    burn(caller: string, from: string, amount: number): boolean;
    totalSupply(): number;
    balanceOf(account: string): number;
    transfer(recipient: string, amount: number): boolean;
    executeTransfer(sender: string, recipient: string, amount: number): boolean;
    private _transfer;
    allowance(owner: string, spender: string): number;
    approve(spender: string, amount: number, caller?: string): boolean;
    transferFrom(sender: string, recipient: string, amount: number): boolean;
    private emitEvent;
    getPastEvents(): any[];
}
//# sourceMappingURL=WattToken.d.ts.map