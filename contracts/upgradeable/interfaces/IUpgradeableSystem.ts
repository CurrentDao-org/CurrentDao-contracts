/**
 * @title IUpgradeableSystem
 * @dev Interface for upgradeable contract system with proxy patterns
 * @notice Defines the standard interface for upgradeable contracts in CurrentDao
 */
export interface IUpgradeableSystem {
    // Core proxy functionality
    function implementation(): Address;
    function upgradeTo(newImplementation: Address): void;
    function upgradeToAndCall(newImplementation: Address, data: Bytes): void;
    
    // Version management
    function version(): string;
    function getVersionNumber(): u32;
    function getImplementationHistory(): Address[];
    
    // Access control
    function admin(): Address;
    function pendingAdmin(): Address;
    function transferAdminship(newAdmin: Address): void;
    function acceptAdmin(): void;
    
    // Security and validation
    function isUpgradeAllowed(newImplementation: Address): boolean;
    function validateUpgrade(newImplementation: Address): boolean;
    
    // Emergency controls
    function pause(): void;
    function unpause(): void;
    function paused(): boolean;
    
    // Migration support
    function migrateData(fromVersion: u32, toVersion: u32): void;
    function getMigrationStatus(): MigrationStatus;
    
    // Events
    event Upgraded(admin: Address, implementation: Address);
    event AdminChanged(previousAdmin: Address, newAdmin: Address);
    event Paused(admin: Address);
    event Unpaused(admin: Address);
    event MigrationStarted(fromVersion: u32, toVersion: u32);
    event MigrationCompleted(fromVersion: u32, toVersion: u32);
}

/**
 * @title MigrationStatus
 * @dev Status of contract migration process
 */
export interface MigrationStatus {
    isActive: boolean;
    fromVersion: u32;
    toVersion: u32;
    startTime: u64;
    estimatedCompletion: u64;
    progress: u8; // 0-100 percentage
}

/**
 * @title UpgradeProposal
 * @dev Structure for upgrade proposals
 */
export interface UpgradeProposal {
    proposedImplementation: Address;
    proposedVersion: string;
    proposer: Address;
    startTime: u64;
    endTime: u64;
    forVotes: u64;
    againstVotes: u64;
    executed: boolean;
    description: string;
}

/**
 * @title SecurityValidation
 * @dev Security validation results for upgrade
 */
export interface SecurityValidation {
    isValid: boolean;
    issues: string[];
    warnings: string[];
    gasEstimate: u64;
    compatibilityScore: u8; // 0-100
}
