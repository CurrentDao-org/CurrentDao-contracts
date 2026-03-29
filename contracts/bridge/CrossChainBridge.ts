import { ICrossChainBridge } from './ICrossChainBridge';
import { BridgeTransaction, ValidationProof, WrappedAsset, LiquidityPool, ChainConfig } from './BridgeStructure';
import { BridgeLib } from './BridgeLib';
import { MultiChainValidator } from './MultiChainValidator';
import { IERC20 } from '../../scripts/IERC20';

export class CrossChainBridge implements ICrossChainBridge {
    public readonly admin: string;
    private paused: boolean = false;
    private nonce: number = 0;

    private validator: MultiChainValidator;
    private whitelistedAssets: Set<string> = new Set();
    
    // Pool mapping: tokenAddress => LiquidityPool
    private liquidityPools: Map<string, LiquidityPool> = new Map();

    // Mock registry of tokens (since it's TS and not on-chain, we need a way to interface with tokens)
    private tokens: Map<string, IERC20>;

    private baseFee: number = 10;
    private congestionFactor: number = 50; // 0.5% (where 10000 = 100%)
    private liquidityUtilization: number = 20; // 0.2%
    
    public events: any[] = [];

    constructor(adminAddress: string, validator: MultiChainValidator, tokens: Map<string, IERC20>) {
        this.admin = adminAddress;
        this.validator = validator;
        this.tokens = tokens;
        this.emitEvent('Initialized', { admin: adminAddress });
    }

    private emitEvent(eventName: string, data: any) {
        this.events.push({ event: eventName, timestamp: Date.now(), data });
    }
    
    public getPastEvents(): any[] { 
        return [...this.events]; 
    }

    private whenNotPaused() {
        if (this.paused) throw new Error("Bridge: paused");
    }

    private onlyAdmin(caller: string) {
        if (caller !== this.admin) throw new Error("Bridge: caller is not an admin");
    }

    public pauseBridge(caller: string) {
        this.onlyAdmin(caller);
        this.paused = true;
        this.emitEvent('BridgePaused', { by: caller });
    }

    public unpauseBridge(caller: string) {
        this.onlyAdmin(caller);
        this.paused = false;
        this.emitEvent('BridgeUnpaused', { by: caller });
    }

    public updateFeeModel(caller: string, baseFee: number, congestionFactor: number, liquidityUtilization: number) {
        this.onlyAdmin(caller);
        this.baseFee = baseFee;
        this.congestionFactor = congestionFactor;
        this.liquidityUtilization = liquidityUtilization;
        this.emitEvent('FeeModelUpdated', { baseFee, congestionFactor, liquidityUtilization });
    }

    public whitelistAsset(caller: string, tokenAddress: string, initialLiquidity: number = 0) {
        this.onlyAdmin(caller);
        this.whitelistedAssets.add(tokenAddress);
        this.liquidityPools.set(tokenAddress, {
            chain: 'local',
            tokenAddress: tokenAddress,
            balance: initialLiquidity
        });
        this.emitEvent('AssetWhitelisted', { tokenAddress, initialLiquidity });
    }
    
    public getLiquidity(tokenAddress: string): number {
        const pool = this.liquidityPools.get(tokenAddress);
        return pool ? pool.balance : 0;
    }

    private getOrThrowToken(address: string): IERC20 {
        const token = this.tokens.get(address);
        if (!token) throw new Error("Bridge: Token contract not registered");
        return token;
    }

    public wrapAsset(
        caller: string,
        destinationChain: string,
        tokenAddress: string,
        amount: number,
        recipient: string,
        minOut: number
    ): BridgeTransaction {
        this.whenNotPaused();
        if (!this.whitelistedAssets.has(tokenAddress)) throw new Error("Bridge: Asset not whitelisted");
        if (!this.validator.isChainSupported(destinationChain)) throw new Error("Bridge: Destination chain not supported");

        const fee = BridgeLib.calculateFee(amount, this.baseFee, this.congestionFactor, this.liquidityUtilization);
        const expectedOut = amount - fee;

        if (!BridgeLib.checkSlippage(expectedOut, minOut)) {
            throw new Error("Bridge: Slippage exceeded");
        }

        const token = this.getOrThrowToken(tokenAddress);
        
        // Ensure sufficient allowance before transferFrom
        if (token.allowance(caller, this.admin) < amount) {
            throw new Error("Bridge: Insufficient token allowance");
        }

        // Lock into the bridge
        const success = token.transferFrom(caller, this.admin, amount);
        if (!success) throw new Error("Bridge: Transfer failed");

        // Update pool
        const pool = this.liquidityPools.get(tokenAddress)!;
        pool.balance += amount;

        this.nonce++;
        const tx: BridgeTransaction = {
            nonce: this.nonce,
            originChain: 'local', 
            destinationChain: destinationChain,
            tokenAddress: tokenAddress,
            sender: caller,
            recipient: recipient,
            amount: expectedOut,
            fee: fee
        };

        this.emitEvent('AssetWrapped', tx);
        this.initiateBridge(tx);

        return tx;
    }

    /**
     * Called by relayer to execute the unwrapping of an asset coming from another chain
     */
    public unwrapAsset(
        originChain: string,
        tokenAddress: string,
        amount: number,
        recipient: string,
        proof: ValidationProof
    ): boolean {
        this.whenNotPaused();
        if (!this.whitelistedAssets.has(tokenAddress)) throw new Error("Bridge: Asset not whitelisted");
        
        // This validates the txHash against double-spending and signatures
        this.validator.validateProof(proof.txHash, originChain, proof);

        const token = this.getOrThrowToken(tokenAddress);
        const pool = this.liquidityPools.get(tokenAddress);

        if (!pool || pool.balance < amount) {
            throw new Error("Bridge: Insufficient pool liquidity");
        }

        pool.balance -= amount;
        
        // Release to recipient
        // Admin performs standard transfer on behalf of the bridge
        // Typically, a bridge contract holds the funds directly.
        // In our TS mock, token transfer requires context of sender or admin holds.
        // Assuming admin is the bridge itself.
        // Here we simulate Bridge releasing the asset via transfer as it is the holder
        // In TS logic, we must mock the caller context.
        // If token has custom `executeTransfer`, we'd use it. But standard `transfer` implies `msg.sender`
        // We will call transfer as if the bridge is doing it. Since TS has no inherent `msg.sender`, token should respect it.
        // But the IERC20 interface requires us to assume `transfer` affects the calling instance or the bridge acts dynamically.
        // Wait, standard `transfer` in TS takes `recipient` and `amount`. We can't specify sender. 
        // We'll need to use `executeTransfer` if available, or simulate with `transferFrom` where `sender` is admin.
        // Since we are doing a TS mock and we've verified standard token behavior from WattToken.
        // WattToken actually had `executeTransfer(sender, recipient, amount)`, let's assume we use it by casting if needed,
        // or just `transferFrom(admin, recipient, amount)` because we've approved the bridge. Let's assume bridge HAS allowance to move admin funds.
        
        try {
            // Attempt to use executeTransfer if it exists (like in WattToken)
            (token as any).executeTransfer(this.admin, recipient, amount);
        } catch {
            // Fallback to transferFrom
            const success = token.transferFrom(this.admin, recipient, amount);
            if (!success) throw new Error("Bridge: Unwrap transfer failed");
        }

        this.emitEvent('AssetUnwrapped', { recipient, amount, tokenAddress, originChain });
        return true;
    }

    public initiateBridge(transaction: BridgeTransaction): string {
        const hash = BridgeLib.generateTxHash(
            transaction.nonce, 
            transaction.originChain, 
            transaction.destinationChain, 
            transaction.tokenAddress, 
            transaction.sender, 
            transaction.recipient, 
            transaction.amount
        );
        this.emitEvent('BridgeInitiated', { transaction, hash });
        return hash;
    }

    public finalizeBridge(transaction: BridgeTransaction, proof: ValidationProof): boolean {
        this.whenNotPaused();
        const hash = BridgeLib.generateTxHash(
            transaction.nonce, 
            transaction.originChain, 
            transaction.destinationChain, 
            transaction.tokenAddress, 
            transaction.sender, 
            transaction.recipient, 
            transaction.amount
        );
        
        // Validation will throw if invalid or replay
        this.validator.validateProof(hash, transaction.originChain, proof);
        
        this.emitEvent('BridgeCompleted', { transaction });
        return true;
    }
}
