import { IZKProof, IPublicSignals } from '../interfaces/IZeroKnowledgeProof';
/**
 * ZKPLib
 * Mock library simulating cryptographic functions for zero-knowledge proofs.
 * Performs simulated snark-level validations and root calculations.
 */
export declare class ZKPLib {
    /**
     * Hashes private commitments to simulate a merkle root extraction
     */
    static computeMerkleRoot(leaves: string[]): string;
    /**
     * Simulates generating a zk-SNARK proof.
     * In a real implementation, this would invoke snarkjs or a WASM prover.
     */
    static generateMockProof(privateInputs: any): Promise<IZKProof>;
    /**
     * Simulates verifying a zk-SNARK proof.
     */
    static verifyMockProof(proof: IZKProof, publicSignals: IPublicSignals): Promise<boolean>;
}
//# sourceMappingURL=ZKPLib.d.ts.map