import { PauseLevel, PauseStatus, PauseEvent, EmergencyConfig, GovernanceAction, PauseAnalytics, NotificationData, EmergencyMetrics, ValidationResult } from '../structures/PauseStructure';
/**
 * @title EmergencyLib
 * @dev Core library for emergency pause operations and utilities
 */
export declare class EmergencyLib {
    /**
     * @dev Validates pause request parameters
     */
    static validatePauseRequest(level: PauseLevel, reason: string, duration: number, affectedContracts: string[], config: EmergencyConfig): ValidationResult;
    /**
     * @dev Validates resume request parameters
     */
    static validateResumeRequest(level: PauseLevel, signatures: string[], currentStatus: PauseStatus, config: EmergencyConfig): ValidationResult;
    /**
     * @dev Validates governance action
     */
    static validateGovernanceAction(action: GovernanceAction, signatures: string[], config: EmergencyConfig): ValidationResult;
    /**
     * @dev Creates pause status object
     */
    static createPauseStatus(level: PauseLevel, reason: string, duration: number, initiator: string, affectedContracts: string[], config: EmergencyConfig): PauseStatus;
    /**
     * @dev Creates pause event for analytics
     */
    static createPauseEvent(status: PauseStatus, id: string, gasUsed: number): PauseEvent;
    /**
     * @dev Updates pause event with resume data
     */
    static updatePauseEventWithResume(event: PauseEvent, signatures: string[], autoResumed: boolean, gasUsed: number): PauseEvent;
    /**
     * @dev Creates notification data
     */
    static createNotificationData(type: NotificationData['type'], level: PauseLevel, message: string, affectedContracts: string[], initiator: string, additionalData?: Record<string, any>): NotificationData;
    /**
     * @dev Calculates pause analytics
     */
    static calculateAnalytics(events: PauseEvent[]): PauseAnalytics;
    /**
     * @dev Checks if auto-resume conditions are met
     */
    static shouldAutoResume(status: PauseStatus, config: EmergencyConfig): boolean;
    /**
     * @dev Estimates gas cost for pause operation
     */
    static estimatePauseGas(level: PauseLevel, contractCount: number, config: EmergencyConfig): number;
    /**
     * @dev Estimates gas cost for resume operation
     */
    static estimateResumeGas(level: PauseLevel, signatureCount: number, config: EmergencyConfig): number;
    /**
     * @dev Estimates gas cost for governance operation
     */
    static estimateGovernanceGas(action: GovernanceAction, signatureCount: number, config: EmergencyConfig): number;
    /**
     * @dev Validates address format
     */
    static isValidAddress(address: string): boolean;
    /**
     * @dev Validates signature format
     */
    static isValidSignature(signature: string): boolean;
    /**
     * @dev Generates pause event ID
     */
    static generatePauseEventId(level: PauseLevel, initiator: string): string;
    /**
     * @dev Formats duration for display
     */
    static formatDuration(seconds: number): string;
    /**
     * @dev Calculates emergency response metrics
     */
    static calculateEmergencyMetrics(pauseEvents: PauseEvent[], notifications: NotificationData[]): EmergencyMetrics;
}
//# sourceMappingURL=EmergencyLib.d.ts.map