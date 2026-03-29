import { BatchProcessor } from '../contracts/batching/BatchProcessor';
import { BatchConfig } from '../contracts/batching/structures/BatchStructure';
/**
 * Deployment script for the Transaction Batch Processor
 * This script deploys and configures the BatchProcessor contract
 */
interface DeploymentConfig {
    network: 'testnet' | 'mainnet' | 'localhost';
    adminAddress: string;
    gasOptimizationEnabled: boolean;
    emergencyControls: boolean;
    maxBatchSize: number;
    targetGasSavings: number;
}
/**
 * Deploys the BatchProcessor contract with the specified configuration
 */
declare function deployBatchProcessor(config: DeploymentConfig): Promise<{
    processor: BatchProcessor;
    deploymentAddress: string;
    deploymentHash: string;
    config: BatchConfig;
}>;
/**
 * Verifies the deployment by checking contract functionality
 */
declare function verifyDeployment(processor: BatchProcessor, deploymentAddress: string, config: DeploymentConfig): Promise<boolean>;
/**
 * Sets up event listeners for monitoring
 */
declare function setupEventListeners(processor: BatchProcessor): void;
export { deployBatchProcessor, verifyDeployment, setupEventListeners };
export type { DeploymentConfig };
//# sourceMappingURL=deploy_batching.d.ts.map