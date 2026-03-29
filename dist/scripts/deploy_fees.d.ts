import { FeeManager } from '../contracts/fees/FeeManager';
/**
 * Deployment script for the Fee Management System
 * This script deploys and configures the complete fee management infrastructure
 */
interface DeploymentConfig {
    network: 'development' | 'testnet' | 'mainnet';
    owner: string;
    treasury: string;
    validators: string;
    developers: string;
    enableDynamicFees: boolean;
    initialNetworkCongestion: number;
}
interface DeploymentResult {
    feeManager: FeeManager;
    config: DeploymentConfig;
    deploymentHash: string;
    timestamp: number;
    gasUsed: number;
}
declare class FeeSystemDeployer {
    private config;
    private deploymentResults;
    constructor(config: DeploymentConfig);
    /**
     * Deploy the complete fee management system
     */
    deploy(): Promise<DeploymentResult>;
    /**
     * Configure fee structures for different transaction types
     */
    private configureFeeStructures;
    /**
     * Setup fee distributions for different transaction types
     */
    private setupFeeDistributions;
    /**
     * Setup fee tiers for different user levels
     */
    private setupFeeTiers;
    /**
     * Create promotional exemptions for testnet/development
     */
    private createPromotionalExemptions;
    /**
     * Generate a unique deployment hash
     */
    private generateDeploymentHash;
    /**
     * Save deployment result to file
     */
    private saveDeploymentResult;
    /**
     * Verify deployment
     */
    verifyDeployment(result: DeploymentResult): Promise<boolean>;
}
export { FeeSystemDeployer, DeploymentConfig, DeploymentResult };
//# sourceMappingURL=deploy_fees.d.ts.map