import { UsageAnalytics } from '../contracts/analytics/UsageAnalytics';
import { AnalyticsConfiguration } from '../contracts/analytics/structures/UsageStructure';
export interface DeploymentConfig {
    network: 'development' | 'testnet' | 'mainnet';
    owner: string;
    analyticsConfig?: Partial<AnalyticsConfiguration>;
    dryRun?: boolean;
}
export interface DeploymentResult {
    success: boolean;
    contractAddress?: string;
    transactionHash?: string;
    gasUsed?: number;
    error?: string;
    deploymentTime: number;
    network: string;
}
export declare class UsageAnalyticsDeployer {
    private config;
    private deploymentHash;
    constructor(config: DeploymentConfig);
    /**
     * Deploys the UsageAnalytics contract
     */
    deploy(): Promise<DeploymentResult>;
    /**
     * Verifies the deployment configuration and contract state
     */
    verifyDeployment(contract: UsageAnalytics, config?: AnalyticsConfiguration, deploymentHash?: string, timestamp?: number, gasUsed?: number): Promise<boolean>;
    /**
     * Upgrades the contract (for future versions)
     */
    upgrade(newConfig?: Partial<AnalyticsConfiguration>): Promise<DeploymentResult>;
    /**
     * Gets deployment status and information
     */
    getDeploymentInfo(): {
        config: DeploymentConfig;
        deploymentHash: string;
        estimatedGas: number;
        networkDetails: any;
    };
    private validateConfiguration;
    private prepareDeploymentParameters;
    private executeDeployment;
    private runPostDeploymentTests;
    private simulateDeployment;
    private getNetworkSpecificConfig;
    private getNetworkDetails;
    private getChainId;
    private getGasPrice;
    private getBlockTime;
    private getMaxGasLimit;
    private estimateGasUsage;
    private generateContractAddress;
    private generateTransactionHash;
    private generateDeploymentHash;
    private isValidAddress;
}
export declare function deployUsageAnalytics(config: DeploymentConfig): Promise<void>;
//# sourceMappingURL=deploy_usage_analytics.d.ts.map