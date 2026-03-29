import { GovernanceAction, GovernanceProposal, EmergencyConfig, MultiSignatureData, ValidationResult } from '../structures/PauseStructure';
/**
 * @title EmergencyGovernance
 * @dev Multi-signature governance system for emergency operations
 */
export declare class EmergencyGovernance {
    private governanceMembers;
    private proposals;
    private requiredSignatures;
    private proposalCounter;
    constructor(initialMembers: string[], requiredSignatures: number);
    /**
     * @dev Initializes governance members
     */
    private initializeGovernanceMembers;
    /**
     * @dev Creates governance proposal
     */
    createProposal(action: GovernanceAction, proposer: string, targetLevel?: any, targetConfig?: Partial<EmergencyConfig>, targetMember?: string): GovernanceProposal;
    /**
     * @dev Signs governance proposal
     */
    signProposal(proposalId: string, signer: string, signature: string): void;
    /**
     * @dev Executes governance proposal
     */
    private executeProposal;
    /**
     * @dev Adds governance member
     */
    addGovernanceMember(memberAddress: string): void;
    /**
     * @dev Removes governance member
     */
    removeGovernanceMember(memberAddress: string): void;
    /**
     * @dev Validates multi-signature data
     */
    validateMultiSignature(multiSigData: MultiSignatureData, action: GovernanceAction, config: EmergencyConfig): ValidationResult;
    /**
     * @dev Gets required signatures for specific action
     */
    private getRequiredSignaturesForAction;
    /**
     * @dev Validates proposal parameters
     */
    private validateProposalParameters;
    /**
     * @dev Generates proposal ID
     */
    private generateProposalId;
    /**
     * @dev Gets proposal by ID
     */
    getProposal(proposalId: string): GovernanceProposal | undefined;
    /**
     * @dev Gets all proposals
     */
    getAllProposals(): GovernanceProposal[];
    /**
     * @dev Gets active proposals (not executed)
     */
    getActiveProposals(): GovernanceProposal[];
    /**
     * @dev Gets governance members
     */
    getGovernanceMembers(): string[];
    /**
     * @dev Checks if address is governance member
     */
    isGovernanceMember(address: string): boolean;
    /**
     * @dev Gets required signatures count
     */
    getRequiredSignatures(): number;
    /**
     * @dev Updates required signatures
     */
    updateRequiredSignatures(newThreshold: number, signatures: string[]): void;
    /**
     * @dev Gets governance statistics
     */
    getGovernanceStats(): {
        totalMembers: number;
        requiredSignatures: number;
        totalProposals: number;
        activeProposals: number;
        executedProposals: number;
        averageExecutionTime: number;
    };
    /**
     * @dev Clears old proposals (cleanup utility)
     */
    clearOldProposals(olderThanDays?: number): void;
    /**
     * @dev Creates multi-signature data structure
     */
    createMultiSignatureData(signatures: string[], signers: string[], data: string): MultiSignatureData;
    /**
     * @dev Generates hash (simplified implementation)
     */
    private generateHash;
}
//# sourceMappingURL=EmergencyGovernance.d.ts.map