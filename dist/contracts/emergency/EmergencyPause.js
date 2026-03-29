"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyPause = void 0;
const PauseStructure_1 = require("./structures/PauseStructure");
const IEmergencyPause_1 = require("./interfaces/IEmergencyPause");
const EmergencyLib_1 = require("./libraries/EmergencyLib");
const EmergencyGovernance_1 = require("./governance/EmergencyGovernance");
/**
 * @title EmergencyPause
 * @dev Main emergency pause contract providing rapid security response
 */
class EmergencyPause {
    config;
    governance;
    pauseStatus;
    pauseEvents = [];
    contractStates = new Map();
    notifications = [];
    eventHandlers;
    constructor(initialGovernanceMembers, initialConfig, eventHandlers) {
        // Initialize configuration
        this.config = {
            ...PauseStructure_1.DEFAULT_EMERGENCY_CONFIG,
            ...initialConfig,
            governanceMembers: initialGovernanceMembers,
            pauseLevels: {
                ...PauseStructure_1.DEFAULT_EMERGENCY_CONFIG.pauseLevels,
                ...(initialConfig?.pauseLevels || {})
            }
        };
        // Initialize governance
        this.governance = new EmergencyGovernance_1.EmergencyGovernance(initialGovernanceMembers, this.config.requiredSignatures);
        // Initialize pause status
        this.pauseStatus = {
            level: PauseStructure_1.PauseLevel.NONE,
            isActive: false,
            startTime: 0,
            duration: 0,
            reason: '',
            initiator: '',
            affectedContracts: [],
            autoResumeTime: 0,
            lastUpdateTime: 0
        };
        // Initialize event handlers
        this.eventHandlers = eventHandlers || this.getDefaultEventHandlers();
    }
    /**
     * @dev Initiates emergency pause at specified level
     */
    async emergencyPause(level, reason, duration, affectedContracts) {
        // Validate pause request
        const validation = EmergencyLib_1.EmergencyLib.validatePauseRequest(level, reason, duration, affectedContracts, this.config);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        // Check if pause is already active
        if (this.pauseStatus.isActive) {
            throw new Error(IEmergencyPause_1.EmergencyPauseError.EMERGENCY_ALREADY_ACTIVE);
        }
        // Create pause status
        this.pauseStatus = EmergencyLib_1.EmergencyLib.createPauseStatus(level, reason, duration, 'system', // Would be actual caller in production
        affectedContracts, this.config);
        // Update contract states
        this.updateContractStates(level, affectedContracts, reason);
        // Create pause event
        const pauseEvent = EmergencyLib_1.EmergencyLib.createPauseEvent(this.pauseStatus, EmergencyLib_1.EmergencyLib.generatePauseEventId(level, 'system'), validation.gasEstimate);
        this.pauseEvents.push(pauseEvent);
        // Send notifications
        await this.emitPauseNotification(level, reason, affectedContracts);
        // Emit event
        if (this.eventHandlers.EmergencyPauseInitiated) {
            this.eventHandlers.EmergencyPauseInitiated({
                level,
                reason,
                timestamp: this.pauseStatus.startTime,
                initiator: this.pauseStatus.initiator,
                affectedContracts
            });
        }
        console.log(`Emergency pause initiated at level ${level} for ${duration} seconds`);
    }
    /**
     * @dev Resumes operations after emergency pause
     */
    async resumeOperations(level, signatures, proof) {
        // Validate resume request
        const validation = EmergencyLib_1.EmergencyLib.validateResumeRequest(level, signatures, this.pauseStatus, this.config);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        // Validate governance approval
        const governanceValidation = this.governance.validateMultiSignature({
            signatures,
            signers: signatures.map((_, i) => `signer_${i}`), // Would be actual signers
            threshold: this.config.pauseLevels[level].requiredSignatures,
            data: proof,
            hash: EmergencyLib_1.EmergencyLib.generatePauseEventId(level, 'resume')
        }, PauseStructure_1.GovernanceAction.EMERGENCY_RESUME, this.config);
        if (!governanceValidation.isValid) {
            throw new Error(`Governance validation failed: ${governanceValidation.errors.join(', ')}`);
        }
        // Update pause status
        this.pauseStatus.isActive = false;
        this.pauseStatus.lastUpdateTime = Math.floor(Date.now() / 1000);
        // Update contract states
        this.resumeContractStates(level);
        // Update pause event
        const lastEvent = this.pauseEvents[this.pauseEvents.length - 1];
        if (lastEvent && !lastEvent.endTime) {
            const updatedEvent = EmergencyLib_1.EmergencyLib.updatePauseEventWithResume(lastEvent, signatures, false, validation.gasEstimate);
            this.pauseEvents[this.pauseEvents.length - 1] = updatedEvent;
        }
        // Send notifications
        const notification = EmergencyLib_1.EmergencyLib.createNotificationData('EMERGENCY_RESUME', level, `Operations resumed at level ${level}`, this.pauseStatus.affectedContracts, 'system');
        this.notifications.push(notification);
        // Emit event
        if (this.eventHandlers.EmergencyPauseResumed) {
            this.eventHandlers.EmergencyPauseResumed({
                level,
                timestamp: this.pauseStatus.lastUpdateTime,
                resumedBy: 'system',
                signatures
            });
        }
        console.log(`Emergency operations resumed at level ${level}`);
    }
    /**
     * @dev Gets current pause status
     */
    async getPauseStatus() {
        return { ...this.pauseStatus };
    }
    /**
     * @dev Gets pause configuration
     */
    async getEmergencyConfig() {
        return { ...this.config };
    }
    /**
     * @dev Updates emergency configuration
     */
    async updateEmergencyConfig(config, signatures) {
        // Validate governance approval
        const validation = this.governance.validateMultiSignature({
            signatures,
            signers: signatures.map((_, i) => `signer_${i}`),
            threshold: this.config.requiredSignatures + 1,
            data: JSON.stringify(config),
            hash: EmergencyLib_1.EmergencyLib.generatePauseEventId(PauseStructure_1.PauseLevel.NONE, 'config_update')
        }, PauseStructure_1.GovernanceAction.UPDATE_CONFIG, this.config);
        if (!validation.isValid) {
            throw new Error(`Governance validation failed: ${validation.errors.join(', ')}`);
        }
        // Update configuration
        const oldConfig = { ...this.config };
        this.config = { ...config };
        // Update governance if members changed
        if (config.governanceMembers !== oldConfig.governanceMembers) {
            this.governance = new EmergencyGovernance_1.EmergencyGovernance(config.governanceMembers, config.requiredSignatures);
        }
        // Emit event
        if (this.eventHandlers.EmergencyConfigUpdated) {
            this.eventHandlers.EmergencyConfigUpdated({
                oldConfig,
                newConfig: config,
                timestamp: Math.floor(Date.now() / 1000),
                updatedBy: 'system'
            });
        }
        console.log('Emergency configuration updated');
    }
    /**
     * @dev Gets pause analytics
     */
    async getPauseAnalytics() {
        const analytics = EmergencyLib_1.EmergencyLib.calculateAnalytics(this.pauseEvents);
        return {
            totalPauses: analytics.totalPauses,
            averageDuration: analytics.averageDuration,
            pauseFrequency: analytics.pauseFrequency,
            lastPauseTime: analytics.lastPauseTime,
            pauseHistory: this.pauseEvents
        };
    }
    /**
     * @dev Checks if specific contract is paused
     */
    async isContractPaused(contractAddress) {
        const state = this.contractStates.get(contractAddress.toLowerCase());
        return state ? state.isPaused : false;
    }
    /**
     * @dev Gets affected contracts for specific pause level
     */
    async getAffectedContracts(level) {
        if (level === PauseStructure_1.PauseLevel.NONE) {
            return [];
        }
        switch (level) {
            case PauseStructure_1.PauseLevel.SELECTIVE:
                return this.pauseStatus.affectedContracts;
            case PauseStructure_1.PauseLevel.PARTIAL:
                return this.config.criticalContracts;
            case PauseStructure_1.PauseLevel.FULL:
                return Array.from(this.contractStates.keys());
            default:
                return [];
        }
    }
    /**
     * @dev Triggers auto-resume if conditions met
     */
    async triggerAutoResume() {
        if (!EmergencyLib_1.EmergencyLib.shouldAutoResume(this.pauseStatus, this.config)) {
            throw new Error(IEmergencyPause_1.EmergencyPauseError.AUTO_RESUME_CONDITIONS_NOT_MET);
        }
        const level = this.pauseStatus.level;
        // Update pause status
        this.pauseStatus.isActive = false;
        this.pauseStatus.lastUpdateTime = Math.floor(Date.now() / 1000);
        // Update contract states
        this.resumeContractStates(level);
        // Update pause event
        const lastEvent = this.pauseEvents[this.pauseEvents.length - 1];
        if (lastEvent && !lastEvent.endTime) {
            const updatedEvent = EmergencyLib_1.EmergencyLib.updatePauseEventWithResume(lastEvent, [], // No signatures for auto-resume
            true, 0 // Minimal gas for auto-resume
            );
            this.pauseEvents[this.pauseEvents.length - 1] = updatedEvent;
        }
        // Send notifications
        const notification = EmergencyLib_1.EmergencyLib.createNotificationData('AUTO_RESUME', level, `Auto-resume triggered at level ${level}`, this.pauseStatus.affectedContracts, 'system');
        this.notifications.push(notification);
        // Emit event
        if (this.eventHandlers.AutoResumeTriggered) {
            this.eventHandlers.AutoResumeTriggered({
                level,
                timestamp: this.pauseStatus.lastUpdateTime,
                reason: 'Auto-resume conditions met'
            });
        }
        console.log(`Auto-resume triggered at level ${level}`);
    }
    /**
     * @dev Adds governance member
     */
    async addGovernanceMember(memberAddress, signatures) {
        const proposal = this.governance.createProposal(PauseStructure_1.GovernanceAction.ADD_MEMBER, 'system', undefined, undefined, memberAddress);
        // Add signatures
        for (let i = 0; i < signatures.length; i++) {
            this.governance.signProposal(proposal.id, `signer_${i}`, signatures[i]);
        }
        console.log(`Governance member added: ${memberAddress}`);
    }
    /**
     * @dev Removes governance member
     */
    async removeGovernanceMember(memberAddress, signatures) {
        const proposal = this.governance.createProposal(PauseStructure_1.GovernanceAction.REMOVE_MEMBER, 'system', undefined, undefined, memberAddress);
        // Add signatures
        for (let i = 0; i < signatures.length; i++) {
            this.governance.signProposal(proposal.id, `signer_${i}`, signatures[i]);
        }
        console.log(`Governance member removed: ${memberAddress}`);
    }
    /**
     * @dev Validates governance action
     */
    async validateGovernanceAction(action, signatures) {
        const validation = this.governance.validateMultiSignature({
            signatures,
            signers: signatures.map((_, i) => `signer_${i}`),
            threshold: this.config.requiredSignatures,
            data: action.toString(),
            hash: EmergencyLib_1.EmergencyLib.generatePauseEventId(PauseStructure_1.PauseLevel.NONE, 'validation')
        }, action, this.config);
        return validation.isValid;
    }
    /**
     * @dev Emits pause notification
     */
    async emitPauseNotification(level, reason, affectedContracts) {
        const notification = EmergencyLib_1.EmergencyLib.createNotificationData('EMERGENCY_PAUSE', level, `Emergency pause initiated: ${reason}`, affectedContracts, 'system');
        this.notifications.push(notification);
        console.log(`Pause notification sent for level ${level}`);
    }
    /**
     * @dev Gets gas optimization data
     */
    async getGasOptimizationData() {
        return {
            pauseGasCost: EmergencyLib_1.EmergencyLib.estimatePauseGas(PauseStructure_1.PauseLevel.FULL, this.config.criticalContracts.length, this.config),
            resumeGasCost: EmergencyLib_1.EmergencyLib.estimateResumeGas(PauseStructure_1.PauseLevel.FULL, this.config.requiredSignatures, this.config),
            notificationGasCost: 15000 // Base notification cost
        };
    }
    /**
     * @dev Updates contract states based on pause level
     */
    updateContractStates(level, affectedContracts, reason) {
        const now = Math.floor(Date.now() / 1000);
        switch (level) {
            case PauseStructure_1.PauseLevel.SELECTIVE:
                for (const contract of affectedContracts) {
                    this.contractStates.set(contract.toLowerCase(), {
                        contractAddress: contract,
                        isPaused: true,
                        pauseLevel: level,
                        pauseTime: now,
                        expectedResumeTime: this.pauseStatus.autoResumeTime,
                        pauseReason: reason,
                        functionsPaused: ['all']
                    });
                }
                break;
            case PauseStructure_1.PauseLevel.PARTIAL:
                for (const contract of this.config.criticalContracts) {
                    this.contractStates.set(contract.toLowerCase(), {
                        contractAddress: contract,
                        isPaused: true,
                        pauseLevel: level,
                        pauseTime: now,
                        expectedResumeTime: this.pauseStatus.autoResumeTime,
                        pauseReason: reason,
                        functionsPaused: ['critical']
                    });
                }
                break;
            case PauseStructure_1.PauseLevel.FULL:
                // Pause all known contracts
                for (const contract of this.contractStates.keys()) {
                    this.contractStates.set(contract, {
                        contractAddress: contract,
                        isPaused: true,
                        pauseLevel: level,
                        pauseTime: now,
                        expectedResumeTime: this.pauseStatus.autoResumeTime,
                        pauseReason: reason,
                        functionsPaused: ['all']
                    });
                }
                break;
        }
    }
    /**
     * @dev Resumes contract states
     */
    resumeContractStates(level) {
        for (const [address, state] of this.contractStates.entries()) {
            if (state.pauseLevel === level || level === PauseStructure_1.PauseLevel.FULL) {
                this.contractStates.set(address, {
                    ...state,
                    isPaused: false,
                    functionsPaused: []
                });
            }
        }
    }
    /**
     * @dev Gets default event handlers
     */
    getDefaultEventHandlers() {
        return {
            EmergencyPauseInitiated: (event) => {
                console.log(`Emergency pause initiated: ${JSON.stringify(event)}`);
            },
            EmergencyPauseResumed: (event) => {
                console.log(`Emergency pause resumed: ${JSON.stringify(event)}`);
            },
            GovernanceActionExecuted: (event) => {
                console.log(`Governance action executed: ${JSON.stringify(event)}`);
            },
            AutoResumeTriggered: (event) => {
                console.log(`Auto-resume triggered: ${JSON.stringify(event)}`);
            },
            EmergencyConfigUpdated: (event) => {
                console.log(`Emergency config updated: ${JSON.stringify(event)}`);
            }
        };
    }
    /**
     * @dev Gets emergency metrics
     */
    getEmergencyMetrics() {
        return EmergencyLib_1.EmergencyLib.calculateEmergencyMetrics(this.pauseEvents, this.notifications);
    }
    /**
     * @dev Gets contract pause state
     */
    getContractPauseState(contractAddress) {
        return this.contractStates.get(contractAddress.toLowerCase());
    }
    /**
     * @dev Gets all notifications
     */
    getNotifications() {
        return [...this.notifications];
    }
    /**
     * @dev Gets governance statistics
     */
    getGovernanceStats() {
        return this.governance.getGovernanceStats();
    }
    /**
     * @dev Checks if auto-resume should be triggered
     */
    shouldAutoResume() {
        return EmergencyLib_1.EmergencyLib.shouldAutoResume(this.pauseStatus, this.config);
    }
}
exports.EmergencyPause = EmergencyPause;
//# sourceMappingURL=EmergencyPause.js.map