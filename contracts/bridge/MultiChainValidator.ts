import { ValidationProof, ChainConfig } from './BridgeStructure';

export class MultiChainValidator {
    private processedHashes: Set<string> = new Set();
    private supportedChains: Map<string, ChainConfig> = new Map();

    public registerChain(caller: string, admin: string, config: ChainConfig) {
        if (caller !== admin) throw new Error("Validator: Unauthorized");
        this.supportedChains.set(config.chainId, config);
    }

    public isChainSupported(chainId: string): boolean {
        const config = this.supportedChains.get(chainId);
        return config ? config.isActive : false;
    }

    public validateProof(txHash: string, originChain: string, proof: ValidationProof): boolean {
        if (!this.isChainSupported(originChain)) {
            throw new Error("Validator: Origin chain not supported");
        }
        
        if (this.processedHashes.has(txHash)) {
            throw new Error("Validator: Transaction already processed");
        }

        const config = this.supportedChains.get(originChain)!;
        if (proof.signatures.length < config.requiredSignatures) {
            throw new Error("Validator: Insufficient signatures");
        }

        // Simulating hash check
        if (proof.txHash !== txHash) {
            throw new Error("Validator: Hash mismatch in proof");
        }

        this.processedHashes.add(txHash);
        return true;
    }
}
