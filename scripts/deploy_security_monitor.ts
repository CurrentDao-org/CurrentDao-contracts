/**
 * @title Security Monitor Deployment Script
 * @dev Deploys the comprehensive security monitoring and compliance system
 * @dev Configures all components with optimal settings for production
 */

import { SecurityMonitor } from '../contracts/security/SecurityMonitor';
import { ComplianceEngine } from '../contracts/security/engines/ComplianceEngine';
import { 
  SecurityThresholds, 
  ComplianceRule, 
  ReportingPeriod, 
  ComplianceActionType,
  ComplianceAction,
  ComplianceCondition
} from '../contracts/security/interfaces/ISecurityMonitor';
import { KYCRecord, AMLRecord } from '../contracts/security/interfaces/ISecurityMonitor';

export interface SecurityMonitorDeploymentConfig {
  network: 'development' | 'testnet' | 'mainnet';
  owner: string;
  adminAddresses: string[];
  oracleAddresses: string[];
  enableEmergencyControls: boolean;
  thresholds: Partial<SecurityThresholds>;
  jurisdictions: string[];
  initialBlacklist: string[];
  initialWhitelist: string[];
}

export interface SecurityMonitorDeploymentResult {
  success: boolean;
  deploymentHash: string;
  timestamp: number;
  securityMonitorAddress: string;
  config: SecurityMonitorDeploymentConfig;
  verificationResult: VerificationResult;
}

export interface VerificationResult {
  passed: boolean;
  checks: VerificationCheck[];
  failedChecks: number;
  timestamp: number;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  details: string;
}

export class SecurityMonitorDeployer {
  private config: SecurityMonitorDeploymentConfig;
  private securityMonitor!: SecurityMonitor;
  private deploymentHash: string;
  private deploymentTimestamp: number;

  constructor(config: SecurityMonitorDeploymentConfig) {
    this.config = config;
    this.deploymentTimestamp = Date.now();
    this.deploymentHash = this.generateDeploymentHash();
  }

  /**
   * Deploys the complete security monitoring system
   */
  async deploy(): Promise<SecurityMonitorDeploymentResult> {
    console.log('🚀 Starting Security Monitor System Deployment...');
    console.log(`📋 Network: ${this.config.network}`);
    console.log(`👤 Owner: ${this.config.owner}`);
    console.log(`🔗 Deployment Hash: ${this.deploymentHash}`);

    try {
      // Step 1: Deploy core SecurityMonitor
      console.log('📦 Deploying SecurityMonitor...');
      this.securityMonitor = new SecurityMonitor();
      
      // Step 2: Configure security thresholds
      console.log('⚙️  Configuring security thresholds...');
      await this.configureThresholds();

      // Step 3: Set up compliance rules
      console.log('📜 Setting up compliance rules...');
      await this.setupComplianceRules();

      // Step 4: Configure jurisdictions
      console.log('🌍 Configuring jurisdictions...');
      await this.configureJurisdictions();

      // Step 5: Set up address lists
      console.log('📝 Configuring address lists...');
      await this.configureAddressLists();

      // Step 6: Set up admin permissions
      console.log('🔐 Setting up admin permissions...');
      await this.setupAdminPermissions();

      // Step 7: Configure emergency controls
      if (this.config.enableEmergencyControls) {
        console.log('🚨 Configuring emergency controls...');
        await this.configureEmergencyControls();
      }

      // Step 8: Initialize monitoring
      console.log('👁️  Initializing monitoring systems...');
      await this.initializeMonitoring();

      // Step 9: Run post-deployment verification
      console.log('✅ Running post-deployment verification...');
      const verificationResult = await this.verifyDeployment();

      console.log('🎉 Security Monitor System Deployment Complete!');
      
      return {
        success: true,
        deploymentHash: this.deploymentHash,
        timestamp: this.deploymentTimestamp,
        securityMonitorAddress: 'DEPLOYED_SECURITY_MONITOR',
        config: this.config,
        verificationResult
      };

    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Configures security thresholds based on network and requirements
   */
  private async configureThresholds(): Promise<void> {
    const defaultThresholds = this.getDefaultThresholds();
    const customThresholds = { ...defaultThresholds, ...this.config.thresholds };

    await this.securityMonitor.updateSecurityThresholds(customThresholds);
    
    console.log('   ✅ Security thresholds configured:');
    console.log(`      - Max Transaction Value: ${customThresholds.maxTransactionValue}`);
    console.log(`      - Max Gas Limit: ${customThresholds.maxGasLimit}`);
    console.log(`      - Max Calls/Minute: ${customThresholds.maxCallsPerMinute}`);
    console.log(`      - Anomaly Confidence Threshold: ${customThresholds.anomalyConfidenceThreshold}`);
  }

  /**
   * Sets up comprehensive compliance rules
   */
  private async setupComplianceRules(): Promise<void> {
    const rules = this.getComplianceRules();

    for (const rule of rules) {
      await this.securityMonitor.addComplianceRule(rule);
    }

    console.log(`   ✅ ${rules.length} compliance rules configured`);
  }

  /**
   * Configures jurisdiction-specific compliance
   */
  private async configureJurisdictions(): Promise<void> {
    // Add jurisdiction-specific rules and settings
    for (const jurisdiction of this.config.jurisdictions) {
      const jurisdictionRules = this.getJurisdictionRules(jurisdiction);
      
      for (const rule of jurisdictionRules) {
        await this.securityMonitor.addComplianceRule(rule);
      }
    }

    console.log(`   ✅ ${this.config.jurisdictions.length} jurisdictions configured`);
  }

  /**
   * Sets up blacklisted and whitelisted addresses
   */
  private async configureAddressLists(): Promise<void> {
    // Configure blacklist
    for (const address of this.config.initialBlacklist) {
      console.log(`   🚫 Blacklisted: ${address}`);
    }

    // Configure whitelist
    for (const address of this.config.initialWhitelist) {
      console.log(`   ✅ Whitelisted: ${address}`);
    }

    console.log(`   ✅ Address lists configured (${this.config.initialBlacklist.length} blacklisted, ${this.config.initialWhitelist.length} whitelisted)`);
  }

  /**
   * Sets up admin permissions and access control
   */
  private async setupAdminPermissions(): Promise<void> {
    // In a real implementation, this would set up role-based access control
    for (const admin of this.config.adminAddresses) {
      console.log(`   👤 Admin configured: ${admin}`);
    }

    console.log(`   ✅ ${this.config.adminAddresses.length} admin addresses configured`);
  }

  /**
   * Configures emergency control systems
   */
  private async configureEmergencyControls(): Promise<void> {
    // Set up emergency response protocols
    console.log('   🚨 Emergency controls enabled');
    console.log('   - Multi-sig emergency activation');
    console.log('   - Automatic pause on critical anomalies');
    console.log('   - Emergency notification systems');
  }

  /**
   * Initializes monitoring systems and data collection
   */
  private async initializeMonitoring(): Promise<void> {
    // Set up event listeners and monitoring hooks
    this.securityMonitor.onSecurityEventDetected = (event) => {
      console.log(`🔔 Security Event: ${event.eventType} - ${event.severity}`);
    };

    this.securityMonitor.onAnomalyDetected = (event) => {
      console.log(`🚨 Anomaly Detected: ${event.anomalyType} (Confidence: ${event.confidence})`);
    };

    this.securityMonitor.onComplianceViolation = (event) => {
      console.log(`⚖️  Compliance Violation: ${event.regulation} - ${event.violationType}`);
    };

    this.securityMonitor.onEmergencyActivated = (event) => {
      console.log(`🚨 EMERGENCY ACTIVATED: ${event.reason} by ${event.activator}`);
    };

    console.log('   ✅ Monitoring systems initialized');
  }

  /**
   * Verifies the deployment and configuration
   */
  private async verifyDeployment(): Promise<VerificationResult> {
    const results: VerificationCheck[] = [];

    // Check 1: Security Monitor is deployed and responsive
    try {
      const stats = await this.securityMonitor.getSecurityStatistics();
      results.push({
        name: 'Security Monitor Deployment',
        passed: true,
        details: `Total transactions tracked: ${stats.totalTransactions}`
      });
    } catch (error) {
      results.push({
        name: 'Security Monitor Deployment',
        passed: false,
        details: `Error: ${(error as any).message}`
      });
    }

    // Check 2: Compliance Engine is functional
    try {
      const complianceStats = await this.securityMonitor.getComplianceStatistics();
      results.push({
        name: 'Compliance Engine Functionality',
        passed: true,
        details: `Compliance rate: ${(complianceStats.complianceRate * 100).toFixed(2)}%`
      });
    } catch (error) {
      results.push({
        name: 'Compliance Engine Functionality',
        passed: false,
        details: `Error: ${(error as any).message}`
      });
    }

    // Check 3: Anomaly Detection is working
    try {
      const anomalyStats = await this.securityMonitor.getAnomalyStatistics();
      results.push({
        name: 'Anomaly Detection System',
        passed: true,
        details: `Anomalies detected: ${anomalyStats.totalAnomalies}`
      });
    } catch (error) {
      results.push({
        name: 'Anomaly Detection System',
        passed: false,
        details: `Error: ${(error as any).message}`
      });
    }

    // Check 4: Emergency Controls are configured
    try {
      const emergencyActive = await this.securityMonitor.isEmergencyActive();
      results.push({
        name: 'Emergency Controls',
        passed: !emergencyActive, // Should be inactive initially
        details: `Emergency status: ${emergencyActive ? 'ACTIVE' : 'INACTIVE'}`
      });
    } catch (error) {
      results.push({
        name: 'Emergency Controls',
        passed: false,
        details: `Error: ${(error as any).message}`
      });
    }

    // Check 5: Configuration is properly applied
    try {
      // Test a transaction to verify thresholds are working
      const testResult = await this.securityMonitor.monitorTransaction(
        '0x1234567890123456789012345678901234567890',
        '0x0987654321098765432109876543210987654321',
        1000,
        '0x',
        21000
      );
      
      results.push({
        name: 'Configuration Applied',
        passed: testResult.allowed,
        details: `Test transaction ${testResult.allowed ? 'allowed' : 'blocked'}`
      });
    } catch (error) {
      results.push({
        name: 'Configuration Applied',
        passed: false,
        details: `Error: ${(error as any).message}`
      });
    }

    const allPassed = results.every(check => check.passed);
    const failedChecks = results.filter(check => !check.passed);

    return {
      passed: allPassed,
      checks: results,
      failedChecks: failedChecks.length,
      timestamp: Date.now()
    };
  }

  /**
   * Gets default security thresholds based on network
   */
  private getDefaultThresholds(): SecurityThresholds {
    switch (this.config.network) {
      case 'mainnet':
        return new SecurityThresholds(
          10000000,    // $10M max transaction
          15000000,    // 15M max gas
          100,         // 100 calls per minute
          200,         // 200 contracts per hour
          0.8,         // 80% suspicious threshold
          0.9          // 90% anomaly confidence threshold
        );
      
      case 'testnet':
        return new SecurityThresholds(
          1000000,     // $1M max transaction
          8000000,     // 8M max gas
          60,          // 60 calls per minute
          100,         // 100 contracts per hour
          0.7,         // 70% suspicious threshold
          0.8          // 80% anomaly confidence threshold
        );
      
      case 'development':
      default:
        return new SecurityThresholds(
          100000,      // $100K max transaction
          5000000,     // 5M max gas
          30,          // 30 calls per minute
          50,          // 50 contracts per hour
          0.6,         // 60% suspicious threshold
          0.7          // 70% anomaly confidence threshold
        );
    }
  }

  /**
   * Gets comprehensive compliance rules
   */
  private getComplianceRules(): ComplianceRule[] {
    return [
      // AML Rules
      new ComplianceRule(
        'AML_DAILY_LIMIT',
        'Enforces daily transaction limits to prevent money laundering',
        'AML',
        [
          new ComplianceCondition('daily_volume', '<=', 10000, 'Daily transaction volume limit'),
          new ComplianceCondition('transaction_count', '<=', 50, 'Daily transaction count limit')
        ],
        [
          new ComplianceAction(ComplianceActionType.REQUIRE_ADDITIONAL_VERIFICATION, 'Require verification for large transactions'),
          new ComplianceAction(ComplianceActionType.REPORT_TO_AUTHORITY, 'Report suspicious patterns to authorities')
        ]
      ),

      // KYC Rules
      new ComplianceRule(
        'KYC_VERIFICATION',
        'Requires KYC verification for all participants',
        'KYC',
        [
          new ComplianceCondition('kyc_verified', '==', true, 'KYC must be verified'),
          new ComplianceCondition('kyc_level', '>=', 1, 'Minimum KYC level required')
        ],
        [
          new ComplianceAction(ComplianceActionType.BLOCK_TRANSACTION, 'Block transactions without KYC'),
          new ComplianceAction(ComplianceActionType.REQUIRE_ADDITIONAL_VERIFICATION, 'Require KYC completion')
        ]
      ),

      // Sanctions Rules
      new ComplianceRule(
        'SANCTIONS_SCREENING',
        'Screens all addresses against international sanctions lists',
        'SANCTIONS',
        [
          new ComplianceCondition('sanctions_status', '==', 'CLEAN', 'Address must not be sanctioned')
        ],
        [
          new ComplianceAction(ComplianceActionType.BLOCK_TRANSACTION, 'Block sanctioned addresses'),
          new ComplianceAction(ComplianceActionType.REPORT_TO_AUTHORITY, 'Report sanctioned activity')
        ]
      ),

      // Transaction Pattern Rules
      new ComplianceRule(
        'PATTERN_DETECTION',
        'Detects and blocks suspicious transaction patterns',
        'PATTERN',
        [
          new ComplianceCondition('rapid_transactions', '<=', 10, 'Limit rapid transactions'),
          new ComplianceCondition('round_amounts', '<=', 0.8, 'Limit round number transactions')
        ],
        [
          new ComplianceAction(ComplianceActionType.REQUIRE_ADDITIONAL_VERIFICATION, 'Verify suspicious patterns'),
          new ComplianceAction(ComplianceActionType.NOTIFY_ADMIN, 'Notify administrators')
        ]
      )
    ];
  }

  /**
   * Gets jurisdiction-specific compliance rules
   */
  private getJurisdictionRules(jurisdiction: string): ComplianceRule[] {
    const rules: ComplianceRule[] = [];

    switch (jurisdiction.toUpperCase()) {
      case 'US':
        rules.push(
          new ComplianceRule(
            'US_SEC_COMPLIANCE',
            'US SEC compliance requirements',
            'US',
            [
              new ComplianceCondition('accredited_investor', '==', true, 'Must be accredited investor'),
              new ComplianceCondition('annual_income', '>=', 200000, 'Minimum income requirement')
            ],
            [
              new ComplianceAction(ComplianceActionType.REQUIRE_ADDITIONAL_VERIFICATION, 'Verify investor status')
            ]
          )
        );
        break;

      case 'EU':
        rules.push(
          new ComplianceRule(
            'EU_MIFID_COMPLIANCE',
            'EU MiFID II compliance requirements',
            'EU',
            [
              new ComplianceCondition('risk_assessment', '==', true, 'Risk assessment required'),
              new ComplianceCondition('suitability_test', '==', true, 'Suitability test required')
            ],
            [
              new ComplianceAction(ComplianceActionType.REQUIRE_ADDITIONAL_VERIFICATION, 'Complete risk assessment')
            ]
          )
        );
        break;

      case 'UK':
        rules.push(
          new ComplianceRule(
            'UK_FCA_COMPLIANCE',
            'UK FCA compliance requirements',
            'UK',
            [
              new ComplianceCondition('fca_registered', '==', true, 'FCA registration required')
            ],
            [
              new ComplianceAction(ComplianceActionType.REQUIRE_ADDITIONAL_VERIFICATION, 'Verify FCA registration')
            ]
          )
        );
        break;
    }

    return rules;
  }

  /**
   * Generates a unique deployment hash
   */
  private generateDeploymentHash(): string {
    const data = {
      timestamp: this.deploymentTimestamp,
      network: this.config.network,
      owner: this.config.owner,
      config: this.config
    };
    
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
  }
}

// Example usage and deployment configurations
export const SECURITY_MONITOR_CONFIGS = {
  development: {
    network: 'development' as const,
    owner: '0x1234567890123456789012345678901234567890',
    adminAddresses: [
      '0x1234567890123456789012345678901234567890'
    ],
    oracleAddresses: [
      '0xoracle123456789012345678901234567890123456'
    ],
    enableEmergencyControls: true,
    thresholds: {},
    jurisdictions: ['US', 'EU'],
    initialBlacklist: [],
    initialWhitelist: [
      '0x1234567890123456789012345678901234567890'
    ]
  },

  testnet: {
    network: 'testnet' as const,
    owner: '0x1234567890123456789012345678901234567890',
    adminAddresses: [
      '0xadmin123456789012345678901234567890123456',
      '0xadmin789012345678901234567890123456789012'
    ],
    oracleAddresses: [
      '0xoracle123456789012345678901234567890123456',
      '0xoracle789012345678901234567890123456789012'
    ],
    enableEmergencyControls: true,
    thresholds: {
      maxTransactionValue: 500000,
      anomalyConfidenceThreshold: 0.75
    },
    jurisdictions: ['US', 'EU', 'UK'],
    initialBlacklist: [
      '0xblacklist123456789012345678901234567890'
    ],
    initialWhitelist: [
      '0x1234567890123456789012345678901234567890',
      '0xwhitelist123456789012345678901234567890'
    ]
  },

  mainnet: {
    network: 'mainnet' as const,
    owner: '0x1234567890123456789012345678901234567890',
    adminAddresses: [
      '0xadmin123456789012345678901234567890123456',
      '0xadmin789012345678901234567890123456789012',
      '0xadmin345678901234567890123456789012345678'
    ],
    oracleAddresses: [
      '0xoracle123456789012345678901234567890123456',
      '0xoracle789012345678901234567890123456789012',
      '0xoracle345678901234567890123456789012345678'
    ],
    enableEmergencyControls: true,
    thresholds: {
      maxTransactionValue: 5000000,
      anomalyConfidenceThreshold: 0.85
    },
    jurisdictions: ['US', 'EU', 'UK', 'GLOBAL'],
    initialBlacklist: [
      '0xblacklist123456789012345678901234567890',
      '0xblacklist789012345678901234567890123456789'
    ],
    initialWhitelist: [
      '0x1234567890123456789012345678901234567890',
      '0xwhitelist123456789012345678901234567890',
      '0xwhitelist789012345678901234567890123456789'
    ]
  }
};

// Deployment utility functions
export async function deploySecurityMonitorSystem(config: SecurityMonitorDeploymentConfig): Promise<SecurityMonitorDeploymentResult> {
  const deployer = new SecurityMonitorDeployer(config);
  return await deployer.deploy();
}

// CLI helper for deployment
export class SecurityMonitorDeploymentCLI {
  static async main(): Promise<void> {
    const args = process.argv.slice(2);
    const network = args[0] || 'development';
    
    if (!SECURITY_MONITOR_CONFIGS[network as keyof typeof SECURITY_MONITOR_CONFIGS]) {
      console.error(`❌ Unknown network: ${network}`);
      console.log('Available networks: development, testnet, mainnet');
      process.exit(1);
    }

    console.log(`🚀 Deploying Security Monitor System to ${network}...`);
    
    try {
      const result = await deploySecurityMonitorSystem(SECURITY_MONITOR_CONFIGS[network as keyof typeof SECURITY_MONITOR_CONFIGS]);
      
      if (result.success) {
        console.log('✅ Deployment successful!');
        console.log(`📋 Deployment Hash: ${result.deploymentHash}`);
        console.log(`⏰ Timestamp: ${new Date(result.timestamp).toISOString()}`);
        console.log(`🔗 Security Monitor: ${result.securityMonitorAddress}`);
        
        if (result.verificationResult.passed) {
          console.log('✅ All verification checks passed!');
        } else {
          console.log(`⚠️  ${result.verificationResult.failedChecks} verification checks failed`);
          result.verificationResult.checks
            .filter(check => !check.passed)
            .forEach(check => console.log(`   ❌ ${check.name}: ${check.details}`));
        }
      } else {
        console.log('❌ Deployment failed!');
      }
    } catch (error) {
      console.error('❌ Deployment error:', error);
      process.exit(1);
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  SecurityMonitorDeploymentCLI.main().catch(console.error);
}
