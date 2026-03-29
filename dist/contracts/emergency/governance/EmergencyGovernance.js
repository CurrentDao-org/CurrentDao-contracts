"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyGovernance = void 0;
const PauseStructure_1 = require("../structures/PauseStructure");
const EmergencyLib_1 = require("../libraries/EmergencyLib");
const IEmergencyPause_1 = require("../interfaces/IEmergencyPause");
/**
 * @title EmergencyGovernance
 * @dev Multi-signature governance system for emergency operations
 */
class EmergencyGovernance {
    governanceMembers = new Set();
    proposals = new Map();
    requiredSignatures;
    proposalCounter = 0;
    constructor(initialMembers, requiredSignatures) {
        this.requiredSignatures = requiredSignatures;
        this.initializeGovernanceMembers(initialMembers);
    }
    /**
     * @dev Initializes governance members
     */
    initializeGovernanceMembers(members) {
        if (members.length < PauseStructure_1.VALIDATION_CONSTANTS.MIN_GOVERNANCE_MEMBERS) {
            throw new Error(`Minimum ${PauseStructure_1.VALIDATION_CONSTANTS.MIN_GOVERNANCE_MEMBERS} governance members required`);
        }
        if (members.length > PauseStructure_1.VALIDATION_CONSTANTS.MAX_GOVERNANCE_MEMBERS) {
            throw new Error(`Maximum ${PauseStructure_1.VALIDATION_CONSTANTS.MAX_GOVERNANCE_MEMBERS} governance members allowed`);
        }
        for (const member of members) {
            if (!EmergencyLib_1.EmergencyLib.isValidAddress(member)) {
                throw new Error(`Invalid member address: ${member}`);
            }
            this.governanceMembers.add(member.toLowerCase());
        }
    }
    /**
     * @dev Creates governance proposal
     */
    createProposal(action, proposer, targetLevel, targetConfig, targetMember) {
        // Validate proposer is governance member
        if (!this.governanceMembers.has(proposer.toLowerCase())) {
            throw new Error(IEmergencyPause_1.EmergencyPauseError.UNAUTHORIZED_GOVERNANCE_ACTION);
        }
        // Validate proposal parameters
        this.validateProposalParameters(action, targetLevel, targetConfig, targetMember);
        const proposalId = this.generateProposalId(action);
        const proposal = {
            id: proposalId,
            action,
            proposer,
            signatures: [],
            timestamp: Math.floor(Date.now() / 1000),
            executed: false
        };
        // Add optional properties only if they exist
        if (targetLevel !== undefined) {
            proposal.targetLevel = targetLevel;
        }
        if (targetConfig !== undefined) {
            proposal.targetConfig = targetConfig;
        }
        if (targetMember !== undefined) {
            proposal.targetMember = targetMember;
        }
        this.proposals.set(proposalId, proposal);
        return proposal;
    }
    /**
     * @dev Signs governance proposal
     */
    signProposal(proposalId, signer, signature) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error('Proposal not found');
        }
        // Validate signer is governance member
        if (!this.governanceMembers.has(signer.toLowerCase())) {
            throw new Error(IEmergencyPause_1.EmergencyPauseError.UNAUTHORIZED_GOVERNANCE_ACTION);
        }
        // Validate signature
        if (!EmergencyLib_1.EmergencyLib.isValidSignature(signature)) {
            throw new Error('Invalid signature format');
        }
        // Check if already signed
        if (proposal.signatures.includes(signature)) {
            throw new Error('Proposal already signed with this signature');
        }
        // Add signature
        proposal.signatures.push(signature);
        // Check if threshold reached
        if (proposal.signatures.length >= this.requiredSignatures) {
            this.executeProposal(proposalId);
        }
    }
    /**
     * @dev Executes governance proposal
     */
    executeProposal(proposalId) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error('Proposal not found');
        }
        if (proposal.executed) {
            throw new Error('Proposal already executed');
        }
        // Execute action based on type
        switch (proposal.action) {
            case PauseStructure_1.GovernanceAction.ADD_MEMBER:
                if (proposal.targetMember) {
                    this.addGovernanceMember(proposal.targetMember);
                }
                break;
            case PauseStructure_1.GovernanceAction.REMOVE_MEMBER:
                if (proposal.targetMember) {
                    this.removeGovernanceMember(proposal.targetMember);
                }
                break;
            case PauseStructure_1.GovernanceAction.UPDATE_CONFIG:
                // Config update would be handled by the main contract
                break;
            case PauseStructure_1.GovernanceAction.EMERGENCY_PAUSE:
            case PauseStructure_1.GovernanceAction.EMERGENCY_RESUME:
            case PauseStructure_1.GovernanceAction.TRIGGER_AUTO_RESUME:
                // These actions would be handled by the main contract
                break;
        }
        proposal.executed = true;
        proposal.executionTime = Math.floor(Date.now() / 1000);
    }
    /**
     * @dev Adds governance member
     */
    addGovernanceMember(memberAddress) {
        if (this.governanceMembers.size >= PauseStructure_1.VALIDATION_CONSTANTS.MAX_GOVERNANCE_MEMBERS) {
            throw new Error(`Maximum governance members reached: ${PauseStructure_1.VALIDATION_CONSTANTS.MAX_GOVERNANCE_MEMBERS}`);
        }
        if (!EmergencyLib_1.EmergencyLib.isValidAddress(memberAddress)) {
            throw new Error(`Invalid member address: ${memberAddress}`);
        }
        if (this.governanceMembers.has(memberAddress.toLowerCase())) {
            throw new Error('Member already exists');
        }
        this.governanceMembers.add(memberAddress.toLowerCase());
    }
    /**
     * @dev Removes governance member
     */
    removeGovernanceMember(memberAddress) {
        if (this.governanceMembers.size <= PauseStructure_1.VALIDATION_CONSTANTS.MIN_GOVERNANCE_MEMBERS) {
            throw new Error(`Cannot remove member: minimum ${PauseStructure_1.VALIDATION_CONSTANTS.MIN_GOVERNANCE_MEMBERS} members required`);
        }
        if (!this.governanceMembers.has(memberAddress.toLowerCase())) {
            throw new Error('Member not found');
        }
        this.governanceMembers.delete(memberAddress.toLowerCase());
    }
    /**
     * @dev Validates multi-signature data
     */
    validateMultiSignature(multiSigData, action, config) {
        const errors = [];
        const warnings = [];
        let gasEstimate = 0;
        // Validate threshold
        if (multiSigData.signatures.length < multiSigData.threshold) {
            errors.push(`Insufficient signatures. Required: ${multiSigData.threshold}, Provided: ${multiSigData.signatures.length}`);
        }
        // Validate signers are governance members
        for (const signer of multiSigData.signers) {
            if (!this.governanceMembers.has(signer.toLowerCase())) {
                errors.push(`Invalid signer: ${signer}`);
            }
        }
        // Validate signature uniqueness
        const uniqueSigners = new Set(multiSigData.signers.map(s => s.toLowerCase()));
        if (uniqueSigners.size !== multiSigData.signers.length) {
            errors.push('Duplicate signers detected');
        }
        // Validate threshold matches requirements
        const requiredThreshold = this.getRequiredSignaturesForAction(action, config);
        if (multiSigData.threshold !== requiredThreshold) {
            errors.push(`Threshold mismatch. Required: ${requiredThreshold}, Provided: ${multiSigData.threshold}`);
        }
        // Calculate gas estimate
        gasEstimate = EmergencyLib_1.EmergencyLib.estimateGovernanceGas(action, multiSigData.signatures.length, config);
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            gasEstimate
        };
    }
    /**
     * @dev Gets required signatures for specific action
     */
    getRequiredSignaturesForAction(action, config) {
        switch (action) {
            case PauseStructure_1.GovernanceAction.ADD_MEMBER:
            case PauseStructure_1.GovernanceAction.REMOVE_MEMBER:
                return Math.max(this.requiredSignatures, config.requiredSignatures);
            case PauseStructure_1.GovernanceAction.UPDATE_CONFIG:
                return config.requiredSignatures + 1; // Higher threshold for config changes
            case PauseStructure_1.GovernanceAction.EMERGENCY_PAUSE:
            case PauseStructure_1.GovernanceAction.EMERGENCY_RESUME:
                return config.requiredSignatures;
            case PauseStructure_1.GovernanceAction.TRIGGER_AUTO_RESUME:
                return Math.floor(config.requiredSignatures / 2) + 1; // Lower threshold for auto-resume
            default:
                return this.requiredSignatures;
        }
    }
    /**
     * @dev Validates proposal parameters
     */
    validateProposalParameters(action, targetLevel, targetConfig, targetMember) {
        switch (action) {
            case PauseStructure_1.GovernanceAction.ADD_MEMBER:
            case PauseStructure_1.GovernanceAction.REMOVE_MEMBER:
                if (!targetMember) {
                    throw new Error('Target member required for member management actions');
                }
                if (!EmergencyLib_1.EmergencyLib.isValidAddress(targetMember)) {
                    throw new Error(`Invalid target member address: ${targetMember}`);
                }
                break;
            case PauseStructure_1.GovernanceAction.UPDATE_CONFIG:
                if (!targetConfig) {
                    throw new Error('Target config required for config update action');
                }
                break;
            case PauseStructure_1.GovernanceAction.EMERGENCY_PAUSE:
            case PauseStructure_1.GovernanceAction.EMERGENCY_RESUME:
                if (targetLevel === undefined) {
                    throw new Error('Target level required for pause/resume actions');
                }
                break;
            case PauseStructure_1.GovernanceAction.TRIGGER_AUTO_RESUME:
                // No additional validation needed for auto-resume
                break;
        }
    }
    /**
     * @dev Generates proposal ID
     */
    generateProposalId(action) {
        this.proposalCounter++;
        const timestamp = Math.floor(Date.now() / 1000);
        return `proposal_${action}_${timestamp}_${this.proposalCounter}`;
    }
    /**
     * @dev Gets proposal by ID
     */
    getProposal(proposalId) {
        return this.proposals.get(proposalId);
    }
    /**
     * @dev Gets all proposals
     */
    getAllProposals() {
        return Array.from(this.proposals.values());
    }
    /**
     * @dev Gets active proposals (not executed)
     */
    getActiveProposals() {
        return Array.from(this.proposals.values()).filter(p => !p.executed);
    }
    /**
     * @dev Gets governance members
     */
    getGovernanceMembers() {
        return Array.from(this.governanceMembers);
    }
    /**
     * @dev Checks if address is governance member
     */
    isGovernanceMember(address) {
        return this.governanceMembers.has(address.toLowerCase());
    }
    /**
     * @dev Gets required signatures count
     */
    getRequiredSignatures() {
        return this.requiredSignatures;
    }
    /**
     * @dev Updates required signatures
     */
    updateRequiredSignatures(newThreshold, signatures) {
        // Validate new threshold
        if (newThreshold < PauseStructure_1.VALIDATION_CONSTANTS.MIN_SIGNATURES) {
            throw new Error(`Minimum signatures required: ${PauseStructure_1.VALIDATION_CONSTANTS.MIN_SIGNATURES}`);
        }
        if (newThreshold > PauseStructure_1.VALIDATION_CONSTANTS.MAX_SIGNATURES) {
            throw new Error(`Maximum signatures allowed: ${PauseStructure_1.VALIDATION_CONSTANTS.MAX_SIGNATURES}`);
        }
        if (newThreshold > this.governanceMembers.size) {
            throw new Error('Threshold cannot exceed number of governance members');
        }
        // Validate signatures
        if (signatures.length < this.requiredSignatures) {
            throw new Error(`Insufficient signatures to update threshold. Required: ${this.requiredSignatures}`);
        }
        // Update threshold
        this.requiredSignatures = newThreshold;
    }
    /**
     * @dev Gets governance statistics
     */
    getGovernanceStats() {
        const proposals = Array.from(this.proposals.values());
        const executedProposals = proposals.filter(p => p.executed);
        const averageExecutionTime = executedProposals.length > 0 ?
            executedProposals.reduce((sum, p) => {
                const execTime = p.executionTime ? p.executionTime - p.timestamp : 0;
                return sum + execTime;
            }, 0) / executedProposals.length :
            0;
        return {
            totalMembers: this.governanceMembers.size,
            requiredSignatures: this.requiredSignatures,
            totalProposals: proposals.length,
            activeProposals: proposals.filter(p => !p.executed).length,
            executedProposals: executedProposals.length,
            averageExecutionTime
        };
    }
    /**
     * @dev Clears old proposals (cleanup utility)
     */
    clearOldProposals(olderThanDays = 30) {
        const cutoffTime = Math.floor(Date.now() / 1000) - (olderThanDays * 24 * 60 * 60);
        for (const [id, proposal] of this.proposals.entries()) {
            if (proposal.timestamp < cutoffTime && proposal.executed) {
                this.proposals.delete(id);
            }
        }
    }
    /**
     * @dev Creates multi-signature data structure
     */
    createMultiSignatureData(signatures, signers, data) {
        // Validate inputs
        if (signatures.length !== signers.length) {
            throw new Error('Signatures and signers arrays must have same length');
        }
        for (const signer of signers) {
            if (!this.governanceMembers.has(signer.toLowerCase())) {
                throw new Error(`Invalid signer: ${signer}`);
            }
        }
        // Create hash (simplified - in production use proper cryptographic hash)
        const hash = this.generateHash(signatures.join('') + data);
        return {
            signatures,
            signers,
            threshold: this.requiredSignatures,
            data,
            hash
        };
    }
    /**
     * @dev Generates hash (simplified implementation)
     */
    generateHash(data) {
        // In production, use proper cryptographic hash function
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }
}
exports.EmergencyGovernance = EmergencyGovernance;
//# sourceMappingURL=EmergencyGovernance.js.map