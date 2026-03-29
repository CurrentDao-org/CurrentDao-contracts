"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EmergencyPause_1 = require("../../contracts/emergency/EmergencyPause");
const PauseStructure_1 = require("../../contracts/emergency/structures/PauseStructure");
/**
 * Integration tests for Emergency Pause System with existing platform contracts
 */
describe('Emergency Pause Integration Tests', () => {
    let emergencyPause;
    let governanceMembers;
    let testConfig;
    let mockContracts;
    // Mock existing platform contracts
    class MockContract {
        address;
        isPaused = false;
        operations = [];
        contractType;
        constructor(address, contractType) {
            this.address = address;
            this.contractType = contractType;
        }
        async executeOperation(operation) {
            if (this.isPaused) {
                throw new Error(`Contract ${this.address} is paused due to emergency`);
            }
            this.operations.push(operation);
            return `Operation ${operation} executed successfully`;
        }
        pause() {
            this.isPaused = true;
        }
        resume() {
            this.isPaused = false;
        }
        getState() {
            return {
                isPaused: this.isPaused,
                operations: [...this.operations],
                contractType: this.contractType
            };
        }
    }
    beforeEach(() => {
        governanceMembers = [
            '0x1234567890123456789012345678901234567890',
            '0x2345678901234567890123456789012345678901',
            '0x3456789012345678901234567890123456789012',
            '0x4567890123456789012345678901234567890123',
            '0x5678901234567890123456789012345678901234'
        ];
        // Critical contracts representing existing platform contracts
        const criticalContracts = [
            '0xTokenContract', // Token contract
            '0xDaoContract', // DAO contract
            '0xEscrowContract', // Escrow contract
            '0xFeesContract', // Fees contract
            '0xSecurityContract' // Security contract
        ];
        testConfig = {
            ...PauseStructure_1.DEFAULT_EMERGENCY_CONFIG,
            governanceMembers,
            criticalContracts,
            requiredSignatures: 3,
            maxPauseDuration: 3600
        };
        emergencyPause = new EmergencyPause_1.EmergencyPause(governanceMembers, testConfig);
        // Initialize mock contracts
        mockContracts = new Map();
        criticalContracts.forEach(address => {
            const contractType = address.replace('0x', '').replace('Contract', '').toLowerCase();
            mockContracts.set(address, new MockContract(address, contractType));
        });
        // Setup event handlers to integrate with mock contracts
        setupContractIntegration();
    });
    /**
     * @dev Sets up integration between emergency pause and mock contracts
     */
    function setupContractIntegration() {
        // Override emergency pause methods to interact with mock contracts
        const originalEmergencyPause = emergencyPause.emergencyPause.bind(emergencyPause);
        emergencyPause.emergencyPause = async (level, reason, duration, affectedContracts) => {
            await originalEmergencyPause(level, reason, duration, affectedContracts);
            // Pause affected mock contracts
            affectedContracts.forEach(contractAddress => {
                const contract = mockContracts.get(contractAddress);
                if (contract) {
                    contract.pause();
                }
            });
        };
        const originalResumeOperations = emergencyPause.resumeOperations.bind(emergencyPause);
        emergencyPause.resumeOperations = async (level, signatures, proof) => {
            await originalResumeOperations(level, signatures, proof);
            // Resume affected mock contracts
            const status = await emergencyPause.getPauseStatus();
            status.affectedContracts.forEach(contractAddress => {
                const contract = mockContracts.get(contractAddress);
                if (contract) {
                    contract.resume();
                }
            });
        };
    }
    describe('Contract State Integration', () => {
        it('should pause specific contracts during SELECTIVE pause', async () => {
            const affectedContracts = ['0xTokenContract', '0xDaoContract'];
            // Execute normal operations before pause
            await mockContracts.get('0xTokenContract').executeOperation('transfer');
            await mockContracts.get('0xDaoContract').executeOperation('create_proposal');
            await mockContracts.get('0xEscrowContract').executeOperation('deposit');
            // Initiate selective pause
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Security vulnerability in token and DAO contracts', 3600, affectedContracts);
            // Verify affected contracts are paused
            expect(mockContracts.get('0xTokenContract').isPaused).toBe(true);
            expect(mockContracts.get('0xDaoContract').isPaused).toBe(true);
            // Verify non-affected contracts are not paused
            expect(mockContracts.get('0xEscrowContract').isPaused).toBe(false);
            // Verify operations fail on paused contracts
            await expect(mockContracts.get('0xTokenContract').executeOperation('transfer')).rejects.toThrow('is paused due to emergency');
            await expect(mockContracts.get('0xDaoContract').executeOperation('vote')).rejects.toThrow('is paused due to emergency');
            // Verify operations succeed on non-paused contracts
            await expect(mockContracts.get('0xEscrowContract').executeOperation('withdraw')).resolves.toBeDefined();
        });
        it('should pause all critical contracts during PARTIAL pause', async () => {
            // Initiate partial pause
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.PARTIAL, 'Critical bug discovered in platform core', 7200, []);
            // Verify all critical contracts are paused
            testConfig.criticalContracts.forEach(contractAddress => {
                const contract = mockContracts.get(contractAddress);
                expect(contract.isPaused).toBe(true);
            });
            // Verify all operations fail
            for (const [address, contract] of mockContracts) {
                await expect(contract.executeOperation('test_operation')).rejects.toThrow('is paused due to emergency');
            }
        });
        it('should pause all contracts during FULL pause', async () => {
            // Add some non-critical contracts
            mockContracts.set('0xUtilityContract', new MockContract('0xUtilityContract', 'utility'));
            mockContracts.set('0xOracleContract', new MockContract('0xOracleContract', 'oracle'));
            // Initiate full pause
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.FULL, 'System-wide security emergency', 86400, []);
            // Verify all contracts are paused
            for (const [address, contract] of mockContracts) {
                expect(contract.isPaused).toBe(true);
            }
        });
        it('should resume operations correctly', async () => {
            const affectedContracts = ['0xTokenContract', '0xDaoContract'];
            // Pause contracts
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Test pause', 3600, affectedContracts);
            // Verify contracts are paused
            expect(mockContracts.get('0xTokenContract').isPaused).toBe(true);
            expect(mockContracts.get('0xDaoContract').isPaused).toBe(true);
            // Resume operations
            await emergencyPause.resumeOperations(PauseStructure_1.PauseLevel.SELECTIVE, ['sig1', 'sig2', 'sig3'], 'proof');
            // Verify contracts are resumed
            expect(mockContracts.get('0xTokenContract').isPaused).toBe(false);
            expect(mockContracts.get('0xDaoContract').isPaused).toBe(false);
            // Verify operations succeed
            await expect(mockContracts.get('0xTokenContract').executeOperation('transfer')).resolves.toBeDefined();
            await expect(mockContracts.get('0xDaoContract').executeOperation('create_proposal')).resolves.toBeDefined();
        });
    });
    describe('Cross-Contract Communication', () => {
        it('should maintain contract state consistency during pause/resume', async () => {
            // Execute some operations
            await mockContracts.get('0xTokenContract').executeOperation('mint');
            await mockContracts.get('0xDaoContract').executeOperation('create_proposal');
            const tokenStateBefore = mockContracts.get('0xTokenContract').getState();
            const daoStateBefore = mockContracts.get('0xDaoContract').getState();
            // Pause contracts
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'State consistency test', 3600, ['0xTokenContract', '0xDaoContract']);
            // Verify states are preserved during pause
            const tokenStateDuring = mockContracts.get('0xTokenContract').getState();
            const daoStateDuring = mockContracts.get('0xDaoContract').getState();
            expect(tokenStateDuring.operations).toEqual(tokenStateBefore.operations);
            expect(daoStateDuring.operations).toEqual(daoStateBefore.operations);
            // Resume contracts
            await emergencyPause.resumeOperations(PauseStructure_1.PauseLevel.SELECTIVE, ['sig1', 'sig2', 'sig3'], 'proof');
            // Verify states are preserved after resume
            const tokenStateAfter = mockContracts.get('0xTokenContract').getState();
            const daoStateAfter = mockContracts.get('0xDaoContract').getState();
            expect(tokenStateAfter.operations).toEqual(tokenStateBefore.operations);
            expect(daoStateAfter.operations).toEqual(daoStateBefore.operations);
        });
        it('should handle concurrent operations during pause transition', async () => {
            // Start multiple operations concurrently
            const operations = [
                mockContracts.get('0xTokenContract').executeOperation('transfer'),
                mockContracts.get('0xDaoContract').executeOperation('vote'),
                mockContracts.get('0xEscrowContract').executeOperation('deposit')
            ];
            // Initiate pause while operations are running
            const pausePromise = emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Concurrent operations test', 3600, ['0xTokenContract', '0xDaoContract']);
            // Wait for all operations to complete
            const results = await Promise.allSettled(operations);
            // Some operations should fail due to pause
            expect(results[0].status).toBe('rejected'); // Token contract should be paused
            expect(results[1].status).toBe('rejected'); // DAO contract should be paused
            expect(results[2].status).toBe('fulfilled'); // Escrow contract should not be paused
            await pausePromise;
        });
    });
    describe('Gas Optimization Integration', () => {
        it('should optimize gas usage for multiple contract pauses', async () => {
            // Measure gas usage for selective pause
            const gasData = await emergencyPause.getGasOptimizationData();
            // Initiate pause with multiple contracts
            const startTime = Date.now();
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Gas optimization test', 3600, ['0xTokenContract', '0xDaoContract', '0xEscrowContract']);
            const endTime = Date.now();
            // Verify pause was efficient
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
            // Verify gas estimates are reasonable
            expect(gasData.pauseGasCost).toBeGreaterThan(0);
            expect(gasData.pauseGasCost).toBeLessThan(500000); // Should be under 500k gas
        });
        it('should batch contract state updates efficiently', async () => {
            // Add many contracts to test batching
            for (let i = 0; i < 50; i++) {
                mockContracts.set(`0xContract${i}`, new MockContract(`0xContract${i}`, 'test'));
            }
            const contractAddresses = Array.from(mockContracts.keys()).slice(0, 20);
            // Measure performance
            const startTime = Date.now();
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Batch update test', 3600, contractAddresses);
            const endTime = Date.now();
            // Should handle many contracts efficiently
            expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
            // Verify all contracts were paused
            contractAddresses.forEach(address => {
                expect(mockContracts.get(address).isPaused).toBe(true);
            });
        });
    });
    describe('Event-Driven Integration', () => {
        it('should emit events that other contracts can listen to', async () => {
            const events = [];
            // Setup event listeners
            const eventHandlers = {
                EmergencyPauseInitiated: (event) => {
                    events.push({ type: 'pause_initiated', data: event });
                },
                EmergencyPauseResumed: (event) => {
                    events.push({ type: 'pause_resumed', data: event });
                },
                GovernanceActionExecuted: (event) => {
                    events.push({ type: 'governance_action', data: event });
                },
                AutoResumeTriggered: (event) => {
                    events.push({ type: 'auto_resume', data: event });
                },
                EmergencyConfigUpdated: (event) => {
                    events.push({ type: 'config_updated', data: event });
                }
            };
            // Create new emergency pause instance with event handlers
            const eventfulPause = new EmergencyPause_1.EmergencyPause(governanceMembers, testConfig, eventHandlers);
            // Trigger events
            await eventfulPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Event test', 3600, ['0xTokenContract']);
            await eventfulPause.resumeOperations(PauseStructure_1.PauseLevel.SELECTIVE, ['sig1', 'sig2', 'sig3'], 'proof');
            // Verify events were emitted
            expect(events).toHaveLength(2);
            expect(events[0].type).toBe('pause_initiated');
            expect(events[1].type).toBe('pause_resumed');
        });
        it('should allow contracts to react to pause events', async () => {
            const reactions = [];
            // Mock contract that reacts to pause events
            class ReactiveContract extends MockContract {
                constructor(address) {
                    super(address, 'reactive');
                }
                onPauseInitiated(event) {
                    reactions.push(`${this.address} reacted to pause: ${event.reason}`);
                }
                onPauseResumed(event) {
                    reactions.push(`${this.address} reacted to resume`);
                }
            }
            const reactiveContract = new ReactiveContract('0xReactiveContract');
            mockContracts.set('0xReactiveContract', reactiveContract);
            // Setup event handlers
            const eventHandlers = {
                EmergencyPauseInitiated: (event) => {
                    reactiveContract.onPauseInitiated(event);
                },
                EmergencyPauseResumed: (event) => {
                    reactiveContract.onPauseResumed(event);
                },
                GovernanceActionExecuted: () => { },
                AutoResumeTriggered: () => { },
                EmergencyConfigUpdated: () => { }
            };
            const eventfulPause = new EmergencyPause_1.EmergencyPause(governanceMembers, testConfig, eventHandlers);
            // Trigger pause/resume cycle
            await eventfulPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Reactive test', 3600, ['0xReactiveContract']);
            await eventfulPause.resumeOperations(PauseStructure_1.PauseLevel.SELECTIVE, ['sig1', 'sig2', 'sig3'], 'proof');
            // Verify contract reacted to events
            expect(reactions).toHaveLength(2);
            expect(reactions[0]).toContain('reacted to pause');
            expect(reactions[1]).toContain('reacted to resume');
        });
    });
    describe('Security Integration', () => {
        it('should prevent unauthorized contract interactions during pause', async () => {
            // Pause contracts
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Security test', 3600, ['0xTokenContract']);
            // Attempt unauthorized operations
            const unauthorizedOperations = [
                () => mockContracts.get('0xTokenContract').executeOperation('unauthorized_transfer'),
                () => mockContracts.get('0xTokenContract').executeOperation('unauthorized_mint'),
                () => mockContracts.get('0xTokenContract').executeOperation('unauthorized_burn')
            ];
            // All should fail
            for (const operation of unauthorizedOperations) {
                await expect(operation()).rejects.toThrow('is paused due to emergency');
            }
        });
        it('should maintain security guarantees during resume', async () => {
            // Pause contracts
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Security resume test', 3600, ['0xTokenContract', '0xDaoContract']);
            // Attempt operations during pause (should fail)
            await expect(mockContracts.get('0xTokenContract').executeOperation('transfer')).rejects.toThrow('is paused due to emergency');
            // Resume operations
            await emergencyPause.resumeOperations(PauseStructure_1.PauseLevel.SELECTIVE, ['sig1', 'sig2', 'sig3'], 'proof');
            // Verify security is maintained after resume
            await expect(mockContracts.get('0xTokenContract').executeOperation('transfer')).resolves.toBeDefined();
            // Verify other contracts are still secure
            expect(mockContracts.get('0xEscrowContract').isPaused).toBe(false);
        });
    });
    describe('Performance Integration', () => {
        it('should handle high-frequency operations efficiently', async () => {
            const operationCount = 100;
            const operations = [];
            // Generate high-frequency operations
            for (let i = 0; i < operationCount; i++) {
                operations.push(mockContracts.get('0xTokenContract').executeOperation(`transfer_${i}`));
            }
            // Execute operations
            const startTime = Date.now();
            const results = await Promise.allSettled(operations);
            const endTime = Date.now();
            // All should succeed
            expect(results.every(r => r.status === 'fulfilled')).toBe(true);
            // Should be efficient
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
            // Now test with pause in progress
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Performance test', 3600, ['0xTokenContract']);
            // Operations should fail quickly
            const pauseOperations = [];
            for (let i = 0; i < 10; i++) {
                pauseOperations.push(mockContracts.get('0xTokenContract').executeOperation(`transfer_pause_${i}`));
            }
            const pauseStartTime = Date.now();
            const pauseResults = await Promise.allSettled(pauseOperations);
            const pauseEndTime = Date.now();
            // All should fail quickly
            expect(pauseResults.every(r => r.status === 'rejected')).toBe(true);
            expect(pauseEndTime - pauseStartTime).toBeLessThan(1000); // Should fail within 1 second
        });
        it('should maintain system performance during emergency scenarios', async () => {
            // Simulate emergency scenario with multiple contracts
            const emergencyContracts = ['0xTokenContract', '0xDaoContract', '0xEscrowContract'];
            // Start background operations
            const backgroundOps = [];
            emergencyContracts.forEach(contract => {
                for (let i = 0; i < 10; i++) {
                    backgroundOps.push(mockContracts.get(contract).executeOperation(`bg_op_${i}`));
                }
            });
            // Initiate emergency pause
            const pausePromise = emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Emergency performance test', 3600, emergencyContracts);
            // Wait for pause to complete
            await pausePromise;
            // System should remain responsive
            const status = await emergencyPause.getPauseStatus();
            expect(status.isActive).toBe(true);
            // Analytics should be available
            const analytics = await emergencyPause.getPauseAnalytics();
            expect(analytics.totalPauses).toBe(1);
        });
    });
    describe('Error Handling Integration', () => {
        it('should handle contract integration errors gracefully', async () => {
            // Create a faulty contract that throws errors
            class FaultyContract extends MockContract {
                constructor(address) {
                    super(address, 'faulty');
                }
                async executeOperation(operation) {
                    if (this.isPaused) {
                        throw new Error(`Faulty contract ${this.address} is paused`);
                    }
                    if (operation === 'error_operation') {
                        throw new Error('Intentional error for testing');
                    }
                    return super.executeOperation(operation);
                }
            }
            const faultyContract = new FaultyContract('0xFaultyContract');
            mockContracts.set('0xFaultyContract', faultyContract);
            // Test normal operation
            await expect(faultyContract.executeOperation('normal_operation')).resolves.toBeDefined();
            // Test error operation
            await expect(faultyContract.executeOperation('error_operation')).rejects.toThrow('Intentional error');
            // Test pause behavior
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Error handling test', 3600, ['0xFaultyContract']);
            await expect(faultyContract.executeOperation('normal_operation')).rejects.toThrow('Faulty contract is paused');
        });
        it('should recover from integration failures', async () => {
            // Simulate integration failure
            const originalExecute = mockContracts.get('0xTokenContract').executeOperation;
            // Temporarily break the contract
            mockContracts.get('0xTokenContract').executeOperation = async () => {
                throw new Error('Integration failure');
            };
            // Pause should still work
            await emergencyPause.emergencyPause(PauseStructure_1.PauseLevel.SELECTIVE, 'Recovery test', 3600, ['0xTokenContract']);
            // Restore contract
            mockContracts.get('0xTokenContract').executeOperation = originalExecute;
            // Resume should work
            await emergencyPause.resumeOperations(PauseStructure_1.PauseLevel.SELECTIVE, ['sig1', 'sig2', 'sig3'], 'proof');
            // Operations should work again
            await expect(mockContracts.get('0xTokenContract').executeOperation('transfer')).resolves.toBeDefined();
        });
    });
});
//# sourceMappingURL=Integration.test.js.map