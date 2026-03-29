/**
 * @title Deploy Security Contracts
 * @dev Deployment script for the comprehensive access control system
 * @dev Sets up initial roles, permissions, and multi-signature requirements
 */
import { AccessControl } from "../contracts/security/AccessControl";
interface DeploymentConfig {
    network: string;
    adminAddress: string;
    initialOperators: string[];
    initialUsers: string[];
    multiSigRequirements: Map<string, number>;
}
interface DeploymentResult {
    accessControl: AccessControl;
    transactionHash: string;
    contractAddress: string;
    gasUsed: number;
}
declare class SecurityDeployer {
    private config;
    constructor(config: DeploymentConfig);
    /**
     * @deploys the complete security system
     */
    deploy(): Promise<DeploymentResult>;
    /**
     * @dev Setup initial role hierarchy
     */
    private setupInitialRoles;
    /**
     * @dev Setup permissions for each role
     */
    private setupPermissions;
    /**
     * @dev Setup multi-signature requirements for critical operations
     */
    private setupMultiSigRequirements;
    /**
     * @dev Grant initial roles to specified addresses
     */
    private grantInitialRoles;
    /**
     * @dev Generate mock transaction hash for simulation
     */
    private generateTransactionHash;
    /**
     * @dev Generate mock contract address for simulation
     */
    private generateContractAddress;
    /**
     * @dev Estimate gas usage for deployment
     */
    private estimateGasUsage;
    /**
     * @dev Log deployment summary
     */
    private logDeploymentSummary;
    /**
     * @dev Verify deployment by checking key functions
     */
    verifyDeployment(accessControl: AccessControl): Promise<boolean>;
}
/**
 * @dev Utility function to create deployment config from environment variables
 */
export declare function createConfigFromEnv(network: string): DeploymentConfig;
export { SecurityDeployer, DeploymentConfig, DeploymentResult };
//# sourceMappingURL=deploy_security.d.ts.map