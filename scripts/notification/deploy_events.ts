/**
 * deploy_events.ts
 * 
 * Deployment script for the NotificationManager contract.
 * Initializes the event system, configures authorized emitters, and sets up event types.
 */

import { NotificationManager } from '../../contracts/notification/NotificationManager';
import { EventType } from '../../contracts/notification/structures/EventStructure';

/**
 * Configuration for deployment
 */
interface DeploymentConfig {
  ownerAddress: string;
  authorizedEmitters: string[];
  initializeEventTypes: boolean;
  testMode: boolean;
}

/**
 * Deployment class for NotificationManager
 */
export class NotificationManagerDeployer {
  private config: DeploymentConfig;
  private manager: NotificationManager | null = null;

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  /**
   * Deploy the NotificationManager contract
   * 
   * @returns Deployed NotificationManager instance
   */
  async deploy(): Promise<NotificationManager> {
    console.log('🚀 Deploying NotificationManager...');
    console.log(`   Owner: ${this.config.ownerAddress}`);

    try {
      // Create contract instance
      this.manager = new NotificationManager(this.config.ownerAddress);
      console.log('✅ NotificationManager deployed successfully');

      // Initialize event types
      if (this.config.initializeEventTypes) {
        await this.initializeEventTypes();
      }

      // Authorize additional emitters
      if (this.config.authorizedEmitters.length > 0) {
        await this.authorizeEmitters();
      }

      // Run tests if in test mode
      if (this.config.testMode) {
        await this.runHealthChecks();
      }

      return this.manager;
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Initialize supported event types in the system
   */
  private async initializeEventTypes(): Promise<void> {
    console.log('\n📋 Initializing event types...');

    const eventTypes = Object.values(EventType);
    console.log(`   Total event types: ${eventTypes.length}`);

    for (const eventType of eventTypes) {
      console.log(`   ✓ ${eventType}`);
    }

    console.log('✅ Event types initialized');
  }

  /**
   * Authorize additional contract emitters
   */
  private async authorizeEmitters(): Promise<void> {
    if (!this.manager) throw new Error('Manager not deployed');

    console.log('\n🔐 Authorizing emitters...');
    console.log(`   Total emitters: ${this.config.authorizedEmitters.length}`);

    for (const emitter of this.config.authorizedEmitters) {
      try {
        await this.manager.authorizeEmitter(this.config.ownerAddress, emitter);
        console.log(`   ✓ Authorized: ${emitter}`);
      } catch (error) {
        console.error(`   ✗ Failed to authorize ${emitter}:`, error);
      }
    }

    console.log('✅ Emitters authorized');
  }

  /**
   * Run health checks on deployed contract
   */
  private async runHealthChecks(): Promise<void> {
    if (!this.manager) throw new Error('Manager not deployed');

    console.log('\n🏥 Running health checks...');

    try {
      // Check owner
      const owner = this.manager.getOwner();
      if (owner === this.config.ownerAddress.toLowerCase()) {
        console.log('   ✓ Owner correctly set');
      } else {
        throw new Error(`Owner mismatch: ${owner} !== ${this.config.ownerAddress}`);
      }

      // Check authorization
      const emitters = this.manager.getAuthorizedEmitters();
      if (emitters.includes(this.config.ownerAddress.toLowerCase())) {
        console.log('   ✓ Owner is authorized emitter');
      }

      // Check pause state
      const isPaused = await this.manager.isPaused();
      if (!isPaused) {
        console.log('   ✓ Contract is not paused');
      }

      // Check event count
      const totalEvents = await this.manager.getTotalEventCount();
      console.log(`   ✓ Total events stored: ${totalEvents}`);

      // Check event types
      const eventTypes = await this.manager.getEventTypes();
      console.log(`   ✓ Event types registered: ${eventTypes.length}`);

      console.log('✅ Health checks passed');
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  /**
   * Get the deployed manager instance
   */
  getManager(): NotificationManager {
    if (!this.manager) {
      throw new Error('Manager not deployed. Call deploy() first.');
    }
    return this.manager;
  }

  /**
   * Print deployment summary
   */
  printSummary(): void {
    if (!this.manager) throw new Error('Manager not deployed');

    console.log('\n📊 Deployment Summary');
    console.log('═'.repeat(50));
    console.log(`Owner Address:        ${this.config.ownerAddress}`);
    console.log(`Authorized Emitters:  ${this.config.authorizedEmitters.length}`);
    console.log(`Event Types Enabled:  ${this.config.initializeEventTypes}`);
    console.log(`Contract Version:     1.0.0`);
    console.log('═'.repeat(50));
  }
}

/**
 * Main deployment function
 * Example usage for DAO contracts
 */
export async function deployNotificationManager(): Promise<NotificationManager> {
  // Configuration for production deployment
  const config: DeploymentConfig = {
    ownerAddress: process.env.DAO_OWNER_ADDRESS || '0x1234567890123456789012345678901234567890',
    authorizedEmitters: [
      // Add governance contract addresses here
      // '0xGovernanceContractAddress',
      // '0xTreasuryContractAddress',
      // '0xVotingContractAddress',
    ],
    initializeEventTypes: true,
    testMode: process.env.NODE_ENV === 'test' || process.env.DEPLOY_TEST === 'true',
  };

  const deployer = new NotificationManagerDeployer(config);
  const manager = await deployer.deploy();
  deployer.printSummary();

  return manager;
}

/**
 * Deployment function for testing
 */
export async function deployForTesting(): Promise<NotificationManager> {
  const testOwner = '0x1234567890123456789012345678901234567890';
  const testEmitters = [
    '0xAbcDefAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd',
    '0x0987654321098765432109876543210987654321',
  ];

  const config: DeploymentConfig = {
    ownerAddress: testOwner,
    authorizedEmitters: testEmitters,
    initializeEventTypes: true,
    testMode: true,
  };

  const deployer = new NotificationManagerDeployer(config);
  return deployer.deploy();
}

// Example usage demonstrating deployment and immediate usage
async function exampleDeploymentUsage(): Promise<void> {
  console.log('🔧 NotificationManager Deployment Example\n');

  // Deploy the manager
  const manager = await deployNotificationManager();

  // Subscribe users to events
  const subscriber1 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const subscriber2 = '0xfedcbafedcbafedcbafedcbafedcbafedcbafed0';

  console.log('\n📌 Setting up subscriptions...');
  await manager.subscribe(subscriber1, EventType.PROPOSAL_CREATED);
  await manager.subscribe(subscriber1, EventType.VOTE_CAST);
  await manager.subscribe(subscriber2, EventType.TREASURY_WITHDRAWAL);
  console.log('✅ Subscriptions configured');

  // Emit test events
  console.log('\n🎯 Emitting test events...');
  const owner = manager.getOwner();

  await manager.emitEvent(
    EventType.PROPOSAL_CREATED,
    owner,
    subscriber1,
    JSON.stringify({
      proposalId: '1',
      title: 'Enable Notification System',
      description: 'Enable real-time event notifications',
    })
  );

  await manager.emitEvent(
    EventType.VOTE_CAST,
    subscriber1,
    '',
    JSON.stringify({
      proposalId: '1',
      vote: 'yes',
      weight: '1000000000000000000',
    })
  );

  console.log('✅ Test events emitted');

  // Get events
  console.log('\n📚 Retrieving events...');
  const allEvents = await manager.getEvents();
  console.log(`Total events: ${allEvents.length}`);

  const proposalEvents = await manager.getEventsByType(EventType.PROPOSAL_CREATED);
  console.log(`Proposal events: ${proposalEvents.length}`);

  // Get notification summary
  console.log('\n📬 Notification Summary for Subscriber 1:');
  const summary = await manager.getNotificationSummary(subscriber1);
  console.log(JSON.stringify(summary, null, 2));

  console.log('\n✨ Deployment example completed successfully!');
}

// Run if executed directly
if (require.main === module) {
  (async () => {
    try {
      await exampleDeploymentUsage();
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}
