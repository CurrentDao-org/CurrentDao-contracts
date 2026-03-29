/**
 * Deployment script for AML contract
 * Usage: npm run deploy:aml
 */

import AntiMoneyLaundering from '../contracts/aml/AntiMoneyLaundering';

async function deployAML(): Promise<void> {
  console.log('🚀 Deploying AntiMoneyLaundering contract...');

  // Initialize with default config
  const aml = new AntiMoneyLaundering({
    suspiciousThreshold: 40,
    highRiskThreshold: 70,
    criticalThreshold: 85,
  });

  console.log('✅ AML Contract deployed successfully');
  console.log('📊 AML Indicators available:', aml.getAMLIndicators().length);
  console.log('🛡️ Default risk thresholds:');
  console.log('   - Suspicious: 40');
  console.log('   - High Risk: 70');
  console.log('   - Critical: 85');

  // Generate initial report
  const report = aml.generateComplianceReport();
  console.log('📋 Initial Compliance Report:');
  console.log(`   - Total Transactions: ${report.totalTransactions}`);
  console.log(`   - Flagged Accounts: ${report.flaggedAccounts}`);
  console.log(`   - Alerts Generated: ${report.alertsGenerated}`);
  console.log(`   - Blacklisted Addresses: ${report.blacklistedAddresses}`);

  return;
}

// Execute deployment
deployAML()
  .then(() => {
    console.log('✨ Deployment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });