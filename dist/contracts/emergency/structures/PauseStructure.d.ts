/**
 * @title PauseStructure
 * @dev Data structures for emergency pause system
 */
/**
 * @dev Pause levels with different scopes and impacts
 */
export declare enum PauseLevel {
    NONE = 0,// No pause active
    SELECTIVE = 1,// Pause specific contracts
    PARTIAL = 2,// Pause critical functions only
    FULL = 3
}
/**
 * @dev Pause status information
 */
export interface PauseStatus {
    level: PauseLevel;
    isActive: boolean;
    startTime: number;
    duration: number;
    reason: string;
    initiator: string;
    affectedContracts: string[];
    autoResumeTime: number;
    lastUpdateTime: number;
}
/**
 * @dev Emergency configuration
 */
export interface EmergencyConfig {
    requiredSignatures: number;
    maxPauseDuration: number;
    autoResumeEnabled: boolean;
    notificationThreshold: number;
    gasOptimizationLevel: number;
    governanceMembers: string[];
    criticalContracts: string[];
    pauseLevels: {
        [key in PauseLevel]: {
            requiredSignatures: number;
            maxDuration: number;
            autoResumeEnabled: boolean;
        };
    };
}
/**
 * @dev Pause event for analytics
 */
export interface PauseEvent {
    id: string;
    level: PauseLevel;
    startTime: number;
    endTime?: number;
    duration?: number;
    reason: string;
    initiator: string;
    affectedContracts: string[];
    resumeSignatures: string[];
    autoResumed: boolean;
    gasUsed: number;
}
/**
 * @dev Governance actions
 */
export declare enum GovernanceAction {
    ADD_MEMBER = 0,
    REMOVE_MEMBER = 1,
    UPDATE_CONFIG = 2,
    EMERGENCY_PAUSE = 3,
    EMERGENCY_RESUME = 4,
    TRIGGER_AUTO_RESUME = 5
}
/**
 * @dev Governance proposal
 */
export interface GovernanceProposal {
    id: string;
    action: GovernanceAction;
    proposer: string;
    targetLevel?: PauseLevel;
    targetConfig?: Partial<EmergencyConfig>;
    targetMember?: string;
    signatures: string[];
    timestamp: number;
    executed: boolean;
    executionTime?: number;
}
/**
 * @dev Notification data
 */
export interface NotificationData {
    type: 'EMERGENCY_PAUSE' | 'EMERGENCY_RESUME' | 'AUTO_RESUME' | 'GOVERNANCE_ACTION';
    level: PauseLevel;
    timestamp: number;
    message: string;
    affectedContracts: string[];
    initiator: string;
    additionalData?: Record<string, any>;
}
/**
 * @dev Gas optimization data
 */
export interface GasOptimizationData {
    pauseBaseCost: number;
    resumeBaseCost: number;
    notificationBaseCost: number;
    signatureVerificationCost: number;
    contractUpdateCost: number;
    totalOptimizedCost: number;
}
/**
 * @dev Analytics data
 */
export interface PauseAnalytics {
    totalPauses: number;
    totalDuration: number;
    averageDuration: number;
    pauseFrequency: number;
    lastPauseTime: number;
    pauseByLevel: {
        [key in PauseLevel]: number;
    };
    pauseByReason: Record<string, number>;
    gasUsage: {
        total: number;
        average: number;
        byAction: Record<string, number>;
    };
    governanceActivity: {
        totalProposals: number;
        executedProposals: number;
        averageExecutionTime: number;
    };
}
/**
 * @dev Contract pause state
 */
export interface ContractPauseState {
    contractAddress: string;
    isPaused: boolean;
    pauseLevel: PauseLevel;
    pauseTime: number;
    expectedResumeTime: number;
    pauseReason: string;
    functionsPaused: string[];
}
/**
 * @dev Multi-signature data
 */
export interface MultiSignatureData {
    signatures: string[];
    signers: string[];
    threshold: number;
    data: string;
    hash: string;
}
/**
 * @dev Emergency response metrics
 */
export interface EmergencyMetrics {
    responseTime: number;
    haltTime: number;
    resumeTime: number;
    notificationTime: number;
    gasEfficiency: number;
    successRate: number;
}
/**
 * @dev Validation results
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    gasEstimate: number;
}
/**
 * @dev Default emergency configuration
 */
export declare const DEFAULT_EMERGENCY_CONFIG: EmergencyConfig;
/**
 * @dev Gas optimization constants
 */
export declare const GAS_CONSTANTS: {
    BASE_PAUSE_COST: number;
    BASE_RESUME_COST: number;
    SIGNATURE_VERIFICATION_COST: number;
    CONTRACT_UPDATE_COST: number;
    NOTIFICATION_COST: number;
    STORAGE_WRITE_COST: number;
    EVENT_EMIT_COST: number;
};
/**
 * @dev Time constants
 */
export declare const TIME_CONSTANTS: {
    SECOND: number;
    MINUTE: number;
    HOUR: number;
    DAY: number;
    WEEK: number;
};
/**
 * @dev Validation constants
 */
export declare const VALIDATION_CONSTANTS: {
    MAX_REASON_LENGTH: number;
    MAX_SIGNATURES: number;
    MIN_SIGNATURES: number;
    MAX_GOVERNANCE_MEMBERS: number;
    MIN_GOVERNANCE_MEMBERS: number;
};
//# sourceMappingURL=PauseStructure.d.ts.map