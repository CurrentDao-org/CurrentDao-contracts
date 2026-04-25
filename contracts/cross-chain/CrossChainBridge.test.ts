/**
 * Cross-Chain Bridge Contract Tests
 * Comprehensive test suite for universal blockchain bridge operations
 */

import { CrossChainBridge } from './CrossChainBridge';
import { TransferStatus, SecurityLevel, GovernanceType, EmergencyType, SwapStatus, SecurityType, RewardType, AuditScope } from './structures/CrossChainStructs';

describe('CrossChainBridge', () => {
  let bridge: CrossChainBridge;
  let owner: string;
  let user1: string;
  let user2: string;
  let transferId: string;
  let validatorId: string;
  let poolId: string;

  beforeEach(() => {
    bridge = new CrossChainBridge();
    owner = "0x0000000000000000000000000000000000000000";
    user1 = "0x1234567890123456789012345678901234567890";
    user2 = "0x0987654321098765432109876543210987654321";
  });

  describe('Bridge Initialization', () => {
    it('should initialize bridge with valid config', async () => {
      const config = {
        supportedChains: ['ethereum', 'polygon'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      };

      await bridge.initializeBridge(config);

      const retrievedConfig = bridge.getConfig();
      expect(retrievedConfig.supportedChains).toEqual(['ethereum', 'polygon']);
      expect(retrievedConfig.minConfirmations).toBe(6);
      expect(retrievedConfig.bridgeFee).toBe(30);
    });

    it('should throw error for invalid config', async () => {
      const invalidConfig = {
        supportedChains: [], // Invalid - empty chains
        minConfirmations: 0, // Invalid - zero confirmations
        maxTransferAmount: 0n, // Invalid - zero amount
        bridgeFee: -1, // Invalid - negative fee
        emergencyPause: false,
        liquidityThreshold: 0n,
        securityLevel: SecurityLevel.MEDIUM
      };

      await expect(bridge.initializeBridge(invalidConfig)).rejects.toThrow('Invalid bridge configuration');
    });

    it('should throw error for double initialization', async () => {
      const config = {
        supportedChains: ['ethereum'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      };

      await bridge.initializeBridge(config);

      await expect(bridge.initializeBridge(config)).rejects.toThrow('Bridge already initialized');
    });
  });

  describe('Chain Management', () => {
    beforeEach(async () => {
      await bridge.initializeBridge({
        supportedChains: ['ethereum'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      });
    });

    it('should add new chain', async () => {
      const chain = {
        chainId: 'polygon',
        name: 'Polygon',
        nativeToken: 'MATIC',
        blockTime: 2,
        finality: 10,
        bridgeContract: '0x1234567890123456789012345678901234567890',
        isActive: true,
        supportedTokens: ['WATT', 'USDC'],
        minGas: 21000n,
        maxGas: 20000000n
      };

      await bridge.addChain(chain);

      const retrievedChain = bridge.getChain('polygon');
      expect(retrievedChain.name).toBe('Polygon');
      expect(retrievedChain.nativeToken).toBe('MATIC');
    });

    it('should throw error for duplicate chain', async () => {
      const chain = {
        chainId: 'ethereum', // Already exists
        name: 'Ethereum',
        nativeToken: 'ETH',
        blockTime: 12,
        finality: 12,
        bridgeContract: '0x1234567890123456789012345678901234567890',
        isActive: true,
        supportedTokens: ['WATT'],
        minGas: 21000n,
        maxGas: 8000000n
      };

      await expect(bridge.addChain(chain)).rejects.toThrow('Chain already supported');
    });

    it('should remove chain', async () => {
      const chain = {
        chainId: 'arbitrum',
        name: 'Arbitrum',
        nativeToken: 'ETH',
        blockTime: 1,
        finality: 8,
        bridgeContract: '0x1234567890123456789012345678901234567890',
        isActive: true,
        supportedTokens: ['WATT'],
        minGas: 21000n,
        maxGas: 10000000n
      };

      await bridge.addChain(chain);
      await bridge.removeChain('arbitrum');

      expect(() => bridge.getChain('arbitrum')).toThrow('Chain not found');
    });

    it('should update chain metadata', async () => {
      const chain = {
        chainId: 'optimism',
        name: 'Optimism',
        nativeToken: 'ETH',
        blockTime: 1,
        finality: 8,
        bridgeContract: '0x1234567890123456789012345678901234567890',
        isActive: true,
        supportedTokens: ['WATT'],
        minGas: 21000n,
        maxGas: 10000000n
      };

      await bridge.addChain(chain);
      await bridge.updateChain('optimism', { name: 'Optimism Updated', blockTime: 2 });

      const updatedChain = bridge.getChain('optimism');
      expect(updatedChain.name).toBe('Optimism Updated');
      expect(updatedChain.blockTime).toBe(2);
    });

    it('should get supported chains', () => {
      const chains = bridge.getSupportedChains();
      expect(chains.length).toBeGreaterThan(0);
      expect(chains[0].isActive).toBe(true);
    });
  });

  describe('Token Management', () => {
    beforeEach(async () => {
      await bridge.initializeBridge({
        supportedChains: ['ethereum', 'polygon'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      });
    });

    it('should add new token', async () => {
      const token = {
        tokenId: 'TEST',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
        totalSupply: 1000000n * 10n**18n,
        chains: ['ethereum', 'polygon'],
        bridgeFee: 25,
        isActive: true,
        metadata: {
          icon: 'https://example.com/test.png',
          description: 'Test token for bridge',
          website: 'https://test.com',
          socialLinks: [],
          verificationStatus: 0 // PENDING
        }
      };

      await bridge.addToken(token);

      const retrievedToken = bridge.getToken('TEST');
      expect(retrievedToken.symbol).toBe('TEST');
      expect(retrievedToken.name).toBe('Test Token');
      expect(retrievedToken.chains).toEqual(['ethereum', 'polygon']);
    });

    it('should throw error for invalid token', async () => {
      const invalidToken = {
        tokenId: '', // Invalid - empty symbol
        symbol: '',
        name: 'Invalid Token',
        decimals: 18,
        totalSupply: 1000000n * 10n**18n,
        chains: ['ethereum'],
        bridgeFee: 25,
        isActive: true,
        metadata: {
          icon: '',
          description: '',
          website: '',
          socialLinks: [],
          verificationStatus: 0
        }
      };

      await expect(bridge.addToken(invalidToken)).rejects.toThrow('Invalid token configuration');
    });

    it('should remove token', async () => {
      const token = {
        tokenId: 'TEMP',
        symbol: 'TEMP',
        name: 'Temporary Token',
        decimals: 6,
        totalSupply: 500000n * 10n**6n,
        chains: ['ethereum'],
        bridgeFee: 20,
        isActive: true,
        metadata: {
          icon: '',
          description: '',
          website: '',
          socialLinks: [],
          verificationStatus: 0
        }
      };

      await bridge.addToken(token);
      await bridge.removeToken('TEMP');

      expect(() => bridge.getToken('TEMP')).toThrow('Token not found');
    });

    it('should update token metadata', async () => {
      const token = {
        tokenId: 'UPDATE',
        symbol: 'UPDATE',
        name: 'Update Token',
        decimals: 18,
        totalSupply: 1000000n * 10n**18n,
        chains: ['ethereum'],
        bridgeFee: 30,
        isActive: true,
        metadata: {
          icon: '',
          description: '',
          website: '',
          socialLinks: [],
          verificationStatus: 0
        }
      };

      await bridge.addToken(token);
      await bridge.updateToken('UPDATE', { name: 'Updated Token', bridgeFee: 35 });

      const updatedToken = bridge.getToken('UPDATE');
      expect(updatedToken.name).toBe('Updated Token');
      expect(updatedToken.bridgeFee).toBe(35);
    });

    it('should get supported tokens', () => {
      const tokens = bridge.getSupportedTokens();
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].isActive).toBe(true);
    });
  });

  describe('Transfer Operations', () => {
    beforeEach(async () => {
      await bridge.initializeBridge({
        supportedChains: ['ethereum', 'polygon'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      });

      // Add WATT token
      await bridge.addToken({
        tokenId: 'WATT',
        symbol: 'WATT',
        name: 'WATT Token',
        decimals: 18,
        totalSupply: 1000000000n * 10n**18n,
        chains: ['ethereum', 'polygon'],
        bridgeFee: 30,
        isActive: true,
        metadata: {
          icon: '',
          description: '',
          website: '',
          socialLinks: [],
          verificationStatus: 0
        }
      });
    });

    it('should initiate transfer', async () => {
      transferId = await bridge.initiateTransfer(
        'ethereum',
        'polygon',
        user1,
        user2,
        'WATT',
        1000n * 10n**18n,
        30n * 10n**18n // 30 GWEI
      );

      expect(transferId).toBeDefined();
      expect(transferId.length).toBe(66); // 0x + 64 hex chars

      const transfer = bridge.getTransfer(transferId);
      expect(transfer.fromChain).toBe('ethereum');
      expect(transfer.toChain).toBe('polygon');
      expect(transfer.fromAddress).toBe(user1);
      expect(transfer.toAddress).toBe(user2);
      expect(transfer.token).toBe('WATT');
      expect(transfer.amount).toBe(1000n * 10n**18n);
      expect(transfer.status).toBe(TransferStatus.PENDING);
    });

    it('should throw error for invalid transfer parameters', async () => {
      await expect(bridge.initiateTransfer(
        'ethereum', // Same chain
        'ethereum',
        user1,
        user2,
        'WATT',
        1000n * 10n**18n,
        30n * 10n**18n
      )).rejects.toThrow('Invalid transfer parameters');

      await expect(bridge.initiateTransfer(
        'ethereum',
        'polygon',
        user1,
        user2,
        'WATT',
        0n, // Invalid zero amount
        30n * 10n**18n
      )).rejects.toThrow('Invalid transfer parameters');

      await expect(bridge.initiateTransfer(
        'ethereum',
        'polygon',
        user1,
        user2,
        'UNKNOWN', // Unsupported token
        1000n * 10n**18n,
        30n * 10n**18n
      )).rejects.toThrow('Token not supported');
    });

    it('should throw error for insufficient fee', async () => {
      await expect(bridge.initiateTransfer(
        'ethereum',
        'polygon',
        user1,
        user2,
        'WATT',
        1000n * 10n**18n,
        1n // Insufficient fee
      )).rejects.toThrow('Insufficient bridge fee');
    });

    it('should confirm transfer', async () => {
      transferId = await bridge.initiateTransfer(
        'ethereum',
        'polygon',
        user1,
        user2,
        'WATT',
        1000n * 10n**18n,
        30n * 10n**18n
      );

      await bridge.confirmTransfer(transferId, 15000000n, '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');

      const transfer = bridge.getTransfer(transferId);
      expect(transfer.status).toBe(TransferStatus.CONFIRMED);
      expect(transfer.confirmations).toBe(1);
    });

    it('should validate transfer', async () => {
      transferId = await bridge.initiateTransfer(
        'ethereum',
        'polygon',
        user1,
        user2,
        'WATT',
        1000n * 10n**18n,
        30n * 10n**18n
      );

      await bridge.confirmTransfer(transferId, 15000000n, '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');

      validatorId = await bridge.registerValidator('ethereum', 1000n * 10n**18n, 50);

      await bridge.validateTransfer(transferId, validatorId, true, 'signature123');

      const validation = bridge.getValidation(bridge.getValidationsForTransfer(transferId)[0].validationId);
      expect(validation.transferId).toBe(transferId);
      expect(validation.validatorId).toBe(validatorId);
      expect(validation.isValid).toBe(true);
    });

    it('should relay and complete transfer', async () => {
      transferId = await bridge.initiateTransfer(
        'ethereum',
        'polygon',
        user1,
        user2,
        'WATT',
        1000n * 10n**18n,
        30n * 10n**18n
      );

      await bridge.confirmTransfer(transferId, 15000000n, '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      validatorId = await bridge.registerValidator('ethereum', 1000n * 10n**18n, 50);

      // Add multiple validations
      await bridge.validateTransfer(transferId, validatorId, true, 'signature1');
      await bridge.validateTransfer(transferId, validatorId, true, 'signature2');
      await bridge.validateTransfer(transferId, validatorId, true, 'signature3');

      await bridge.relayTransfer(transferId, 'relay_data_123');
      await bridge.completeTransfer(transferId);

      const transfer = bridge.getTransfer(transferId);
      expect(transfer.status).toBe(TransferStatus.COMPLETED);
      expect(transfer.completedAt).toBeDefined();
    });

    it('should cancel transfer', async () => {
      transferId = await bridge.initiateTransfer(
        'ethereum',
        'polygon',
        user1,
        user2,
        'WATT',
        1000n * 10n**18n,
        30n * 10n**18n
      );

      await bridge.cancelTransfer(transferId, 'User requested cancellation');

      const transfer = bridge.getTransfer(transferId);
      expect(transfer.status).toBe(TransferStatus.CANCELLED);
    });

    it('should calculate bridge fee', () => {
      const fee = bridge.calculateBridgeFee('ethereum', 'polygon', 'WATT', 1000n * 10n**18n);
      expect(typeof fee).toBe('bigint');
      expect(fee).toBeGreaterThan(0n);
    });

    it('should get transfers by status', () => {
      const pendingTransfers = bridge.getTransfersByStatus(TransferStatus.PENDING);
      expect(Array.isArray(pendingTransfers)).toBe(true);
    });

    it('should get transfers by chain', () => {
      const ethereumTransfers = bridge.getTransfersByChain('ethereum');
      expect(Array.isArray(ethereumTransfers)).toBe(true);
    });

    it('should get transfers by user', () => {
      const userTransfers = bridge.getTransfersByUser(user1);
      expect(Array.isArray(userTransfers)).toBe(true);
    });
  });

  describe('Liquidity Management', () => {
    beforeEach(async () => {
      await bridge.initializeBridge({
        supportedChains: ['ethereum', 'polygon'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      });
    });

    it('should create liquidity pool', async () => {
      poolId = await bridge.createLiquidityPool('WATT', 'ethereum', 25);

      expect(poolId).toBe('WATT_ethereum');

      const pool = bridge.getLiquidityPool(poolId);
      expect(pool.token).toBe('WATT');
      expect(pool.chain).toBe('ethereum');
      expect(pool.feeRate).toBe(25);
      expect(pool.totalLiquidity).toBe(0n);
    });

    it('should add liquidity', async () => {
      poolId = await bridge.createLiquidityPool('USDC', 'polygon', 20);

      const liquidityId = await bridge.addLiquidity(poolId, 5000n * 10n**6n);

      expect(liquidityId).toBeDefined();

      const pool = bridge.getLiquidityPool(poolId);
      expect(pool.totalLiquidity).toBe(5000n * 10n**6n);
      expect(pool.availableLiquidity).toBe(5000n * 10n**6n);
      expect(pool.liquidityProviders.length).toBe(1);
    });

    it('should remove liquidity', async () => {
      poolId = await bridge.createLiquidityPool('USDT', 'ethereum', 15);
      await bridge.addLiquidity(poolId, 3000n * 10n**6n);

      const withdrawId = await bridge.removeLiquidity(poolId, 1000n * 10n**6n);

      expect(withdrawId).toBeDefined();

      const pool = bridge.getLiquidityPool(poolId);
      expect(pool.totalLiquidity).toBe(2000n * 10n**6n);
      expect(pool.availableLiquidity).toBe(2000n * 10n**6n);
    });

    it('should get liquidity pools', () => {
      const pools = bridge.getLiquidityPools();
      expect(Array.isArray(pools)).toBe(true);
    });
  });

  describe('Validator Operations', () => {
    beforeEach(async () => {
      await bridge.initializeBridge({
        supportedChains: ['ethereum', 'polygon'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      });
    });

    it('should register validator', async () => {
      validatorId = await bridge.registerValidator('ethereum', 1000n * 10n**18n, 50);

      expect(validatorId).toBeDefined();
      expect(validatorId).toContain('validator_ethereum');

      const validator = bridge.getValidator(validatorId);
      expect(validator.chain).toBe('ethereum');
      expect(validator.stake).toBe(1000n * 10n**18n);
      expect(validator.commissionRate).toBe(50);
      expect(validator.isActive).toBe(true);
    });

    it('should throw error for unsupported chain', async () => {
      await expect(bridge.registerValidator('unsupported', 1000n * 10n**18n, 50))
        .rejects.toThrow('Chain not supported');
    });

    it('should update validator stake', async () => {
      validatorId = await bridge.registerValidator('polygon', 500n * 10n**18n, 30);

      await bridge.updateValidatorStake(validatorId, 200n * 10n**18n);

      const validator = bridge.getValidator(validatorId);
      expect(validator.stake).toBe(700n * 10n**18n);
    });

    it('should withdraw validator stake', async () => {
      validatorId = await bridge.registerValidator('ethereum', 300n * 10n**18n, 40);

      await bridge.withdrawValidatorStake(validatorId);

      const validator = bridge.getValidator(validatorId);
      expect(validator.stake).toBe(0n);
    });

    it('should get active validators', () => {
      const validators = bridge.getActiveValidators();
      expect(Array.isArray(validators)).toBe(true);
    });
  });

  describe('Governance Operations', () => {
    beforeEach(async () => {
      await bridge.initializeBridge({
        supportedChains: ['ethereum', 'polygon'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      });
    });

    it('should propose governance change', async () => {
      const proposalId = await bridge.proposeGovernanceChange(
        GovernanceType.PARAMETER_CHANGE,
        'Increase bridge fee to 0.5%',
        { bridgeFee: 50 },
        BigInt(Date.now() + 86400000) // 1 day from now
      );

      expect(proposalId).toBeDefined();

      const proposal = bridge.getGovernanceProposal(proposalId);
      expect(proposal.type).toBe(GovernanceType.PARAMETER_CHANGE);
      expect(proposal.description).toBe('Increase bridge fee to 0.5%');
      expect(proposal.executed).toBe(false);
    });

    it('should vote on proposal', async () => {
      const proposalId = await bridge.proposeGovernanceChange(
        GovernanceType.FEE_ADJUSTMENT,
        'Reduce bridge fee',
        { bridgeFee: 20 },
        BigInt(Date.now() + 86400000)
      );

      await bridge.voteOnProposal(proposalId, true);

      const proposal = bridge.getGovernanceProposal(proposalId);
      expect(proposal.votes).toHaveLength(1);
      expect(proposal.votes[0].support).toBe(true);
    });

    it('should execute governance proposal', async () => {
      const proposalId = await bridge.proposeGovernanceChange(
        GovernanceType.CHAIN_MANAGEMENT,
        'Add support for new chain',
        { newChain: 'arbitrum' },
        BigInt(Date.now() + 86400000)
      );

      await bridge.executeGovernanceProposal(proposalId);

      const proposal = bridge.getGovernanceProposal(proposalId);
      expect(proposal.executed).toBe(true);
    });

    it('should get active proposals', () => {
      const proposals = bridge.getActiveProposals();
      expect(Array.isArray(proposals)).toBe(true);
    });
  });

  describe('Emergency Operations', () => {
    beforeEach(async () => {
      await bridge.initializeBridge({
        supportedChains: ['ethereum', 'polygon'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      });
    });

    it('should initiate emergency action', async () => {
      const actionId = await bridge.initiateEmergencyAction(
        EmergencyType.PAUSE_TRANSFERS,
        'all',
        'Security breach detected'
      );

      expect(actionId).toBeDefined();

      const action = bridge.getEmergencyAction(actionId);
      expect(action.type).toBe(EmergencyType.PAUSE_TRANSFERS);
      expect(action.target).toBe('all');
      expect(action.reason).toBe('Security breach detected');
      expect(action.executed).toBe(false);
    });

    it('should approve emergency action', async () => {
      const actionId = await bridge.initiateEmergencyAction(
        EmergencyType.FREEZE_LIQUIDITY,
        'WATT_ethereum',
        'Liquidity pool manipulation detected'
      );

      await bridge.approveEmergencyAction(actionId);

      const action = bridge.getEmergencyAction(actionId);
      expect(action.approvals).toContain(owner);
    });

    it('should execute emergency action', async () => {
      const actionId = await bridge.initiateEmergencyAction(
        EmergencyType.EMERGENCY_WITHDRAW,
        'validator123',
        'Validator compromise detected'
      );

      await bridge.approveEmergencyAction(actionId);
      await bridge.executeEmergencyAction(actionId);

      const action = bridge.getEmergencyAction(actionId);
      expect(action.executed).toBe(true);
    });

    it('should get active emergency actions', () => {
      const actions = bridge.getActiveEmergencyActions();
      expect(Array.isArray(actions)).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    beforeEach(async () => {
      await bridge.initializeBridge({
        supportedChains: ['ethereum', 'polygon'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      });
    });

    it('should generate transfer ID', () => {
      const transferId = bridge.generateTransferId('ethereum', 'polygon', 123n);
      expect(transferId).toBeDefined();
      expect(transferId.length).toBe(66);
    });

    it('should validate transfer parameters', () => {
      const isValid = bridge.validateTransferParameters('ethereum', 'polygon', 'WATT', 1000n * 10n**18n);
      expect(isValid).toBe(true);

      const isInvalid = bridge.validateTransferParameters('ethereum', 'ethereum', 'WATT', 1000n * 10n**18n);
      expect(isInvalid).toBe(false);
    });

    it('should estimate transfer time', () => {
      const time = bridge.estimateTransferTime('ethereum', 'polygon');
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThan(0);
    });

    it('should calculate slippage', () => {
      const route = [
        {
          fromToken: 'WATT',
          toToken: 'USDC',
          chain: 'ethereum',
          exchange: 'uniswap',
          rate: 1.25,
          fee: 0.3
        }
      ];

      const slippage = bridge.calculateSlippage(1000n * 10n**18n, route);
      expect(typeof slippage).toBe('number');
      expect(slippage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Bridge Metrics', () => {
    beforeEach(async () => {
      await bridge.initializeBridge({
        supportedChains: ['ethereum', 'polygon'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      });

      // Add some test data
      await bridge.addToken({
        tokenId: 'WATT',
        symbol: 'WATT',
        name: 'WATT Token',
        decimals: 18,
        totalSupply: 1000000000n * 10n**18n,
        chains: ['ethereum', 'polygon'],
        bridgeFee: 30,
        isActive: true,
        metadata: {
          icon: '',
          description: '',
          website: '',
          socialLinks: [],
          verificationStatus: 0
        }
      });
    });

    it('should get bridge metrics', () => {
      const metrics = bridge.getBridgeMetrics();

      expect(typeof metrics.totalTransfers).toBe('number');
      expect(typeof metrics.successfulTransfers).toBe('number');
      expect(typeof metrics.totalVolume).toBe('bigint');
      expect(typeof metrics.totalFees).toBe('bigint');
      expect(typeof metrics.activeValidators).toBe('number');
      expect(typeof metrics.totalLiquidity).toBe('bigint');
      expect(typeof metrics.averageTransferTime).toBe('number');
      expect(typeof metrics.chainUtilization).toBe('object');
      expect(typeof metrics.tokenUtilization).toBe('object');
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations on uninitialized bridge', async () => {
      const uninitializedBridge = new CrossChainBridge();

      await expect(uninitializedBridge.initiateTransfer(
        'ethereum',
        'polygon',
        user1,
        user2,
        'WATT',
        1000n * 10n**18n,
        30n * 10n**18n
      )).rejects.toThrow('Bridge not initialized');

      await expect(uninitializedBridge.addChain({
        chainId: 'test',
        name: 'Test',
        nativeToken: 'TEST',
        blockTime: 1,
        finality: 1,
        bridgeContract: '0x1234567890123456789012345678901234567890',
        isActive: true,
        supportedTokens: [],
        minGas: 21000n,
        maxGas: 8000000n
      })).rejects.toThrow('Bridge not initialized');
    });

    it('should handle non-existent entities', () => {
      expect(() => bridge.getTransfer('non-existent')).toThrow('Transfer not found');
      expect(() => bridge.getChain('non-existent')).toThrow('Chain not found');
      expect(() => bridge.getToken('non-existent')).toThrow('Token not found');
      expect(() => bridge.getValidator('non-existent')).toThrow('Validator not found');
      expect(() => bridge.getLiquidityPool('non-existent')).toThrow('Liquidity pool not found');
      expect(() => bridge.getGovernanceProposal('non-existent')).toThrow('Proposal not found');
      expect(() => bridge.getEmergencyAction('non-existent')).toThrow('Emergency action not found');
    });

    it('should handle invalid addresses', async () => {
      await bridge.initializeBridge({
        supportedChains: ['ethereum'],
        minConfirmations: 6,
        maxTransferAmount: 1000000n * 10n**18n,
        bridgeFee: 30,
        emergencyPause: false,
        liquidityThreshold: 100000n * 10n**18n,
        securityLevel: SecurityLevel.MEDIUM
      });

      await expect(bridge.confirmTransfer(
        'test',
        15000000n,
        'invalid_hash' // Invalid transaction hash
      )).rejects.toThrow('Invalid transaction hash');
    });
  });
});
