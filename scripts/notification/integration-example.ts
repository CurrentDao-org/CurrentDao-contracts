/**
 * integration-example.ts
 * 
 * Example showing how to integrate NotificationManager with a DAO governance system.
 * Demonstrates real-world usage patterns for event emission and notification.
 */

import {
  NotificationManager,
  EventType,
  EventLib,
  FILTER_PRESETS,
  createFilter,
  EVENT_TYPES,
  EventStruct,
} from '../../contracts/notification/index';

/**
 * Example DAO Governance integration
 */
class DAOGovernanceIntegration {
  private notificationManager: NotificationManager;
  private daoOwner: string;
  private governanceContract: string;
  private treasuryContract: string;
  private votingContract: string;

  constructor(
    notificationManager: NotificationManager,
    daoOwner: string,
    governanceContractAddr: string,
    treasuryContractAddr: string,
    votingContractAddr: string
  ) {
    this.notificationManager = notificationManager;
    this.daoOwner = daoOwner;
    this.governanceContract = governanceContractAddr;
    this.treasuryContract = treasuryContractAddr;
    this.votingContract = votingContractAddr;

    this.setupIntegration();
  }

  /**
   * Setup integration - authorize contracts and configure listeners
   */
  private async setupIntegration(): Promise<void> {
    console.log('🔧 Setting up DAO Governance Integration...');

    try {
      // Authorize contracts to emit events
      await this.notificationManager.authorizeEmitter(this.daoOwner, this.governanceContract);
      await this.notificationManager.authorizeEmitter(this.daoOwner, this.treasuryContract);
      await this.notificationManager.authorizeEmitter(this.daoOwner, this.votingContract);

      console.log('✅ Authorized all DAO contracts as event emitters');

      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('❌ Integration setup failed:', error);
    }
  }

  /**
   * Setup event listeners for dashboard updates
   */
  private setupEventListeners(): void {
    // Listen for all events
    this.notificationManager.on('EventEmitted', (event: EventStruct) => {
      console.log(`📢 Event emitted: ${event.eventType}`);
      this.handleEventEmitted(event);
    });

    // Listen for subscription changes
    this.notificationManager.on('SubscriptionChanged', (data: {user: string, eventType: string, subscribed: boolean}) => {
      const action = data.subscribed ? 'subscribed to' : 'unsubscribed from';
      console.log(`👤 User ${data.user} ${action} ${data.eventType}`);
    });

    // Listen for pause events
    this.notificationManager.on('PauseToggled', (isPaused: boolean) => {
      console.log(isPaused ? '⏸️  System paused' : '▶️  System resumed');
    });

    console.log('✅ Event listeners configured');
  }

  /**
   * Handle different event types
   */
  private handleEventEmitted(event: EventStruct): void {
    switch (event.eventType) {
      case EventType.PROPOSAL_CREATED:
        this.handleProposalCreated(event);
        break;
      case EventType.VOTE_CAST:
        this.handleVoteCast(event);
        break;
      case EventType.PROPOSAL_EXECUTED:
        this.handleProposalExecuted(event);
        break;
      case EventType.TREASURY_WITHDRAWAL:
        this.handleTreasuryWithdrawal(event);
        break;
      // ... other event types
    }
  }

  private handleProposalCreated(event: EventStruct): void {
    console.log(`📋 New proposal created by ${event.actor}`);
    // Update dashboard, notify subscribers, etc.
  }

  private handleVoteCast(event: EventStruct): void {
    console.log(`🗳️ Vote cast by ${event.actor}`);
    // Update voting results, notify watchers, etc.
  }

  private handleProposalExecuted(event: EventStruct): void {
    console.log(`✅ Proposal ${event.target} executed`);
    // Mark proposal as executed, trigger actions, etc.
  }

  private handleTreasuryWithdrawal(event: EventStruct): void {
    console.log(`💰 Treasury withdrawal: ${event.target}`);
    // Update treasury balance, audit logs, etc.
  }

  /**
   * Emit a proposal creation event
   */
  async createProposal(proposalData: {
    proposalId: string;
    title: string;
    description: string;
    votingPeriod: number;
    targetAddress?: string;
  }): Promise<void> {
    console.log(`📝 Creating proposal: ${proposalData.title}`);

    await this.notificationManager.emitEvent(
      EventType.PROPOSAL_CREATED,
      this.governanceContract,
      proposalData.targetAddress || '',
      JSON.stringify({
        proposalId: proposalData.proposalId,
        title: proposalData.title,
        description: proposalData.description,
        votingPeriod: proposalData.votingPeriod,
        createdAt: Math.floor(Date.now() / 1000),
      })
    );

    console.log('✅ Proposal creation event emitted');
  }

  /**
   * Emit a voting event
   */
  async castVote(voteData: {
    proposalId: string;
    voter: string;
    choice: 'yes' | 'no' | 'abstain';
    weight: string;
    reason?: string;
  }): Promise<void> {
    console.log(`🗳️ Casting vote for proposal ${voteData.proposalId}`);

    await this.notificationManager.emitEvent(
      EventType.VOTE_CAST,
      voteData.voter,
      voteData.proposalId,
      JSON.stringify({
        proposalId: voteData.proposalId,
        choice: voteData.choice,
        weight: voteData.weight,
        reason: voteData.reason || '',
        votedAt: Math.floor(Date.now() / 1000),
      })
    );

    console.log('✅ Vote event emitted');
  }

  /**
   * Emit proposal execution event
   */
  async executeProposal(proposalData: {
    proposalId: string;
    status: 'COMPLETED' | 'FAILED';
    executionHash?: string;
  }): Promise<void> {
    const eventType = proposalData.status === 'COMPLETED' 
      ? EventType.PROPOSAL_EXECUTED 
      : EventType.EXECUTION_FAILED;

    console.log(`⚙️ Executing proposal ${proposalData.proposalId}`);

    await this.notificationManager.emitEvent(
      eventType,
      this.governanceContract,
      proposalData.proposalId,
      JSON.stringify({
        proposalId: proposalData.proposalId,
        status: proposalData.status,
        executionHash: proposalData.executionHash || '',
        executedAt: Math.floor(Date.now() / 1000),
      })
    );

    console.log('✅ Proposal execution event emitted');
  }

  /**
   * Emit treasury event
   */
  async treasuryTransaction(transactionData: {
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: string;
    recipient?: string;
    reason?: string;
  }): Promise<void> {
    const eventType = transactionData.type === 'DEPOSIT'
      ? EventType.TREASURY_DEPOSIT
      : EventType.TREASURY_WITHDRAWAL;

    console.log(`💳 Treasury ${transactionData.type.toLowerCase()}: ${transactionData.amount}`);

    await this.notificationManager.emitEvent(
      eventType,
      this.treasuryContract,
      transactionData.recipient || '',
      JSON.stringify({
        type: transactionData.type,
        amount: transactionData.amount,
        reason: transactionData.reason || '',
        timestamp: Math.floor(Date.now() / 1000),
      })
    );

    console.log('✅ Treasury event emitted');
  }

  /**
   * Get DAO statistics
   */
  async getDAOStatistics(): Promise<void> {
    console.log('\n📊 DAO Event Statistics');
    console.log('═'.repeat(50));

    const totalEvents = await this.notificationManager.getTotalEventCount();
    const allEventTypes = await this.notificationManager.getEventTypes();

    console.log(`Total Events: ${totalEvents}`);
    console.log(`Event Types: ${allEventTypes.length}`);

    // Get counts by type
    for (const eventType of allEventTypes) {
      const count = await this.notificationManager.getEventCount(eventType);
      console.log(`  - ${eventType}: ${count}`);
    }

    // Storage stats
    const stats = await this.notificationManager.getStorageStats();
    console.log(`\nStorage Usage: ${stats.estimatedGasUsed.toLocaleString()} gas`);
    console.log(`Average Event Size: ${stats.averageEventSize.toLocaleString()} gas`);

    console.log('═'.repeat(50));
  }

  /**
   * Get governance activity report
   */
  async getActivityReport(): Promise<void> {
    console.log('\n📋 DAO Activity Report');
    console.log('═'.repeat(50));

    // Get recent proposals
    const proposals = await this.notificationManager.getEventsByType(
      EventType.PROPOSAL_CREATED,
      10
    );
    console.log(`Recent Proposals: ${proposals.length}`);

    // Get voting activity
    const votes = await this.notificationManager.getEventsByType(EventType.VOTE_CAST, 100);
    console.log(`Total Votes Cast: ${votes.length}`);

    // Get executions
    const executions = await this.notificationManager.getEventsByType(
      EventType.PROPOSAL_EXECUTED,
      10
    );
    console.log(`Executed Proposals: ${executions.length}`);

    // Get treasury activity
    const deposits = await this.notificationManager.getEventCount(EventType.TREASURY_DEPOSIT);
    const withdrawals = await this.notificationManager.getEventCount(
      EventType.TREASURY_WITHDRAWAL
    );
    console.log(`Treasury Deposits: ${deposits}`);
    console.log(`Treasury Withdrawals: ${withdrawals}`);

    console.log('═'.repeat(50));
  }

  /**
   * Query events with filters
   */
  async queryGovernanceEvents(): Promise<void> {
    console.log('\n🔍 Querying Governance Events');
    console.log('═'.repeat(50));

    // Query all governance events
    const govEvents = await this.notificationManager.getEvents(FILTER_PRESETS.governance);
    console.log(`Governance Events: ${govEvents.length}`);

    // Query voting from last 7 days
    const recentVotes = await this.notificationManager.getEvents({
      ...FILTER_PRESETS.voting,
      ...FILTER_PRESETS.thisWeek,
      limit: 50,
    });
    console.log(`Recent Votes (7d): ${recentVotes.length}`);

    // Query treasury activity from last month
    const treasuryEvents = await this.notificationManager.getEvents({
      ...FILTER_PRESETS.finance,
      ...FILTER_PRESETS.thisMonth,
      limit: 50,
    });
    console.log(`Treasury Events (30d): ${treasuryEvents.length}`);

    console.log('═'.repeat(50));
  }
}

/**
 * Example: Using NotificationManager with member subscriptions
 */
async function exampleMemberNotifications(): Promise<void> {
  console.log('\n👥 Member Notification Example\n');

  // Create notification manager
  const manager = new NotificationManager('0x1234567890123456789012345678901234567890');

  // Member addresses
  const treasurer = '0xAbcDefAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd';
  const secretary = '0xFedCbAFedCbAFedCbAFedCbAFedCbAFedCbAFed0';
  const regularmember = '0x0987654321098765432109876543210987654321';

  // Configure subscriptions based on roles
  console.log('Setting up role-based subscriptions...');

  // Treasurer gets finance events
  await manager.subscribeToMultiple(treasurer, [
    EventType.TREASURY_DEPOSIT,
    EventType.TREASURY_WITHDRAWAL,
    EventType.BUDGET_ALLOCATED,
  ]);

  // Secretary gets governance events
  await manager.subscribeToMultiple(secretary, [
    EventType.PROPOSAL_CREATED,
    EventType.PROPOSAL_EXECUTED,
  ]);

  // Regular member gets voting events
  await manager.subscribe(regularmember, EventType.VOTE_CAST);

  console.log('✅ Subscriptions configured');

  // Get notification counts
  console.log('\nNotification counts:');
  const treasurerCount = await manager.getSubscriptionCount(EventType.TREASURY_DEPOSIT);
  const secretaryCount = await manager.getSubscriptionCount(EventType.PROPOSAL_CREATED);
  console.log(`Treasury notifications: ${treasurerCount}`);
  console.log(`Governance notifications: ${secretaryCount}`);
}

/**
 * Example: Real-time dashboard updates
 */
async function exampleRealtimeDashboard(): Promise<void> {
  console.log('\n📊 Real-time Dashboard Example\n');

  const manager = new NotificationManager('0x1234567890123456789012345678901234567890');
  const dashboardUser = '0xAbcDefAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd';

  // Subscribe to all events for dashboard
  await manager.subscribeToAll(dashboardUser);

  // Setup real-time listeners
  manager.on('EventEmitted', (event: EventStruct) => {
    console.log(`[${new Date().toISOString()}] ${event.eventType}: ${event.actor}`);
  });

  manager.on(`Notification:${dashboardUser.toLowerCase()}`, (payload: {eventName: string, data: any}) => {
    console.log(`[NOTIFICATION] ${payload.eventName}:`, payload.data);
  });

  console.log('✅ Real-time dashboard active');
}

/**
 * Main execution
 */
async function runExamples(): Promise<void> {
  console.log('🚀 NotificationManager Integration Examples\n');

  try {
    // Example 1: Member subscriptions
    await exampleMemberNotifications();

    // Example 2: Real-time dashboard
    // await exampleRealtimeDashboard();

    console.log('\n✨ Examples completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runExamples();
}

export { DAOGovernanceIntegration };
