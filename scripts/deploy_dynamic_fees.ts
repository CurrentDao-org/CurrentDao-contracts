import { DynamicFeeSwitch } from '../contracts/fees/DynamicFeeSwitch';
import { FeeDistributor } from '../contracts/fees/distribution/FeeDistributor';
import { FeeManager } from '../contracts/fees/FeeManager';
import { FeeTier, Recipient } from '../contracts/fees/interfaces/IDynamicFeeSwitch';

// Default fee tiers (Requirement 3.1)
const defaultTiers: FeeTier[] = [
    { baseFeeBps: 100, minFeeBps: 40, maxFeeBps: 150 },
];

// Default recipients summing to 10 000 bps (Requirement 5.2)
const defaultRecipients: Recipient[] = [
    { address: '0xTreasury', allocationBps: 7000, name: 'Treasury' },
    { address: '0xRewardsPool', allocationBps: 3000, name: 'Rewards Pool' },
];

// Instantiate FeeDistributor and configure recipients
const feeDistributor = new FeeDistributor();
feeDistributor.configure(defaultRecipients);

// Instantiate DynamicFeeSwitch with default tiers
const dynamicFeeSwitch = new DynamicFeeSwitch(defaultTiers);

// Wire FeeManager to forward congestion updates to DynamicFeeSwitch
const feeManager = new FeeManager('0xDeployer', dynamicFeeSwitch);

// Log deployed configuration
console.log('=== Dynamic Fee Switching Deployment ===');
console.log('\nFeeDistributor recipients:');
for (const recipient of defaultRecipients) {
    console.log(`  ${recipient.name}: ${recipient.address} — ${recipient.allocationBps} bps (${recipient.allocationBps / 100}%)`);
}

console.log('\nDynamicFeeSwitch tiers:');
for (let i = 0; i < defaultTiers.length; i++) {
    const tier = defaultTiers[i];
    console.log(`  Tier ${i + 1}: baseFeeBps=${tier.baseFeeBps}, minFeeBps=${tier.minFeeBps}, maxFeeBps=${tier.maxFeeBps}`);
}

console.log('\nFeeManager owner:', feeManager.getOwner());
console.log('DynamicFeeSwitch wired to FeeManager: true');
console.log('\nDeployment complete.');
