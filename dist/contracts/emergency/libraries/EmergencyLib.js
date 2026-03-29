"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyLib = void 0;
const PauseStructure_1 = require("../structures/PauseStructure");
/**
 * @title EmergencyLib
 * @dev Core library for emergency pause operations and utilities
 */
class EmergencyLib {
    /**
     * @dev Validates pause request parameters
     */
    static validatePauseRequest(level, reason, duration, affectedContracts, config) {
        const errors = [];
        const warnings = [];
        let gasEstimate = 0;
        // Validate pause level
        if (level === PauseStructure_1.PauseLevel.NONE) {
            errors.push('Invalid pause level: NONE');
        }
        // Validate reason
        if (!reason || reason.trim().length === 0) {
            errors.push('Pause reason cannot be empty');
        }
        else if (reason.length > PauseStructure_1.VALIDATION_CONSTANTS.MAX_REASON_LENGTH) {
            errors.push(`Reason exceeds maximum length of ${PauseStructure_1.VALIDATION_CONSTANTS.MAX_REASON_LENGTH}`);
        }
        // Validate duration
        const levelConfig = config.pauseLevels[level];
        if (duration > levelConfig.maxDuration) {
            errors.push(`Duration exceeds maximum for level ${level}: ${levelConfig.maxDuration} seconds`);
        }
        if (duration < 0) {
            errors.push('Duration cannot be negative');
        }
        // Validate affected contracts
        if (level === PauseStructure_1.PauseLevel.SELECTIVE && affectedContracts.length === 0) {
            errors.push('Selective pause requires at least one affected contract');
        }
        // Validate contract addresses format
        for (const contract of affectedContracts) {
            if (!this.isValidAddress(contract)) {
                errors.push(`Invalid contract address: ${contract}`);
            }
        }
        // Calculate gas estimate
        gasEstimate = this.estimatePauseGas(level, affectedContracts.length, config);
        // Add warnings
        if (duration === 0) {
            warnings.push('Indefinite pause - ensure manual resume process is clear');
        }
        if (level === PauseStructure_1.PauseLevel.FULL) {
            warnings.push('Full pause will halt all platform operations');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            gasEstimate
        };
    }
    /**
     * @dev Validates resume request parameters
     */
    static validateResumeRequest(level, signatures, currentStatus, config) {
        const errors = [];
        const warnings = [];
        let gasEstimate = 0;
        // Validate pause is active
        if (!currentStatus.isActive) {
            errors.push('No active pause to resume');
        }
        // Validate pause level
        if (currentStatus.level !== level) {
            errors.push(`Resume level mismatch. Current: ${currentStatus.level}, Requested: ${level}`);
        }
        // Validate signatures
        const levelConfig = config.pauseLevels[level];
        if (signatures.length < levelConfig.requiredSignatures) {
            errors.push(`Insufficient signatures. Required: ${levelConfig.requiredSignatures}, Provided: ${signatures.length}`);
        }
        // Validate signature format
        for (const signature of signatures) {
            if (!this.isValidSignature(signature)) {
                errors.push(`Invalid signature format: ${signature}`);
            }
        }
        // Calculate gas estimate
        gasEstimate = this.estimateResumeGas(level, signatures.length, config);
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            gasEstimate
        };
    }
    /**
     * @dev Validates governance action
     */
    static validateGovernanceAction(action, signatures, config) {
        const errors = [];
        const warnings = [];
        let gasEstimate = 0;
        // Validate signatures
        if (signatures.length < config.requiredSignatures) {
            errors.push(`Insufficient signatures. Required: ${config.requiredSignatures}, Provided: ${signatures.length}`);
        }
        // Validate signature format
        for (const signature of signatures) {
            if (!this.isValidSignature(signature)) {
                errors.push(`Invalid signature format: ${signature}`);
            }
        }
        // Calculate gas estimate
        gasEstimate = this.estimateGovernanceGas(action, signatures.length, config);
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            gasEstimate
        };
    }
    /**
     * @dev Creates pause status object
     */
    static createPauseStatus(level, reason, duration, initiator, affectedContracts, config) {
        const now = Math.floor(Date.now() / 1000);
        const levelConfig = config.pauseLevels[level];
        return {
            level,
            isActive: true,
            startTime: now,
            duration,
            reason,
            initiator,
            affectedContracts,
            autoResumeTime: levelConfig.autoResumeEnabled && duration > 0 ? now + duration : 0,
            lastUpdateTime: now
        };
    }
    /**
     * @dev Creates pause event for analytics
     */
    static createPauseEvent(status, id, gasUsed) {
        return {
            id,
            level: status.level,
            startTime: status.startTime,
            reason: status.reason,
            initiator: status.initiator,
            affectedContracts: status.affectedContracts,
            resumeSignatures: [],
            autoResumed: false,
            gasUsed
        };
    }
    /**
     * @dev Updates pause event with resume data
     */
    static updatePauseEventWithResume(event, signatures, autoResumed, gasUsed) {
        const now = Math.floor(Date.now() / 1000);
        return {
            ...event,
            endTime: now,
            duration: now - event.startTime,
            resumeSignatures: signatures,
            autoResumed,
            gasUsed: event.gasUsed + gasUsed
        };
    }
    /**
     * @dev Creates notification data
     */
    static createNotificationData(type, level, message, affectedContracts, initiator, additionalData) {
        return {
            type,
            level,
            timestamp: Math.floor(Date.now() / 1000),
            message,
            affectedContracts,
            initiator,
            additionalData
        };
    }
    /**
     * @dev Calculates pause analytics
     */
    static calculateAnalytics(events) {
        if (events.length === 0) {
            return {
                totalPauses: 0,
                totalDuration: 0,
                averageDuration: 0,
                pauseFrequency: 0,
                lastPauseTime: 0,
                pauseByLevel: {
                    [PauseStructure_1.PauseLevel.NONE]: 0,
                    [PauseStructure_1.PauseLevel.SELECTIVE]: 0,
                    [PauseStructure_1.PauseLevel.PARTIAL]: 0,
                    [PauseStructure_1.PauseLevel.FULL]: 0
                },
                pauseByReason: {},
                gasUsage: {
                    total: 0,
                    average: 0,
                    byAction: {}
                },
                governanceActivity: {
                    totalProposals: 0,
                    executedProposals: 0,
                    averageExecutionTime: 0
                }
            };
        }
        const completedEvents = events.filter(e => e.endTime !== undefined);
        const totalDuration = completedEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
        const totalGas = events.reduce((sum, e) => sum + e.gasUsed, 0);
        const lastPauseTime = Math.max(...events.map(e => e.startTime));
        // Calculate pause by level
        const pauseByLevel = {
            [PauseStructure_1.PauseLevel.NONE]: 0,
            [PauseStructure_1.PauseLevel.SELECTIVE]: 0,
            [PauseStructure_1.PauseLevel.PARTIAL]: 0,
            [PauseStructure_1.PauseLevel.FULL]: 0
        };
        // Calculate pause by reason
        const pauseByReason = {};
        // Calculate gas usage by action
        const gasUsageByAction = {};
        for (const event of events) {
            pauseByLevel[event.level]++;
            pauseByReason[event.reason] = (pauseByReason[event.reason] || 0) + 1;
            gasUsageByAction[event.autoResumed ? 'AUTO_RESUME' : 'MANUAL_RESUME'] =
                (gasUsageByAction[event.autoResumed ? 'AUTO_RESUME' : 'MANUAL_RESUME'] || 0) + event.gasUsed;
        }
        // Calculate frequency (pauses per day)
        const timeSpan = events.length > 1 ?
            (Math.max(...events.map(e => e.startTime)) - Math.min(...events.map(e => e.startTime))) / PauseStructure_1.TIME_CONSTANTS.DAY :
            1;
        const pauseFrequency = events.length / Math.max(timeSpan, 1);
        return {
            totalPauses: events.length,
            totalDuration,
            averageDuration: completedEvents.length > 0 ? totalDuration / completedEvents.length : 0,
            pauseFrequency,
            lastPauseTime,
            pauseByLevel,
            pauseByReason,
            gasUsage: {
                total: totalGas,
                average: totalGas / events.length,
                byAction: gasUsageByAction
            },
            governanceActivity: {
                totalProposals: 0, // Would be populated from governance data
                executedProposals: 0,
                averageExecutionTime: 0
            }
        };
    }
    /**
     * @dev Checks if auto-resume conditions are met
     */
    static shouldAutoResume(status, config) {
        if (!status.isActive)
            return false;
        const levelConfig = config.pauseLevels[status.level];
        if (!levelConfig.autoResumeEnabled)
            return false;
        if (status.autoResumeTime === 0)
            return false;
        const now = Math.floor(Date.now() / 1000);
        return now >= status.autoResumeTime;
    }
    /**
     * @dev Estimates gas cost for pause operation
     */
    static estimatePauseGas(level, contractCount, config) {
        let gasCost = PauseStructure_1.GAS_CONSTANTS.BASE_PAUSE_COST;
        // Add cost for contract updates
        gasCost += contractCount * PauseStructure_1.GAS_CONSTANTS.CONTRACT_UPDATE_COST;
        // Add cost for signature verification
        gasCost += config.pauseLevels[level].requiredSignatures * PauseStructure_1.GAS_CONSTANTS.SIGNATURE_VERIFICATION_COST;
        // Add cost for notifications
        gasCost += PauseStructure_1.GAS_CONSTANTS.NOTIFICATION_COST;
        // Add storage costs
        gasCost += PauseStructure_1.GAS_CONSTANTS.STORAGE_WRITE_COST * 3; // Status, event, analytics
        // Add event emission cost
        gasCost += PauseStructure_1.GAS_CONSTANTS.EVENT_EMIT_COST * 2; // Pause event, notification event
        return gasCost;
    }
    /**
     * @dev Estimates gas cost for resume operation
     */
    static estimateResumeGas(level, signatureCount, config) {
        let gasCost = PauseStructure_1.GAS_CONSTANTS.BASE_RESUME_COST;
        // Add cost for signature verification
        gasCost += signatureCount * PauseStructure_1.GAS_CONSTANTS.SIGNATURE_VERIFICATION_COST;
        // Add cost for contract updates
        gasCost += config.pauseLevels[level].requiredSignatures * PauseStructure_1.GAS_CONSTANTS.CONTRACT_UPDATE_COST;
        // Add cost for notifications
        gasCost += PauseStructure_1.GAS_CONSTANTS.NOTIFICATION_COST;
        // Add storage costs
        gasCost += PauseStructure_1.GAS_CONSTANTS.STORAGE_WRITE_COST * 2; // Status update, event update
        // Add event emission cost
        gasCost += PauseStructure_1.GAS_CONSTANTS.EVENT_EMIT_COST * 2; // Resume event, notification event
        return gasCost;
    }
    /**
     * @dev Estimates gas cost for governance operation
     */
    static estimateGovernanceGas(action, signatureCount, config) {
        let gasCost = PauseStructure_1.GAS_CONSTANTS.BASE_RESUME_COST; // Base governance cost
        // Add cost for signature verification
        gasCost += signatureCount * PauseStructure_1.GAS_CONSTANTS.SIGNATURE_VERIFICATION_COST;
        // Add action-specific costs
        switch (action) {
            case PauseStructure_1.GovernanceAction.ADD_MEMBER:
            case PauseStructure_1.GovernanceAction.REMOVE_MEMBER:
                gasCost += PauseStructure_1.GAS_CONSTANTS.STORAGE_WRITE_COST * 2;
                break;
            case PauseStructure_1.GovernanceAction.UPDATE_CONFIG:
                gasCost += PauseStructure_1.GAS_CONSTANTS.STORAGE_WRITE_COST * 3;
                break;
            case PauseStructure_1.GovernanceAction.EMERGENCY_PAUSE:
            case PauseStructure_1.GovernanceAction.EMERGENCY_RESUME:
                gasCost += PauseStructure_1.GAS_CONSTANTS.BASE_PAUSE_COST;
                break;
            case PauseStructure_1.GovernanceAction.TRIGGER_AUTO_RESUME:
                gasCost += PauseStructure_1.GAS_CONSTANTS.BASE_RESUME_COST;
                break;
        }
        // Add event emission cost
        gasCost += PauseStructure_1.GAS_CONSTANTS.EVENT_EMIT_COST;
        return gasCost;
    }
    /**
     * @dev Validates address format
     */
    static isValidAddress(address) {
        // Basic address validation - adjust based on your blockchain requirements
        return typeof address === 'string' &&
            address.length > 0 &&
            address.length <= 42 &&
            /^0x[a-fA-F0-9]*$/.test(address);
    }
    /**
     * @dev Validates signature format
     */
    static isValidSignature(signature) {
        // Basic signature validation - adjust based on your signature scheme
        return typeof signature === 'string' &&
            signature.length > 0 &&
            signature.length <= 132;
    }
    /**
     * @dev Generates pause event ID
     */
    static generatePauseEventId(level, initiator) {
        const timestamp = Math.floor(Date.now() / 1000);
        const random = Math.random().toString(36).substring(2, 8);
        return `pause_${level}_${initiator}_${timestamp}_${random}`;
    }
    /**
     * @dev Formats duration for display
     */
    static formatDuration(seconds) {
        if (seconds < PauseStructure_1.TIME_CONSTANTS.MINUTE) {
            return `${seconds} seconds`;
        }
        else if (seconds < PauseStructure_1.TIME_CONSTANTS.HOUR) {
            return `${Math.floor(seconds / PauseStructure_1.TIME_CONSTANTS.MINUTE)} minutes`;
        }
        else if (seconds < PauseStructure_1.TIME_CONSTANTS.DAY) {
            return `${Math.floor(seconds / PauseStructure_1.TIME_CONSTANTS.HOUR)} hours`;
        }
        else {
            return `${Math.floor(seconds / PauseStructure_1.TIME_CONSTANTS.DAY)} days`;
        }
    }
    /**
     * @dev Calculates emergency response metrics
     */
    static calculateEmergencyMetrics(pauseEvents, notifications) {
        if (pauseEvents.length === 0) {
            return {
                responseTime: 0,
                haltTime: 0,
                resumeTime: 0,
                notificationTime: 0,
                gasEfficiency: 0,
                successRate: 0
            };
        }
        // Calculate average response time (time from threat detection to pause initiation)
        // This would typically come from external monitoring data
        const responseTime = 5000; // 5 seconds target
        // Calculate average halt time (time to halt operations)
        const haltTime = 10000; // 10 seconds target
        // Calculate average resume time
        const completedEvents = pauseEvents.filter(e => e.endTime !== undefined);
        const resumeTime = completedEvents.length > 0 ?
            completedEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / completedEvents.length :
            0;
        // Calculate notification time
        const notificationTime = notifications.length > 0 ?
            notifications.reduce((sum, n) => sum + (n.timestamp - pauseEvents[0].startTime), 0) / notifications.length :
            0;
        // Calculate gas efficiency
        const totalGas = pauseEvents.reduce((sum, e) => sum + e.gasUsed, 0);
        const gasEfficiency = totalGas / pauseEvents.length;
        // Calculate success rate (successful resumes / total pauses)
        const successRate = completedEvents.length / pauseEvents.length;
        return {
            responseTime,
            haltTime,
            resumeTime,
            notificationTime,
            gasEfficiency,
            successRate
        };
    }
}
exports.EmergencyLib = EmergencyLib;
//# sourceMappingURL=EmergencyLib.js.map