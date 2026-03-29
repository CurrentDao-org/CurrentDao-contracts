import { OracleMetadata } from '../contracts/oracle/interfaces/IPriceOracle';
import { DeviationThreshold } from '../contracts/oracle/structures/OracleStructure';
declare const DEPLOYMENT_CONFIG: {
    owner: string;
    network: string;
    gasLimit: number;
    gasPrice: number;
};
declare const PRODUCTION_CONFIG: {
    gasOptimization: boolean;
    automatedUpdates: boolean;
    securityChecks: boolean;
    monitoringEnabled: boolean;
    backupOracles: boolean;
    circuitBreaker: boolean;
    confidenceThreshold: number;
    maxGasPrice: number;
    gasMultiplier: number;
    owner: string;
    network: string;
    gasLimit: number;
    gasPrice: number;
};
declare const PRODUCTION_ORACLE_CONFIGS: {
    address: string;
    metadata: OracleMetadata;
}[];
declare const PRODUCTION_DEVIATION_THRESHOLDS: {
    assetId: string;
    threshold: DeviationThreshold;
}[];
/**
 * Main deployment function with production enhancements
 */
declare function deployPriceOracle(): Promise<void>;
/**
 * Deploy to testnet
 */
declare function deployToTestnet(): Promise<void>;
/**
 * Deploy to production with enhanced security
 */
declare function deployToProduction(): Promise<void>;
/**
 * Perform comprehensive security audit
 */
declare function performSecurityAudit(): Promise<void>;
/**
 * Update oracle configurations
 */
declare function updateOracleConfigurations(): Promise<void>;
/**
 * Health check function
 */
declare function healthCheck(): Promise<void>;
export { deployPriceOracle, deployToTestnet, deployToMainnet, deployToProduction, updateOracleConfigurations, healthCheck, performSecurityAudit, DEPLOYMENT_CONFIG, PRODUCTION_CONFIG, PRODUCTION_ORACLE_CONFIGS, PRODUCTION_DEVIATION_THRESHOLDS };
//# sourceMappingURL=deploy_oracle.d.ts.map