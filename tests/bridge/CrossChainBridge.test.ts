import { CrossChainBridge } from '../../contracts/bridge/CrossChainBridge';
import { MultiChainValidator } from '../../contracts/bridge/MultiChainValidator';
import { BridgeLib } from '../../contracts/bridge/BridgeLib';
import { IERC20 } from '../../scripts/IERC20';

class MockToken implements IERC20 {
    public balances: Map<string, number> = new Map();
    public allowances: Map<string, number> = new Map();

    totalSupply(): number { return 100000; }
    balanceOf(account: string): number { return this.balances.get(account) || 0; }
    
    transfer(recipient: string, amount: number): boolean {
        return true;
    }

    allowance(owner: string, spender: string): number {
        return this.allowances.get(`${owner}_${spender}`) || 0;
    }

    approve(spender: string, amount: number): boolean {
        return true;
    }

    transferFrom(sender: string, recipient: string, amount: number): boolean {
        const bal = this.balances.get(sender) || 0;
        if (bal < amount) return false;
        this.balances.set(sender, bal - amount);
        this.balances.set(recipient, (this.balances.get(recipient) || 0) + amount);
        return true;
    }

    executeTransfer(sender: string, recipient: string, amount: number): boolean {
        return this.transferFrom(sender, recipient, amount);
    }
    
    getPastEvents(): any[] { return []; }
}

describe('CrossChainBridge', () => {
    let validator: MultiChainValidator;
    let bridge: CrossChainBridge;
    let token: MockToken;
    let tokenMap: Map<string, IERC20>;

    const admin = "admin_address";
    const user1 = "user1_address";
    const user2 = "user2_address";
    const tokenAddr = "0xEnergyToken";

    beforeEach(() => {
        validator = new MultiChainValidator();
        validator.registerChain(admin, admin, { chainId: 'Polygon', isActive: true, requiredSignatures: 1 });
        validator.registerChain(admin, admin, { chainId: 'Ethereum', isActive: true, requiredSignatures: 1 });

        token = new MockToken();
        token.balances.set(user1, 10000); // give user1 10000 tokens
        token.allowances.set(`${user1}_${admin}`, 10000); // give allowance

        tokenMap = new Map();
        tokenMap.set(tokenAddr, token);

        bridge = new CrossChainBridge(admin, validator, tokenMap);
        bridge.whitelistAsset(admin, tokenAddr, 5000); // initial liquidity 5000
    });

    describe('Initialization & Admin Controls', () => {
        it('should correctly initialize with admin', () => {
            expect(bridge.admin).toBe(admin);
            expect(bridge.getLiquidity(tokenAddr)).toBe(5000);
        });

        it('should pause and unpause by admin only', () => {
            bridge.pauseBridge(admin);
            expect(() => bridge.wrapAsset(user1, 'Polygon', tokenAddr, 100, user2, 0)).toThrow('Bridge: paused');
            
            expect(() => bridge.unpauseBridge(user1)).toThrow('Bridge: caller is not an admin');
            
            bridge.unpauseBridge(admin);
            // Verify unpaused by attempting a wrap check (slippage throw means paused was passed)
            expect(() => bridge.wrapAsset(user1, 'Polygon', tokenAddr, 100, user2, 99999)).toThrow('Bridge: Slippage exceeded');
        });

        it('should allow admin to update fee model', () => {
            bridge.updateFeeModel(admin, 5, 20, 10);
            const events = bridge.getPastEvents();
            const feeEvent = events.find(e => e.event === 'FeeModelUpdated');
            expect(feeEvent).toBeDefined();
            expect(feeEvent.data.baseFee).toBe(5);
        });
    });

    describe('Wrapping Assets', () => {
        it('should successfully wrap asset and lock tokens', () => {
            const amount = 1000;
            // base fee 10, congestion factor 0.5% (1000 * 50/10000 = 5), utilization 0.2% (1000 * 20/10000 = 2)
            // Fee = 10 + 5 + 2 = 17
            // expectedOut = 1000 - 17 = 983
            
            const tx = bridge.wrapAsset(user1, 'Polygon', tokenAddr, amount, user2, 980);
            
            expect(tx.amount).toBe(983);
            expect(tx.fee).toBe(17);
            expect(tx.originChain).toBe('local');
            expect(tx.destinationChain).toBe('Polygon');
            
            // Check balances
            expect(token.balances.get(user1)).toBe(9000);
            expect(token.balances.get(admin)).toBe(1000); // locked in bridge as admin
            
            // Check liquidity pool
            expect(bridge.getLiquidity(tokenAddr)).toBe(6000); // 5000 + 1000
        });

        it('should fail if asset not whitelisted', () => {
            expect(() => bridge.wrapAsset(user1, 'Polygon', '0xFake', 100, user2, 0)).toThrow('Bridge: Asset not whitelisted');
        });

        it('should fail if chain not supported', () => {
            expect(() => bridge.wrapAsset(user1, 'Solana', tokenAddr, 100, user2, 0)).toThrow('Bridge: Destination chain not supported');
        });

        it('should fail on high slippage', () => {
            expect(() => bridge.wrapAsset(user1, 'Polygon', tokenAddr, 1000, user2, 990)).toThrow('Bridge: Slippage exceeded'); // output is 983
        });
        
        it('should fail on insufficient allowance', () => {
             token.allowances.clear();
             expect(() => bridge.wrapAsset(user1, 'Polygon', tokenAddr, 1000, user2, 0)).toThrow('Bridge: Insufficient token allowance');
        });
    });

    describe('Unwrapping Assets', () => {
        it('should successfully unwrap asset with valid proof', () => {
            bridge.wrapAsset(user1, 'Polygon', tokenAddr, 1000, user2, 0); // Lock 1000, admin now has 1000 + Pool = 6000
            token.balances.set(admin, 6000); // Mock bridge having liquid tokens
            
            const amountToUnwrap = 500;
            // Mock a proof
            const txHash = 'fake_tx_hash';
            const proof = { signatures: ['sig1'], relayer: 'relayer_address', txHash };

            const success = bridge.unwrapAsset('Ethereum', tokenAddr, amountToUnwrap, user1, proof);
            expect(success).toBe(true);

            expect(token.balances.get(admin)).toBe(5500);
            expect(token.balances.get(user1)).toBe(9500); // 9000 + 500
            expect(bridge.getLiquidity(tokenAddr)).toBe(5500); // 6000 - 500
        });

        it('should prevent replay attacks / double unwrapping', () => {
            token.balances.set(admin, 6000);
            const proof = { signatures: ['sig1'], relayer: 'relayer_address', txHash: 'replay_hash' };
            bridge.unwrapAsset('Polygon', tokenAddr, 100, user1, proof);

            expect(() => bridge.unwrapAsset('Polygon', tokenAddr, 100, user1, proof)).toThrow('Validator: Transaction already processed');
        });

        it('should fail if liquidity is insufficient', () => {
            const proof = { signatures: ['sig1'], relayer: 'relayer', txHash: 'hash1' };
            expect(() => bridge.unwrapAsset('Polygon', tokenAddr, 6000, user1, proof)).toThrow('Bridge: Insufficient pool liquidity');
        });

        it('should fail if origin chain is unsupported', () => {
            const proof = { signatures: ['sig1'], relayer: 'relayer', txHash: 'hash1' };
            expect(() => bridge.unwrapAsset('Bitcoin', tokenAddr, 100, user1, proof)).toThrow('Validator: Origin chain not supported');
        });
        
        it('should fail with insufficient signatures', () => {
             const proof = { signatures: [], relayer: 'relayer', txHash: 'hash1' };
             expect(() => bridge.unwrapAsset('Polygon', tokenAddr, 100, user1, proof)).toThrow('Validator: Insufficient signatures');
        });
    });

    describe('Finalize Bridge Execution', () => {
        it('should validate and complete bridge execution', () => {
            const tx = bridge.wrapAsset(user1, 'Polygon', tokenAddr, 100, user2, 50);
            const expectedHash = BridgeLib.generateTxHash(tx.nonce, tx.originChain, tx.destinationChain, tx.tokenAddress, tx.sender, tx.recipient, tx.amount);
            
            const proof = { signatures: ['master_sig'], relayer: 'relayer', txHash: expectedHash };
            
            // Finalize on origin chain logic (acknowledge)
            const res = bridge.finalizeBridge(tx, proof);
            expect(res).toBe(true);
            
            const events = bridge.getPastEvents();
            const compEvent = events.find(e => e.event === 'BridgeCompleted');
            expect(compEvent).toBeDefined();
        });
    });
});
