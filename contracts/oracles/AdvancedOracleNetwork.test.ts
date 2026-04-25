/**
 * Advanced Oracle Network Contract Tests
 * Comprehensive test suite for decentralized oracle infrastructure
 */

import { AdvancedOracleNetwork } from './AdvancedOracleNetwork';
import { RequestStatus, AggregationMethod, DataType, IncentiveType, SlashingSeverity, GovernanceType, AuditType } from './structures/OracleStructs';

describe('AdvancedOracleNetwork', () => {
  let oracle: AdvancedOracleNetwork;
  let owner: string;
  let node1: string;
  let node2: string;
  let nodeId1: string;
  let nodeId2: string;
  let requestId: string;

  beforeEach(() => {
    oracle = new AdvancedOracleNetwork();
    owner = "0x0000000000000000000000000000000000000000";
    node1 = "0x1234567890123456789012345678901234567890";
    node2 = "0x0987654321098765432109876543210987654321";
  });

  describe('Node Management', () => {
    it('should register a new oracle node', async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price', 'weather'],
        250, // 2.5%
        5000 // 5 seconds
      );

      expect(nodeId1).toBeDefined();
      expect(nodeId1.length).toBe(66); // 0x + 64 hex chars

      const node = oracle.getNode(nodeId1);
      expect(node.operator).toBe(owner);
      expect(node.endpoint).toBe('https://oracle1.example.com');
      expect(node.stakeAmount).toBe(1000n);
      expect(node.isActive).toBe(true);
      expect(node.reputationScore).toBe(500); // Starting reputation
    });

    it('should throw error for invalid registration parameters', async () => {
      await expect(oracle.registerNode(
        '', // Invalid endpoint
        1000n,
        ['energy-price'],
        250,
        5000
      )).rejects.toThrow('Invalid node registration parameters');

      await expect(oracle.registerNode(
        'https://oracle1.example.com',
        100n, // Insufficient stake
        ['energy-price'],
        250,
        5000
      )).rejects.toThrow('Invalid node registration parameters');
    });

    it('should unregister a node', async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );

      await oracle.unregisterNode(nodeId1);

      const node = oracle.getNode(nodeId1);
      expect(node.isActive).toBe(false);
    });

    it('should update node endpoint', async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );

      await oracle.updateNodeEndpoint(nodeId1, 'https://oracle1-updated.example.com');

      const node = oracle.getNode(nodeId1);
      expect(node.endpoint).toBe('https://oracle1-updated.example.com');
    });

    it('should update node stake', async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );

      await oracle.updateNodeStake(nodeId1, 500n);

      const node = oracle.getNode(nodeId1);
      expect(node.stakeAmount).toBe(1500n);
    });

    it('should withdraw stake', async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );

      await oracle.withdrawStake(nodeId1);

      const node = oracle.getNode(nodeId1);
      expect(node.stakeAmount).toBe(0n);
    });
  });

  describe('Data Request Operations', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );
    });

    it('should create a data request', async () => {
      requestId = await oracle.requestData(
        ['energy-price'],
        { symbol: 'WATT', currency: 'USD' },
        '0xcontract-address',
        'updatePrice',
        BigInt(Date.now() + 300000), // 5 minutes
        100n,
        3, // min responses
        5, // max responses
        AggregationMethod.MEDIAN,
        1000000n // gas limit
      );

      expect(requestId).toBeDefined();

      const request = oracle.getRequest(requestId);
      expect(request.requester).toBe(owner);
      expect(request.dataSources).toEqual(['energy-price']);
      expect(request.bounty).toBe(100n);
      expect(request.status).toBe(RequestStatus.ACTIVE);
    });

    it('should throw error for insufficient bounty', async () => {
      await expect(oracle.requestData(
        ['energy-price'],
        { symbol: 'WATT' },
        '0xcontract-address',
        'updatePrice',
        BigInt(Date.now() + 300000),
        0n, // Insufficient bounty
        3,
        5,
        AggregationMethod.MEDIAN,
        1000000n
      )).rejects.toThrow('Insufficient bounty');
    });

    it('should cancel a request', async () => {
      requestId = await oracle.requestData(
        ['energy-price'],
        { symbol: 'WATT' },
        '0xcontract-address',
        'updatePrice',
        BigInt(Date.now() + 300000),
        100n,
        3,
        5,
        AggregationMethod.MEDIAN,
        1000000n
      );

      await oracle.cancelRequest(requestId);

      const request = oracle.getRequest(requestId);
      expect(request.status).toBe(RequestStatus.CANCELLED);
    });

    it('should extend request timeout', async () => {
      requestId = await oracle.requestData(
        ['energy-price'],
        { symbol: 'WATT' },
        '0xcontract-address',
        'updatePrice',
        BigInt(Date.now() + 300000),
        100n,
        3,
        5,
        AggregationMethod.MEDIAN,
        1000000n
      );

      const originalTimeout = oracle.getRequest(requestId).timeout;
      await oracle.extendRequestTimeout(requestId, 60000n); // Add 1 minute

      const request = oracle.getRequest(requestId);
      expect(request.timeout).toBe(originalTimeout + 60000n);
    });
  });

  describe('Response Operations', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );

      requestId = await oracle.requestData(
        ['energy-price'],
        { symbol: 'WATT' },
        '0xcontract-address',
        'updatePrice',
        BigInt(Date.now() + 300000),
        100n,
        1, // min responses
        3, // max responses
        AggregationMethod.MEDIAN,
        1000000n
      );
    });

    it('should submit response to request', async () => {
      const responseId = await oracle.submitResponse(
        requestId,
        { price: 1.25, timestamp: Date.now() },
        'signature123'
      );

      expect(responseId).toBeDefined();

      const response = oracle.getResponse(responseId);
      expect(response.requestId).toBe(requestId);
      expect(response.nodeId).toBe(owner); // Simplified
      expect(response.data).toEqual({ price: 1.25, timestamp: Date.now() });
    });

    it('should throw error for non-existent request', async () => {
      await expect(oracle.submitResponse(
        'non-existent-request',
        { price: 1.25 },
        'signature123'
      )).rejects.toThrow('Request not found');
    });

    it('should throw error for inactive request', async () => {
      await oracle.cancelRequest(requestId);

      await expect(oracle.submitResponse(
        requestId,
        { price: 1.25 },
        'signature123'
      )).rejects.toThrow('Request not active');
    });
  });

  describe('Data Validation', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );

      requestId = await oracle.requestData(
        ['energy-price'],
        { symbol: 'WATT' },
        '0xcontract-address',
        'updatePrice',
        BigInt(Date.now() + 300000),
        100n,
        1,
        3,
        AggregationMethod.MEDIAN,
        1000000n
      );

      await oracle.submitResponse(
        requestId,
        { price: 1.25, timestamp: Date.now() },
        'signature123'
      );
    });

    it('should validate data from responses', async () => {
      const validationId = await oracle.validateData(requestId);

      expect(validationId).toBeDefined();

      const validation = oracle.getValidation(validationId);
      expect(validation.requestId).toBe(requestId);
      expect(validation.validatorId).toBe(owner);
      expect(typeof validation.isValid).toBe('boolean');
      expect(typeof validation.confidence).toBe('number');
    });

    it('should calculate data quality', () => {
      const dataQuality = oracle.calculateDataQuality(requestId);

      expect(dataQuality.requestId).toBe(requestId);
      expect(typeof dataQuality.qualityScore).toBe('number');
      expect(typeof dataQuality.freshness).toBe('number');
      expect(typeof dataQuality.completeness).toBe('number');
      expect(typeof dataQuality.consistency).toBe('number');
      expect(typeof dataQuality.accuracy).toBe('number');
    });
  });

  describe('Reputation System', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );
    });

    it('should update node reputation', async () => {
      await oracle.updateReputation(nodeId1, {
        accuracy: 0.9,
        reliability: 0.85,
        speed: 0.8,
        honesty: 0.95
      });

      const reputation = oracle.getReputation(nodeId1);
      expect(reputation.accuracy).toBe(0.9);
      expect(reputation.reliability).toBe(0.85);
      expect(reputation.speed).toBe(0.8);
      expect(reputation.honesty).toBe(0.95);
      expect(reputation.overallScore).toBeGreaterThan(500); // Should be higher than starting score
    });

    it('should get node reputation', () => {
      const reputation = oracle.getReputation(nodeId1);
      expect(reputation.nodeId).toBe(nodeId1);
      expect(typeof reputation.accuracy).toBe('number');
      expect(typeof reputation.overallScore).toBe('number');
    });

    it('should get top performing nodes', async () => {
      // Register another node with higher reputation
      nodeId2 = await oracle.registerNode(
        'https://oracle2.example.com',
        2000n,
        ['energy-price'],
        200,
        3000
      );

      await oracle.updateReputation(nodeId2, {
        accuracy: 0.95,
        reliability: 0.9,
        speed: 0.85,
        honesty: 0.98
      });

      const topNodes = oracle.getTopNodes(2);
      expect(topNodes.length).toBe(2);
      expect(topNodes[0].reputationScore).toBeGreaterThanOrEqual(topNodes[1].reputationScore);
    });
  });

  describe('Failover Mechanisms', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );

      nodeId2 = await oracle.registerNode(
        'https://oracle2.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );
    });

    it('should configure failover settings', async () => {
      const failoverConfig = {
        primaryNodes: [nodeId1],
        backupNodes: [nodeId2],
        failoverThreshold: 50,
        recoveryThreshold: 80,
        maxFailures: 3,
        healthCheckInterval: 60000
      };

      await oracle.configureFailover(failoverConfig);
      // Should not throw error
    });

    it('should perform health check on node', async () => {
      const healthCheck = await oracle.performHealthCheck(nodeId1);

      expect(healthCheck.nodeId).toBe(nodeId1);
      expect(typeof healthCheck.isHealthy).toBe('boolean');
      expect(typeof healthCheck.responseTime).toBe('number');
      expect(typeof healthCheck.successRate).toBe('number');
      expect(Array.isArray(healthCheck.issues)).toBe(true);
    });

    it('should trigger failover when needed', async () => {
      const failoverConfig = {
        primaryNodes: [nodeId1],
        backupNodes: [nodeId2],
        failoverThreshold: 50,
        recoveryThreshold: 80,
        maxFailures: 3,
        healthCheckInterval: 60000
      };

      await oracle.configureFailover(failoverConfig);

      // Trigger failover (simplified - in reality would be based on health checks)
      await oracle.triggerFailover(nodeId1);

      const primaryNode = oracle.getNode(nodeId1);
      expect(primaryNode.isActive).toBe(false);
    });
  });

  describe('Incentive System', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );
    });

    it('should create incentive for node', async () => {
      const incentiveId = await oracle.createIncentive(
        nodeId1,
        IncentiveType.RESPONSE_BOUNTY,
        50n,
        'Successful response to high-priority request'
      );

      expect(incentiveId).toBeDefined();

      const incentive = oracle.getIncentive(incentiveId);
      expect(incentive.nodeId).toBe(nodeId1);
      expect(incentive.type).toBe(IncentiveType.RESPONSE_BOUNTY);
      expect(incentive.amount).toBe(50n);
      expect(incentive.isClaimed).toBe(false);
    });

    it('should claim incentive reward', async () => {
      const incentiveId = await oracle.createIncentive(
        nodeId1,
        IncentiveType.ACCURACY_BONUS,
        25n,
        'High accuracy on price data'
      );

      await oracle.claimIncentive(incentiveId);

      const incentive = oracle.getIncentive(incentiveId);
      expect(incentive.isClaimed).toBe(true);
      expect(incentive.claimedAt).toBeDefined();
    });

    it('should throw error for already claimed incentive', async () => {
      const incentiveId = await oracle.createIncentive(
        nodeId1,
        IncentiveType.SPEED_BONUS,
        25n,
        'Fast response time'
      );

      await oracle.claimIncentive(incentiveId);

      await expect(oracle.claimIncentive(incentiveId)).rejects.toThrow('Incentive already claimed');
    });
  });

  describe('Data Source Management', () => {
    it('should register data source', async () => {
      const sourceId = await oracle.registerDataSource(
        'Energy Price Feed',
        'https://api.energy.com/price',
        DataType.PRICE,
        60, // 1 minute
        0.95,
        ['ethereum', 'polygon'],
        'bearer-token',
        100
      );

      expect(sourceId).toBeDefined();

      const dataSource = oracle.getDataSource(sourceId);
      expect(dataSource.name).toBe('Energy Price Feed');
      expect(dataSource.dataType).toBe(DataType.PRICE);
      expect(dataSource.isActive).toBe(true);
    });

    it('should update data source', async () => {
      const sourceId = await oracle.registerDataSource(
        'Weather API',
        'https://api.weather.com/data',
        DataType.WEATHER,
        300,
        0.90,
        ['ethereum'],
        'api-key',
        50
      );

      await oracle.updateDataSource(sourceId, {
        name: 'Updated Weather API',
        reliability: 0.92
      });

      const dataSource = oracle.getDataSource(sourceId);
      expect(dataSource.name).toBe('Updated Weather API');
      expect(dataSource.reliability).toBe(0.92);
    });

    it('should deactivate data source', async () => {
      const sourceId = await oracle.registerDataSource(
        'Carbon Credit API',
        'https://api.carbon.com/credits',
        DataType.CARBON_CREDITS,
        3600,
        0.88,
        ['ethereum'],
        'oauth2',
        25
      );

      await oracle.deactivateDataSource(sourceId);

      const dataSource = oracle.getDataSource(sourceId);
      expect(dataSource.isActive).toBe(false);
    });
  });

  describe('Staking Operations', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );
    });

    it('should stake node tokens', async () => {
      const stakeId = await oracle.stakeNode(nodeId1, 500n, 86400n); // 1 day

      expect(stakeId).toBeDefined();

      const stake = oracle.getStake(stakeId);
      expect(stake.nodeId).toBe(nodeId1);
      expect(stake.amount).toBe(500n);
      expect(stake.isActive).toBe(true);
    });

    it('should unstake node tokens', async () => {
      const stakeId = await oracle.stakeNode(nodeId1, 500n, 86400n);

      await oracle.unstakeNode(stakeId);

      const stake = oracle.getStake(stakeId);
      expect(stake.isActive).toBe(false);
    });

    it('should claim staking rewards', async () => {
      const stakeId = await oracle.stakeNode(nodeId1, 500n, 86400n);

      const rewards = await oracle.claimStakingRewards(stakeId);
      expect(typeof rewards).toBe('bigint');
    });
  });

  describe('Slashing Operations', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );
    });

    it('should slash node for misbehavior', async () => {
      const slashId = await oracle.slashNode(
        nodeId1,
        'Submitted false data',
        SlashingSeverity.MAJOR,
        200n
      );

      expect(slashId).toBeDefined();

      const slash = oracle.getSlashingCondition(slashId);
      expect(slash.nodeId).toBe(nodeId1);
      expect(slash.reason).toBe('Submitted false data');
      expect(slash.severity).toBe(SlashingSeverity.MAJOR);
      expect(slash.amount).toBe(200n);
      expect(slash.isExecuted).toBe(false);
    });

    it('should execute slash condition', async () => {
      const slashId = await oracle.slashNode(
        nodeId1,
        'Consistent late responses',
        SlashingSeverity.MINOR,
        100n
      );

      await oracle.executeSlash(slashId);

      const slash = oracle.getSlashingCondition(slashId);
      expect(slash.isExecuted).toBe(true);
    });
  });

  describe('Network Metrics', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );

      nodeId2 = await oracle.registerNode(
        'https://oracle2.example.com',
        1500n,
        ['weather'],
        200,
        3000
      );

      requestId = await oracle.requestData(
        ['energy-price'],
        { symbol: 'WATT' },
        '0xcontract-address',
        'updatePrice',
        BigInt(Date.now() + 300000),
        100n,
        1,
        3,
        AggregationMethod.MEDIAN,
        1000000n
      );
    });

    it('should get network metrics', () => {
      const metrics = oracle.getNetworkMetrics();

      expect(metrics.totalNodes).toBe(2);
      expect(metrics.activeNodes).toBe(2);
      expect(metrics.totalRequests).toBe(1);
      expect(typeof metrics.averageResponseTime).toBe('number');
      expect(typeof metrics.networkHealth).toBe('number');
      expect(typeof metrics.dataQualityScore).toBe('number');
      expect(metrics.totalStaked).toBe(2500n);
    });

    it('should get network configuration', () => {
      const config = oracle.getNetworkConfig();

      expect(config.minStakeAmount).toBe(1000n);
      expect(config.maxNodes).toBe(100);
      expect(config.minReputationScore).toBe(300);
      expect(typeof config.networkFee).toBe('number');
    });

    it('should update network configuration', async () => {
      await oracle.updateNetworkConfig({
        minStakeAmount: 2000n,
        maxNodes: 150
      });

      const config = oracle.getNetworkConfig();
      expect(config.minStakeAmount).toBe(2000n);
      expect(config.maxNodes).toBe(150);
    });
  });

  describe('Governance Operations', () => {
    it('should propose governance change', async () => {
      const proposalId = await oracle.proposeGovernanceChange(
        GovernanceType.PARAMETER_CHANGE,
        'Increase minimum stake amount',
        { minStakeAmount: 2000n },
        BigInt(Date.now() + 86400000) // 1 day voting period
      );

      expect(proposalId).toBeDefined();

      const proposal = oracle.getGovernanceProposal(proposalId);
      expect(proposal.proposer).toBe(owner);
      expect(proposal.type).toBe(GovernanceType.PARAMETER_CHANGE);
      expect(proposal.executed).toBe(false);
    });

    it('should vote on proposal', async () => {
      const proposalId = await oracle.proposeGovernanceChange(
        GovernanceType.FEE_ADJUSTMENT,
        'Reduce network fee',
        { networkFee: 50 },
        BigInt(Date.now() + 86400000)
      );

      await oracle.voteOnProposal(proposalId, true);

      const proposal = oracle.getGovernanceProposal(proposalId);
      expect(proposal.votes).toHaveLength(1);
      expect(proposal.votes[0].support).toBe(true);
    });

    it('should execute governance proposal', async () => {
      const proposalId = await oracle.proposeGovernanceChange(
        GovernanceType.NODE_MANAGEMENT,
        'Update node requirements',
        { maxNodes: 200 },
        BigInt(Date.now() + 86400000)
      );

      await oracle.executeGovernanceProposal(proposalId);

      const proposal = oracle.getGovernanceProposal(proposalId);
      expect(proposal.executed).toBe(true);
    });
  });

  describe('Cross-Chain Operations', () => {
    it('should submit cross-chain data', async () => {
      const dataId = await oracle.submitCrossChainData(
        'ethereum',
        15000000n,
        { price: 1.25, volume: 1000000 },
        12
      );

      expect(dataId).toBeDefined();

      const data = oracle.getCrossChainData(dataId);
      expect(data.chainId).toBe('ethereum');
      expect(data.blockNumber).toBe(15000000n);
      expect(data.confirmations).toBe(12);
    });

    it('should validate cross-chain data', async () => {
      const dataId = await oracle.submitCrossChainData(
        'polygon',
        20000000n,
        { price: 1.30, volume: 500000 },
        15
      );

      await oracle.validateCrossChainData(dataId);

      const data = oracle.getCrossChainData(dataId);
      expect(typeof data.isValid).toBe('boolean');
    });
  });

  describe('Audit Operations', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );
    });

    it('should initiate audit', async () => {
      const auditId = await oracle.initiateAudit(
        nodeId1,
        AuditType.PERFORMANCE,
        '0xauditor-address'
      );

      expect(auditId).toBeDefined();

      const audit = oracle.getAudit(auditId);
      expect(audit.nodeId).toBe(nodeId1);
      expect(audit.auditType).toBe(AuditType.PERFORMANCE);
      expect(audit.auditor).toBe('0xauditor-address');
    });

    it('should submit audit report', async () => {
      const auditId = await oracle.initiateAudit(
        nodeId1,
        AuditType.SECURITY,
        '0xauditor-address'
      );

      const findings = [
        { severity: 'LOW', description: 'Minor optimization needed', impact: 'Low', recommendation: 'Update code' }
      ];
      const recommendations = ['Implement security best practices', 'Regular security audits'];

      await oracle.submitAuditReport(auditId, findings, 85, recommendations);

      const audit = oracle.getAudit(auditId);
      expect(audit.findings).toEqual(findings);
      expect(audit.score).toBe(85);
      expect(audit.recommendations).toEqual(recommendations);
    });
  });

  describe('Emergency Functions', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );
    });

    it('should emergency pause and unpause', () => {
      oracle.emergencyPause();
      // Network should be in emergency mode and paused

      oracle.emergencyUnpause();
      // Network should be out of emergency mode and unpaused
    });

    it('should emergency slash node', async () => {
      oracle.emergencyPause();

      await oracle.emergencySlashNode(nodeId1, 'Critical security breach');

      const slashes = oracle.getSlashingConditionsForNode(nodeId1);
      expect(slashes.length).toBeGreaterThan(0);
      
      const criticalSlash = slashes.find(s => s.severity === SlashingSeverity.CRITICAL);
      expect(criticalSlash).toBeDefined();
    });

    it('should emergency withdraw stake', async () => {
      oracle.emergencyPause();

      await oracle.emergencyWithdrawStake(nodeId1);

      const node = oracle.getNode(nodeId1);
      expect(node.stakeAmount).toBe(0n);
    });

    it('should emergency cancel request', async () => {
      requestId = await oracle.requestData(
        ['energy-price'],
        { symbol: 'WATT' },
        '0xcontract-address',
        'updatePrice',
        BigInt(Date.now() + 300000),
        100n,
        1,
        3,
        AggregationMethod.MEDIAN,
        1000000n
      );

      oracle.emergencyPause();

      await oracle.emergencyCancelRequest(requestId);

      const request = oracle.getRequest(requestId);
      expect(request.status).toBe(RequestStatus.CANCELLED);
    });
  });

  describe('Query Functions', () => {
    beforeEach(async () => {
      nodeId1 = await oracle.registerNode(
        'https://oracle1.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      );

      nodeId2 = await oracle.registerNode(
        'https://oracle2.example.com',
        1500n,
        ['weather'],
        200,
        3000
      );
    });

    it('should get all nodes', () => {
      const allNodes = oracle.getAllNodes();
      expect(allNodes.length).toBe(2);
    });

    it('should get active nodes', () => {
      const activeNodes = oracle.getActiveNodes();
      expect(activeNodes.length).toBe(2);
    });

    it('should get all data sources', () => {
      const dataSources = oracle.getDataSources();
      expect(dataSources.length).toBeGreaterThan(0); // Default sources
    });

    it('should get health checks', async () => {
      await oracle.performHealthCheck(nodeId1);
      await oracle.performHealthCheck(nodeId2);

      const healthChecks = oracle.getHealthChecks();
      expect(healthChecks.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent node', () => {
      expect(() => oracle.getNode('non-existent')).toThrow('Node not found');
      expect(() => oracle.getReputation('non-existent')).toThrow('Reputation not found');
    });

    it('should handle non-existent request', () => {
      expect(() => oracle.getRequest('non-existent')).toThrow('Request not found');
    });

    it('should handle non-existent response', () => {
      expect(() => oracle.getResponse('non-existent')).toThrow('Response not found');
    });

    it('should handle non-existent data source', () => {
      expect(() => oracle.getDataSource('non-existent')).toThrow('Data source not found');
    });

    it('should handle paused network operations', async () => {
      oracle.pauseNetwork();

      await expect(oracle.registerNode(
        'https://oracle3.example.com',
        1000n,
        ['energy-price'],
        250,
        5000
      )).rejects.toThrow('Network is paused');

      await expect(oracle.requestData(
        ['energy-price'],
        { symbol: 'WATT' },
        '0xcontract-address',
        'updatePrice',
        BigInt(Date.now() + 300000),
        100n,
        1,
        3,
        AggregationMethod.MEDIAN,
        1000000n
      )).rejects.toThrow('Network is paused');
    });
  });
});
