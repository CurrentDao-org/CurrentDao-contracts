/**
 * @title UpgradeableStructs
 * @dev Data structures for upgradeable contract system
 * @notice Contains all structs and enums used in the upgradeable system
 */

// Core upgrade data structures
export struct ProxyState {
    implementation: Address;
    admin: Address;
    pendingAdmin: Address;
    paused: boolean;
    version: u32;
    initialized: boolean;
}

export struct VersionInfo {
    version: u32;
    implementation: Address;
    upgradeTime: u64;
    blockNumber: u64;
    gasUsed: u64;
}

export struct UpgradeHistory {
    versions: Vec<VersionInfo>;
    totalUpgrades: u32;
    lastUpgradeTime: u64;
}

// Governance structures
export struct VotingPower {
    holder: Address;
    power: u64;
    lastUpdate: u64;
    delegate: Address;
}

export struct Proposal {
    id: u64;
    proposer: Address;
    target: Address;
    value: u64;
    data: Bytes;
    startTime: u64;
    endTime: u64;
    forVotes: u64;
    againstVotes: u64;
    abstainVotes: u64;
    canceled: boolean;
    executed: boolean;
    description: string;
}

export struct Vote {
    voter: Address;
    proposalId: u64;
    support: boolean; // true = for, false = against
    weight: u64;
    timestamp: u64;
}

// Migration structures
export struct MigrationPlan {
    fromVersion: u32;
    toVersion: u32;
    steps: Vec<MigrationStep>;
    startTime: u64;
    estimatedDuration: u64;
    status: MigrationStatus;
}

export struct MigrationStep {
    stepId: u32;
    description: string;
    targetContract: Address;
    functionSelector: Bytes;
    parameters: Bytes;
    gasEstimate: u64;
    completed: boolean;
    timestamp: u64;
}

export enum MigrationStatus {
    NotStarted,
    InProgress,
    Completed,
    Failed,
    Paused
}

// Security structures
export struct SecurityCheck {
    checkType: SecurityCheckType;
    result: boolean;
    message: string;
    severity: Severity;
    timestamp: u64;
}

export enum SecurityCheckType {
    ImplementationValidation,
    AccessControl,
    GasLimit,
    StorageLayout,
    FunctionSignature,
    UpgradeDelay,
    AdminPermissions,
    ProxyCompatibility
}

export enum Severity {
    Low,
    Medium,
    High,
    Critical
}

export struct SecurityReport {
    overallValid: boolean;
    checks: Vec<SecurityCheck>;
    gasEstimate: u64;
    compatibilityScore: u8;
    recommendations: Vec<string>;
    timestamp: u64;
}

// Access control structures
export struct Role {
    role: Bytes;
    adminRole: Bytes;
    members: Vec<Address>;
    grantedAt: u64;
}

export struct Permission {
    contract: Address;
    functionSelector: Bytes;
    allowed: boolean;
    grantedAt: u64;
    expiresAt: u64;
}

// Gas optimization structures
export struct GasMetrics {
    deploymentCost: u64;
    upgradeCost: u64;
    callCost: u64;
    storageCost: u64;
    lastUpdated: u64;
}

export struct OptimizationReport {
    originalGas: u64;
    optimizedGas: u64;
    savings: u64;
    savingsPercentage: u8;
    optimizations: Vec<string>;
}

// State management structures
export struct StateSnapshot {
    version: u32;
    timestamp: u64;
    storageRoot: Bytes;
    contractHash: Bytes;
    checksum: Bytes;
}

export struct RollbackInfo {
    available: boolean;
    targetVersion: u32;
    rollbackData: Bytes;
    deadline: u64;
    initiatedBy: Address;
}

// Monitoring and analytics
export struct UpgradeMetrics {
    totalUpgrades: u32;
    successfulUpgrades: u32;
    failedUpgrades: u32;
    averageUpgradeTime: u64;
    averageGasCost: u64;
    lastUpgradeTimestamp: u64;
}

export struct HealthCheck {
    isHealthy: boolean;
    checks: Vec<HealthCheckItem>;
    lastChecked: u64;
    score: u8; // 0-100
}

export struct HealthCheckItem {
    name: string;
    status: boolean;
    message: string;
    lastChecked: u64;
}

// Configuration structures
export struct UpgradeConfig {
    minDelay: u64; // Minimum delay between upgrade proposal and execution
    maxDelay: u64; // Maximum delay allowed
    timelockWindow: u64; // Window for timelock execution
    requiredVotes: u64; // Minimum votes required for upgrade approval
    voteThreshold: u8; // Percentage threshold for approval (0-100)
    emergencyDelay: u64; // Reduced delay for emergency upgrades
}

export struct ProxyConfig {
    implementation: Address;
    admin: Address;
    initializer: Bytes;
    callData: Bytes;
    salt: Bytes;
}

// Event structures (for efficient storage)
export struct UpgradeEvent {
    admin: Address;
    oldImplementation: Address;
    newImplementation: Address;
    version: u32;
    timestamp: u64;
    gasUsed: u64;
}

export struct AdminChangeEvent {
    previousAdmin: Address;
    newAdmin: Address;
    timestamp: u64;
}

// Utility structures
export struct ByteArray {
    data: Vec<u8>;
    length: u32;
}

export struct AddressArray {
    addresses: Vec<Address>;
    length: u32;
}

// Constants
export const UPGRADEABLE_INTERFACE_ID: u32 = 0x12345678;
export const PROXY_STORAGE_SLOT: u32 = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
export const ADMIN_STORAGE_SLOT: u32 = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

// Error codes
export const ERROR_INVALID_IMPLEMENTATION: u32 = 1001;
export const ERROR_UNAUTHORIZED_ADMIN: u32 = 1002;
export const ERROR_UPGRADE_DELAY_NOT_MET: u32 = 1003;
export const ERROR_INVALID_VERSION: u32 = 1004;
export const ERROR_MIGRATION_FAILED: u32 = 1005;
export const ERROR_SECURITY_CHECK_FAILED: u32 = 1006;
export const ERROR_ALREADY_INITIALIZED: u32 = 1007;
export const ERROR_CONTRACT_PAUSED: u32 = 1008;
