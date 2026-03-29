#!/usr/bin/env node
import { EmergencyConfig } from '../contracts/emergency/structures/PauseStructure';
/**
 * @title Deploy Emergency Contracts
 * @dev Deployment script for emergency pause system
 */
interface DeploymentConfig {
    network: 'development' | 'testnet' | 'mainnet';
    governanceMembers: string[];
    criticalContracts: string[];
    emergencyConfig?: Partial<EmergencyConfig>;
    dryRun?: boolean;
}
interface DeploymentResult {
    success: boolean;
    contractAddress?: string;
    transactionHash?: string;
    gasUsed?: number;
    error?: string;
    deploymentTime: number;
}
/**
 * @deploys emergency contracts with specified configuration
 */
export declare function deployEmergencyContracts(config: DeploymentConfig): Promise<DeploymentResult>;
/**
 * @deploys emergency contracts for different environments
 */
export declare class DeploymentPresets {
    /**
     * @deploys for development environment
     */
    static deployDevelopment(): Promise<DeploymentResult>;
    /**
     * @deploys for testnet environment
     */
    static deployTestnet(): Promise<DeploymentResult>;
    /**
     * @deploys for mainnet environment
     */
    static deployMainnet(): Promise<DeploymentResult>;
}
export {};
//# sourceMappingURL=deploy_emergency.d.ts.map