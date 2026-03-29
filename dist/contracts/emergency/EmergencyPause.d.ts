import { PauseLevel, PauseStatus, PauseEvent, EmergencyConfig, GovernanceAction, ContractPauseState, NotificationData, EmergencyMetrics } from './structures/PauseStructure';
import { IEmergencyPause, EmergencyPauseEvents } from './interfaces/IEmergencyPause';
/**
 * @title EmergencyPause
 * @dev Main emergency pause contract providing rapid security response
 */
export declare class EmergencyPause implements IEmergencyPause {
    private config;
    private governance;
    private pauseStatus;
    private pauseEvents;
    private contractStates;
    private notifications;
    private eventHandlers;
    constructor(initialGovernanceMembers: string[], initialConfig?: Partial<EmergencyConfig>, eventHandlers?: EmergencyPauseEvents);
    /**
     * @dev Initiates emergency pause at specified level
     */
    emergencyPause(level: PauseLevel, reason: string, duration: number, affectedContracts: string[]): Promise<void>;
    /**
     * @dev Resumes operations after emergency pause
     */
    resumeOperations(level: PauseLevel, signatures: string[], proof: string): Promise<void>;
    /**
     * @dev Gets current pause status
     */
    getPauseStatus(): Promise<PauseStatus>;
    /**
     * @dev Gets pause configuration
     */
    getEmergencyConfig(): Promise<EmergencyConfig>;
    /**
     * @dev Updates emergency configuration
     */
    updateEmergencyConfig(config: EmergencyConfig, signatures: string[]): Promise<void>;
    /**
     * @dev Gets pause analytics
     */
    getPauseAnalytics(): Promise<{
        totalPauses: number;
        averageDuration: number;
        pauseFrequency: number;
        lastPauseTime: number;
        pauseHistory: PauseEvent[];
    }>;
    /**
     * @dev Checks if specific contract is paused
     */
    isContractPaused(contractAddress: string): Promise<boolean>;
    /**
     * @dev Gets affected contracts for specific pause level
     */
    getAffectedContracts(level: PauseLevel): Promise<string[]>;
    /**
     * @dev Triggers auto-resume if conditions met
     */
    triggerAutoResume(): Promise<void>;
    /**
     * @dev Adds governance member
     */
    addGovernanceMember(memberAddress: string, signatures: string[]): Promise<void>;
    /**
     * @dev Removes governance member
     */
    removeGovernanceMember(memberAddress: string, signatures: string[]): Promise<void>;
    /**
     * @dev Validates governance action
     */
    validateGovernanceAction(action: GovernanceAction, signatures: string[]): Promise<boolean>;
    /**
     * @dev Emits pause notification
     */
    emitPauseNotification(level: PauseLevel, reason: string, affectedContracts: string[]): Promise<void>;
    /**
     * @dev Gets gas optimization data
     */
    getGasOptimizationData(): Promise<{
        pauseGasCost: number;
        resumeGasCost: number;
        notificationGasCost: number;
    }>;
    /**
     * @dev Updates contract states based on pause level
     */
    private updateContractStates;
    /**
     * @dev Resumes contract states
     */
    private resumeContractStates;
    /**
     * @dev Gets default event handlers
     */
    private getDefaultEventHandlers;
    /**
     * @dev Gets emergency metrics
     */
    getEmergencyMetrics(): EmergencyMetrics;
    /**
     * @dev Gets contract pause state
     */
    getContractPauseState(contractAddress: string): ContractPauseState | undefined;
    /**
     * @dev Gets all notifications
     */
    getNotifications(): NotificationData[];
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
     * @dev Checks if auto-resume should be triggered
     */
    shouldAutoResume(): boolean;
}
//# sourceMappingURL=EmergencyPause.d.ts.map