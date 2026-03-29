import { AdvancedMultiSig } from '../../contracts/multisig/AdvancedMultiSig';
import {
    EmergencyActionType,
    HierarchicalThresholdRule,
    TransactionStatus,
    WorkflowMode
} from '../../contracts/multisig/structures/WorkflowStructure';

describe('AdvancedMultiSig', () => {
    const owner1 = '0xOwner1';
    const owner2 = '0xOwner2';
    const owner3 = '0xOwner3';
    const owner4 = '0xOwner4';
    const owner5 = '0xOwner5';
    const owners = [owner1, owner2, owner3, owner4, owner5];

    const tierRules: HierarchicalThresholdRule[] = [
        {
            id: 'small',
            minAmount: 0,
            maxAmount: 10000,
            requiredSignatures: 2,
            eligibleSigners: [owner1, owner2, owner3],
            minExecutionDelayMs: 1000
        },
        {
            id: 'large',
            minAmount: 10001,
            maxAmount: Number.MAX_SAFE_INTEGER,
            requiredSignatures: 3,
            eligibleSigners: [owner1, owner2, owner3, owner4, owner5],
            minExecutionDelayMs: 1000
        }
    ];

    let multisig: AdvancedMultiSig;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

        multisig = new AdvancedMultiSig(owners, tierRules, {
            signatureTimelockMs: 1000,
            transactionExpiryMs: 7 * 24 * 60 * 60 * 1000,
            emergencySuperMajorityPct: 75,
            defaultWorkflowMode: WorkflowMode.PARALLEL
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('supports hierarchical signatures for small and large transaction tiers', () => {
        expect(multisig.getRequiredSignaturesForAmount(1000)).toBe(2);
        expect(multisig.getRequiredSignaturesForAmount(500000)).toBe(3);
    });

    it('enforces time-based signature locks', () => {
        const txId = multisig.submitTransaction('Governance', 1000, '0xabc', owner1);

        expect(() => {
            multisig.confirmTransaction(txId, owner1);
        }).toThrow('AdvancedMultiSig: stage timelock active');

        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId, owner1);

        expect(multisig.getTransaction(txId).confirmationCount).toBe(1);
    });

    it('supports sequential approval workflows', () => {
        multisig.registerWorkflow(
            {
                id: 'wf_sequential',
                name: 'Sequential Risk Review',
                mode: WorkflowMode.SEQUENTIAL,
                stages: [
                    {
                        id: 'risk',
                        name: 'Risk Committee',
                        approvers: [owner1, owner2],
                        minApprovals: 2,
                        timelockMs: 1000
                    },
                    {
                        id: 'treasury',
                        name: 'Treasury Committee',
                        approvers: [owner3, owner4],
                        minApprovals: 1,
                        timelockMs: 1000
                    }
                ]
            },
            owner1
        );

        const txId = multisig.submitTransaction('FeeManager', 20000, '0x123', owner1, 'wf_sequential');

        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId, owner1, 'risk');
        multisig.confirmTransaction(txId, owner2, 'risk');

        expect(() => {
            multisig.confirmTransaction(txId, owner3, 'treasury');
        }).toThrow('AdvancedMultiSig: stage timelock active');

        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId, owner3, 'treasury');

        const tx = multisig.getTransaction(txId);
        expect(tx.currentStageIndex).toBe(2);
        expect(tx.status).toBe(TransactionStatus.READY);
    });

    it('supports parallel approval workflows', () => {
        multisig.registerWorkflow(
            {
                id: 'wf_parallel',
                name: 'Parallel Review',
                mode: WorkflowMode.PARALLEL,
                stages: [
                    {
                        id: 'legal',
                        name: 'Legal',
                        approvers: [owner1, owner2, owner5],
                        minApprovals: 1,
                        timelockMs: 1000
                    },
                    {
                        id: 'ops',
                        name: 'Ops',
                        approvers: [owner3, owner4],
                        minApprovals: 1,
                        timelockMs: 1000
                    }
                ]
            },
            owner1
        );

        const txId = multisig.submitTransaction('TimelockController', 20000, '0x234', owner1, 'wf_parallel');

        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId, owner1, 'legal');
        multisig.confirmTransaction(txId, owner3, 'ops');
        multisig.confirmTransaction(txId, owner5, 'legal');

        expect(multisig.getTransaction(txId).status).toBe(TransactionStatus.READY);
    });

    it('allows signature revocation before execution', () => {
        const txId = multisig.submitTransaction('Governance', 7000, '0xrev', owner1);

        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId, owner1);
        multisig.confirmTransaction(txId, owner2);

        expect(multisig.getTransaction(txId).status).toBe(TransactionStatus.READY);

        multisig.revokeSignature(txId, owner2);
        const tx = multisig.getTransaction(txId);

        expect(tx.confirmationCount).toBe(1);
        expect(tx.status).toBe(TransactionStatus.PENDING);
    });

    it('resets downstream approvals if an upstream sequential stage is revoked', () => {
        multisig.registerWorkflow(
            {
                id: 'wf_revocation_reset',
                name: 'Revocation Reset Workflow',
                mode: WorkflowMode.SEQUENTIAL,
                stages: [
                    {
                        id: 'stage_one',
                        name: 'Stage One',
                        approvers: [owner1, owner2],
                        minApprovals: 2,
                        timelockMs: 1000
                    },
                    {
                        id: 'stage_two',
                        name: 'Stage Two',
                        approvers: [owner3, owner4],
                        minApprovals: 1,
                        timelockMs: 1000
                    }
                ]
            },
            owner1
        );

        const txId = multisig.submitTransaction('Governance', 20000, '0xrst', owner1, 'wf_revocation_reset');
        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId, owner1, 'stage_one');
        multisig.confirmTransaction(txId, owner2, 'stage_one');

        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId, owner3, 'stage_two');
        expect(multisig.getTransaction(txId).status).toBe(TransactionStatus.READY);

        multisig.revokeSignature(txId, owner1, 'stage_one');

        const tx = multisig.getTransaction(txId);
        expect(tx.status).toBe(TransactionStatus.PENDING);
        expect(tx.stageApprovals.stage_one).toEqual([owner2]);
        expect(tx.stageApprovals.stage_two).toHaveLength(0);
    });

    it('optimizes gas for batched transactions and executes them together', () => {
        const batchId = multisig.submitBatch(
            [
                { to: 'Governance', value: 1000, data: '0x1' },
                { to: 'FeeManager', value: 2000, data: '0x2' },
                { to: 'TimelockController', value: 3000, data: '0x3' }
            ],
            owner1
        );

        const batch = multisig.getBatchPlan(batchId);
        expect(batch.estimatedBatchGas).toBeLessThan(batch.estimatedStandaloneGas);
        expect(batch.gasSavings).toBeGreaterThan(0);

        jest.advanceTimersByTime(1000);
        batch.transactionIds.forEach((txId) => {
            multisig.confirmTransaction(txId, owner1);
            multisig.confirmTransaction(txId, owner2);
        });

        const executed = multisig.executeBatch(batchId, owner3);
        expect(executed).toHaveLength(3);

        executed.forEach((txId) => {
            expect(multisig.getTransaction(txId).status).toBe(TransactionStatus.EXECUTED);
        });
    });

    it('requires super-majority approvals for emergency override', () => {
        const txId = multisig.submitTransaction('EmergencyPause', 500000, '0xemergency', owner1);

        const overrideId = multisig.requestEmergencyOverride(
            txId,
            EmergencyActionType.EXECUTE_TRANSACTION,
            'Critical security response',
            owner1
        );

        multisig.approveEmergencyOverride(overrideId, owner2);
        multisig.approveEmergencyOverride(overrideId, owner3);

        expect(() => {
            multisig.executeEmergencyOverride(overrideId, owner4);
        }).toThrow('AdvancedMultiSig: emergency override requires super-majority approvals');

        multisig.approveEmergencyOverride(overrideId, owner4);
        multisig.executeEmergencyOverride(overrideId, owner5);

        expect(multisig.getTransaction(txId).status).toBe(TransactionStatus.EXECUTED);
    });

    it('tracks signature analytics and approval delays', () => {
        const txId = multisig.submitTransaction('Governance', 3000, '0xmetrics', owner1);

        jest.advanceTimersByTime(2000);
        multisig.confirmTransaction(txId, owner1);

        jest.advanceTimersByTime(3000);
        multisig.confirmTransaction(txId, owner2);

        const signerOne = multisig.getSignerAnalytics(owner1);
        const signerTwo = multisig.getSignerAnalytics(owner2);
        const system = multisig.getSystemAnalytics();

        expect(signerOne.averageDelayMs).toBe(2000);
        expect(signerTwo.averageDelayMs).toBe(5000);
        expect(system.totalSignatures).toBe(2);
        expect(system.averageConfirmationDelayMs).toBe(3500);
    });

    it('executes integration hooks for all platform contracts', () => {
        const platformContracts = [
            'AccessControlList',
            'Governance',
            'QualityRating',
            'EnergyEscrow',
            'PriceOracle',
            'TimelockController',
            'EmergencyPause',
            'FeeManager',
            'DynamicFeeSwitch',
            'BatchProcessor',
            'UsageAnalytics',
            'GovernanceAnalytics',
            'MultiChainLiquidityPool',
            'LocationRegistry',
            'YieldFarming',
            'SecurityMonitor',
            'ReentrancyGuard',
            'RegulatoryReporting',
            'UpgradeManager',
            'EmergencyMigration',
            'ZeroKnowledgeProof',
            'AssetWrapper',
            'DAOMultiSig',
            'GasOptimizer'
        ];

        const hooks = new Map<string, jest.Mock>();
        platformContracts.forEach((contractId) => {
            const hook = jest.fn();
            hooks.set(contractId, hook);
            multisig.registerIntegration(contractId, hook, owner1);
        });

        platformContracts.forEach((contractId) => {
            const txId = multisig.submitTransaction(contractId, 4000, `0x${contractId}`, owner1);
            jest.advanceTimersByTime(1000);
            multisig.confirmTransaction(txId, owner1);
            multisig.confirmTransaction(txId, owner2);
            multisig.executeTransaction(txId, owner3);
        });

        platformContracts.forEach((contractId) => {
            const hook = hooks.get(contractId)!;
            expect(hook).toHaveBeenCalledTimes(1);
        });
    });

    it('enforces owner-only access on sensitive methods', () => {
        expect(() => {
            multisig.submitTransaction('Governance', 1000, '0x', '0xNonOwner');
        }).toThrow('AdvancedMultiSig: caller is not an owner');

        expect(() => {
            multisig.registerWorkflow(
                {
                    id: 'wf_non_owner',
                    name: 'Nope',
                    mode: WorkflowMode.PARALLEL,
                    stages: [
                        {
                            id: 's1',
                            name: 'Stage',
                            approvers: [owner1],
                            minApprovals: 1,
                            timelockMs: 0
                        }
                    ]
                },
                '0xNonOwner'
            );
        }).toThrow('AdvancedMultiSig: caller is not an owner');
    });

    it('validates constructor and default tier rules', () => {
        expect(() => {
            new AdvancedMultiSig([owner1]);
        }).toThrow('AdvancedMultiSig: at least two owners required');

        const defaultRulesMultisig = new AdvancedMultiSig([owner1, owner2, owner3], undefined, {
            signatureTimelockMs: 1000
        });

        expect(defaultRulesMultisig.getRequiredSignaturesForAmount(100)).toBe(2);
        expect(defaultRulesMultisig.getRequiredSignaturesForAmount(100000)).toBe(3);
    });

    it('validates transaction submission inputs', () => {
        expect(() => {
            multisig.submitTransaction('', 1000, '0x', owner1);
        }).toThrow('AdvancedMultiSig: target is required');

        expect(() => {
            multisig.submitTransaction('Governance', -1, '0x', owner1);
        }).toThrow('AdvancedMultiSig: value must be non-negative');

        expect(() => {
            multisig.submitBatch([], owner1);
        }).toThrow('AdvancedMultiSig: empty batch not allowed');
    });

    it('validates hierarchical rule updates and detects gaps', () => {
        expect(() => {
            multisig.setHierarchicalRules([], owner1);
        }).toThrow('AdvancedMultiSig: at least one hierarchical rule is required');

        expect(() => {
            multisig.setHierarchicalRules(
                [
                    {
                        id: 'a',
                        minAmount: 0,
                        maxAmount: 100,
                        requiredSignatures: 1,
                        eligibleSigners: [owner1],
                        minExecutionDelayMs: 0
                    },
                    {
                        id: 'b',
                        minAmount: 100,
                        maxAmount: 200,
                        requiredSignatures: 1,
                        eligibleSigners: [owner1],
                        minExecutionDelayMs: 0
                    }
                ],
                owner1
            );
        }).toThrow('AdvancedMultiSig: hierarchical rules overlap');

        expect(() => {
            multisig.setHierarchicalRules(
                [
                    {
                        id: '',
                        minAmount: 0,
                        maxAmount: 100,
                        requiredSignatures: 1,
                        eligibleSigners: [owner1],
                        minExecutionDelayMs: 0
                    }
                ],
                owner1
            );
        }).toThrow('AdvancedMultiSig: hierarchical rule id is required');

        expect(() => {
            multisig.setHierarchicalRules(
                [
                    {
                        id: 'bad_range',
                        minAmount: 10,
                        maxAmount: 1,
                        requiredSignatures: 1,
                        eligibleSigners: [owner1],
                        minExecutionDelayMs: 0
                    }
                ],
                owner1
            );
        }).toThrow('AdvancedMultiSig: invalid hierarchical amount range');

        expect(() => {
            multisig.setHierarchicalRules(
                [
                    {
                        id: 'bad_req',
                        minAmount: 0,
                        maxAmount: 100,
                        requiredSignatures: 0,
                        eligibleSigners: [owner1],
                        minExecutionDelayMs: 0
                    }
                ],
                owner1
            );
        }).toThrow('AdvancedMultiSig: hierarchical rule must require at least one signature');

        expect(() => {
            multisig.setHierarchicalRules(
                [
                    {
                        id: 'bad_delay',
                        minAmount: 0,
                        maxAmount: 100,
                        requiredSignatures: 1,
                        eligibleSigners: [owner1],
                        minExecutionDelayMs: -1
                    }
                ],
                owner1
            );
        }).toThrow('AdvancedMultiSig: hierarchical delay cannot be negative');

        expect(() => {
            multisig.setHierarchicalRules(
                [
                    {
                        id: 'bad_eligibility',
                        minAmount: 0,
                        maxAmount: 100,
                        requiredSignatures: 2,
                        eligibleSigners: [owner1],
                        minExecutionDelayMs: 0
                    }
                ],
                owner1
            );
        }).toThrow('AdvancedMultiSig: insufficient eligible signers for required signatures');

        expect(() => {
            multisig.setHierarchicalRules(
                [
                    {
                        id: 'bad_owner',
                        minAmount: 0,
                        maxAmount: 100,
                        requiredSignatures: 1,
                        eligibleSigners: ['0xNotOwner'],
                        minExecutionDelayMs: 0
                    }
                ],
                owner1
            );
        }).toThrow('AdvancedMultiSig: eligible signer must be an owner');

        multisig.setHierarchicalRules(
            [
                {
                    id: 'low',
                    minAmount: 0,
                    maxAmount: 100,
                    requiredSignatures: 1,
                    eligibleSigners: [owner1],
                    minExecutionDelayMs: 0
                },
                {
                    id: 'high',
                    minAmount: 200,
                    maxAmount: 500,
                    requiredSignatures: 1,
                    eligibleSigners: [owner1],
                    minExecutionDelayMs: 0
                }
            ],
            owner1
        );

        expect(() => {
            multisig.getRequiredSignaturesForAmount(150);
        }).toThrow('AdvancedMultiSig: no hierarchical rule configured for amount');
    });

    it('validates workflow registration and workflow-to-tier compatibility', () => {
        expect(() => {
            multisig.registerWorkflow(
                {
                    id: '',
                    name: 'x',
                    mode: WorkflowMode.PARALLEL,
                    stages: []
                },
                owner1
            );
        }).toThrow('AdvancedMultiSig: workflow id is required');

        expect(() => {
            multisig.registerWorkflow(
                {
                    id: 'wf_empty',
                    name: 'x',
                    mode: WorkflowMode.PARALLEL,
                    stages: []
                },
                owner1
            );
        }).toThrow('AdvancedMultiSig: workflow requires at least one stage');

        expect(() => {
            multisig.registerWorkflow(
                {
                    id: 'wf_dup',
                    name: 'x',
                    mode: WorkflowMode.PARALLEL,
                    stages: [
                        { id: 's', name: 'a', approvers: [owner1], minApprovals: 1, timelockMs: 0 },
                        { id: 's', name: 'b', approvers: [owner2], minApprovals: 1, timelockMs: 0 }
                    ]
                },
                owner1
            );
        }).toThrow('AdvancedMultiSig: duplicate workflow stage id');

        expect(() => {
            multisig.registerWorkflow(
                {
                    id: 'wf_bad_threshold',
                    name: 'x',
                    mode: WorkflowMode.PARALLEL,
                    stages: [
                        { id: 's1', name: 'a', approvers: [owner1], minApprovals: 2, timelockMs: 0 }
                    ]
                },
                owner1
            );
        }).toThrow('AdvancedMultiSig: invalid stage approval threshold');

        expect(() => {
            multisig.registerWorkflow(
                {
                    id: 'wf_bad_time',
                    name: 'x',
                    mode: WorkflowMode.PARALLEL,
                    stages: [
                        { id: 's1', name: 'a', approvers: [owner1], minApprovals: 1, timelockMs: -1 }
                    ]
                },
                owner1
            );
        }).toThrow('AdvancedMultiSig: stage timelock cannot be negative');

        expect(() => {
            multisig.registerWorkflow(
                {
                    id: 'wf_bad_owner',
                    name: 'x',
                    mode: WorkflowMode.PARALLEL,
                    stages: [
                        { id: 's1', name: 'a', approvers: ['0xUnknown'], minApprovals: 1, timelockMs: 0 }
                    ]
                },
                owner1
            );
        }).toThrow('AdvancedMultiSig: workflow approver must be an owner');

        expect(() => {
            multisig.submitTransaction('Governance', 1000, '0x', owner1, 'wf_missing');
        }).toThrow('AdvancedMultiSig: workflow not found');

        multisig.registerWorkflow(
            {
                id: 'wf_ineligible_approver',
                name: 'x',
                mode: WorkflowMode.PARALLEL,
                stages: [
                    { id: 's1', name: 'a', approvers: [owner4], minApprovals: 1, timelockMs: 0 }
                ]
            },
            owner1
        );

        expect(() => {
            multisig.submitTransaction('Governance', 1000, '0x', owner1, 'wf_ineligible_approver');
        }).toThrow('AdvancedMultiSig: workflow approvers must be eligible under selected tier');

        multisig.registerWorkflow(
            {
                id: 'wf_not_enough_unique',
                name: 'x',
                mode: WorkflowMode.PARALLEL,
                stages: [
                    { id: 's1', name: 'a', approvers: [owner1], minApprovals: 1, timelockMs: 0 }
                ]
            },
            owner1
        );

        expect(() => {
            multisig.submitTransaction('Governance', 20000, '0x', owner1, 'wf_not_enough_unique');
        }).toThrow('AdvancedMultiSig: workflow does not provide enough unique approvers for tier');
    });

    it('covers confirmation, revocation and execution failure paths', () => {
        const txId = multisig.submitTransaction('Governance', 1000, '0x', owner1);

        expect(() => {
            multisig.confirmTransaction('missing_tx', owner1);
        }).toThrow('AdvancedMultiSig: transaction not found');

        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId, owner1);

        expect(() => {
            multisig.confirmTransaction(txId, owner1, 'tier_stage');
        }).toThrow('AdvancedMultiSig: signer already confirmed this stage');

        expect(() => {
            multisig.confirmTransaction(txId, owner4);
        }).toThrow('AdvancedMultiSig: signer not eligible for this tier');

        expect(() => {
            multisig.executeTransaction(txId, owner2);
        }).toThrow('AdvancedMultiSig: transaction not ready for execution');

        multisig.confirmTransaction(txId, owner2);
        multisig.executeTransaction(txId, owner3);

        expect(() => {
            multisig.executeTransaction(txId, owner3);
        }).toThrow('AdvancedMultiSig: transaction already executed');

        expect(() => {
            multisig.revokeSignature(txId, owner1);
        }).toThrow('AdvancedMultiSig: transaction already executed');
    });

    it('covers stage-specific approval and revocation errors', () => {
        multisig.registerWorkflow(
            {
                id: 'wf_stage_errors',
                name: 'x',
                mode: WorkflowMode.PARALLEL,
                stages: [
                    { id: 'alpha', name: 'a', approvers: [owner1], minApprovals: 1, timelockMs: 1000 },
                    { id: 'beta', name: 'b', approvers: [owner2], minApprovals: 1, timelockMs: 1000 }
                ]
            },
            owner1
        );
        const txId = multisig.submitTransaction('Governance', 1000, '0x', owner1, 'wf_stage_errors');
        jest.advanceTimersByTime(1000);

        expect(() => {
            multisig.confirmTransaction(txId, owner1, 'missing');
        }).toThrow('AdvancedMultiSig: stage not found');

        expect(() => {
            multisig.confirmTransaction(txId, owner2, 'alpha');
        }).toThrow('AdvancedMultiSig: signer not allowed in selected stage');

        multisig.confirmTransaction(txId, owner1, 'alpha');
        multisig.confirmTransaction(txId, owner2, 'beta');

        expect(() => {
            multisig.confirmTransaction(txId, owner3);
        }).toThrow('AdvancedMultiSig: no available stage for signer confirmation');

        expect(() => {
            multisig.revokeSignature(txId, owner3);
        }).toThrow('AdvancedMultiSig: signer has no active signature to revoke');

        expect(() => {
            multisig.revokeSignature(txId, owner3, 'alpha');
        }).toThrow('AdvancedMultiSig: signer has no active signature in selected stage');

        expect(() => {
            multisig.revokeSignature(txId, owner1, 'does_not_exist');
        }).toThrow('AdvancedMultiSig: stage not found');
    });

    it('covers sequential-specific stage authorization failures', () => {
        multisig.registerWorkflow(
            {
                id: 'wf_seq_errors',
                name: 'x',
                mode: WorkflowMode.SEQUENTIAL,
                stages: [
                    { id: 'one', name: '1', approvers: [owner1], minApprovals: 1, timelockMs: 1000 },
                    { id: 'two', name: '2', approvers: [owner2], minApprovals: 1, timelockMs: 1000 }
                ]
            },
            owner1
        );
        const txId = multisig.submitTransaction('Governance', 1000, '0x', owner1, 'wf_seq_errors');
        jest.advanceTimersByTime(1000);

        expect(() => {
            multisig.confirmTransaction(txId, owner1, 'two');
        }).toThrow('AdvancedMultiSig: invalid stage for sequential workflow');

        expect(() => {
            multisig.confirmTransaction(txId, owner2);
        }).toThrow('AdvancedMultiSig: signer not allowed in current sequential stage');

        multisig.confirmTransaction(txId, owner1, 'one');
        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId, owner2, 'two');

        expect(() => {
            multisig.confirmTransaction(txId, owner2, 'two');
        }).toThrow('AdvancedMultiSig: workflow already fully approved');
    });

    it('covers batch execution error paths', () => {
        expect(() => {
            multisig.executeBatch('missing_batch', owner1);
        }).toThrow('AdvancedMultiSig: batch not found');

        const batchId = multisig.submitBatch(
            [
                { to: 'Governance', value: 1000, data: '0x1' },
                { to: 'FeeManager', value: 1000, data: '0x2' }
            ],
            owner1
        );
        const batch = multisig.getBatchPlan(batchId);

        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(batch.transactionIds[0], owner1);
        multisig.confirmTransaction(batch.transactionIds[0], owner2);

        expect(() => {
            multisig.executeBatch(batchId, owner1);
        }).toThrow('AdvancedMultiSig: batch contains non-executable transactions');

        multisig.confirmTransaction(batch.transactionIds[1], owner1);
        multisig.confirmTransaction(batch.transactionIds[1], owner2);
        multisig.executeBatch(batchId, owner1);

        expect(() => {
            multisig.executeBatch(batchId, owner1);
        }).toThrow('AdvancedMultiSig: batch already executed');
    });

    it('covers emergency override edge cases', () => {
        const txId = multisig.submitTransaction('Governance', 1000, '0x', owner1);

        expect(() => {
            multisig.approveEmergencyOverride('missing_override', owner1);
        }).toThrow('AdvancedMultiSig: emergency request not found');

        expect(() => {
            multisig.executeEmergencyOverride('missing_override', owner1);
        }).toThrow('AdvancedMultiSig: emergency request not found');

        const overrideId = multisig.requestEmergencyOverride(
            txId,
            EmergencyActionType.EXECUTE_TRANSACTION,
            'test',
            owner1
        );

        expect(() => {
            multisig.approveEmergencyOverride(overrideId, owner1);
        }).toThrow('AdvancedMultiSig: emergency approval already recorded');

        multisig.approveEmergencyOverride(overrideId, owner2);
        multisig.approveEmergencyOverride(overrideId, owner3);
        multisig.approveEmergencyOverride(overrideId, owner4);
        multisig.executeEmergencyOverride(overrideId, owner5);

        expect(() => {
            multisig.approveEmergencyOverride(overrideId, owner2);
        }).toThrow('AdvancedMultiSig: emergency request already executed');

        expect(() => {
            multisig.executeEmergencyOverride(overrideId, owner2);
        }).toThrow('AdvancedMultiSig: emergency request already executed');

        expect(() => {
            multisig.requestEmergencyOverride(txId, EmergencyActionType.CANCEL_TRANSACTION, 'late', owner1);
        }).toThrow('AdvancedMultiSig: cannot override executed transaction');
    });

    it('covers emergency cancellation flow and executed-cancel protection', () => {
        const txId = multisig.submitTransaction('Governance', 1000, '0x', owner1);
        const cancelId = multisig.requestEmergencyOverride(
            txId,
            EmergencyActionType.CANCEL_TRANSACTION,
            'risk block',
            owner1
        );
        multisig.approveEmergencyOverride(cancelId, owner2);
        multisig.approveEmergencyOverride(cancelId, owner3);
        multisig.approveEmergencyOverride(cancelId, owner4);
        multisig.executeEmergencyOverride(cancelId, owner5);

        expect(multisig.getTransaction(txId).status).toBe(TransactionStatus.CANCELLED);
        expect(() => {
            multisig.confirmTransaction(txId, owner1);
        }).toThrow('AdvancedMultiSig: transaction already cancelled');

        const txId2 = multisig.submitTransaction('Governance', 1000, '0x2', owner1);
        const cancelId2 = multisig.requestEmergencyOverride(
            txId2,
            EmergencyActionType.CANCEL_TRANSACTION,
            'late cancel',
            owner1
        );
        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId2, owner1);
        multisig.confirmTransaction(txId2, owner2);
        multisig.executeTransaction(txId2, owner3);
        multisig.approveEmergencyOverride(cancelId2, owner2);
        multisig.approveEmergencyOverride(cancelId2, owner3);
        multisig.approveEmergencyOverride(cancelId2, owner4);

        expect(() => {
            multisig.executeEmergencyOverride(cancelId2, owner5);
        }).toThrow('AdvancedMultiSig: cannot cancel executed transaction');
    });

    it('covers emergency execute override on already executed transaction', () => {
        const txId = multisig.submitTransaction('Governance', 1000, '0x', owner1);
        const execId = multisig.requestEmergencyOverride(
            txId,
            EmergencyActionType.EXECUTE_TRANSACTION,
            'force',
            owner1
        );

        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId, owner1);
        multisig.confirmTransaction(txId, owner2);
        multisig.executeTransaction(txId, owner3);
        multisig.approveEmergencyOverride(execId, owner2);
        multisig.approveEmergencyOverride(execId, owner3);
        multisig.approveEmergencyOverride(execId, owner4);

        expect(() => {
            multisig.executeEmergencyOverride(execId, owner5);
        }).toThrow('AdvancedMultiSig: transaction already executed');
    });

    it('covers getters and not-found paths', () => {
        expect(() => {
            multisig.getTransaction('missing_tx');
        }).toThrow('AdvancedMultiSig: transaction not found');

        expect(() => {
            multisig.getBatchPlan('missing_batch');
        }).toThrow('AdvancedMultiSig: batch not found');

        expect(() => {
            multisig.getEmergencyOverrideRequest('missing_override');
        }).toThrow('AdvancedMultiSig: emergency request not found');

        const unknown = multisig.getSignerAnalytics('0xUnknown');
        expect(unknown.signedCount).toBe(0);
        expect(unknown.averageDelayMs).toBe(0);
    });

    it('covers expiry handling and analytics states', () => {
        const shortLived = new AdvancedMultiSig(owners, tierRules, {
            signatureTimelockMs: 0,
            transactionExpiryMs: 10,
            emergencySuperMajorityPct: 75,
            defaultWorkflowMode: WorkflowMode.PARALLEL
        });
        const txId = shortLived.submitTransaction('Governance', 1000, '0x', owner1);
        jest.advanceTimersByTime(20);

        expect(() => {
            shortLived.confirmTransaction(txId, owner1);
        }).toThrow('AdvancedMultiSig: transaction expired');

        const analytics = shortLived.getSystemAnalytics();
        expect(analytics.expiredTransactions).toBe(1);
    });

    it('covers stage-activation guard and signer-stats guard via tamper scenarios', () => {
        const txId = multisig.submitTransaction('Governance', 1000, '0x', owner1);
        const internal = multisig as unknown as {
            transactions: Map<string, any>;
            signerStats: Map<string, any>;
        };
        const tx = internal.transactions.get(txId);
        tx.stageReadyAt.tier_stage = 0;
        internal.transactions.set(txId, tx);

        expect(() => {
            multisig.confirmTransaction(txId, owner1);
        }).toThrow('AdvancedMultiSig: stage is not yet active');

        tx.stageReadyAt.tier_stage = Date.now() - 1000;
        internal.transactions.set(txId, tx);
        internal.signerStats.delete(owner1);

        expect(() => {
            multisig.confirmTransaction(txId, owner1);
        }).toThrow('AdvancedMultiSig: signer stats unavailable');
    });

    it('covers registration getters and explicit timelock execution guard', () => {
        expect(() => {
            multisig.registerIntegration('', () => undefined, owner1);
        }).toThrow('AdvancedMultiSig: integration id is required');

        multisig.registerIntegration('Governance', () => undefined, owner1);
        expect(multisig.getRegisteredIntegrations()).toContain('Governance');

        const txId = multisig.submitTransaction('Governance', 1000, '0x', owner1);
        jest.advanceTimersByTime(1000);
        multisig.confirmTransaction(txId, owner1);
        multisig.confirmTransaction(txId, owner2);

        const internal = multisig as unknown as { transactions: Map<string, any> };
        const tx = internal.transactions.get(txId);
        tx.executeAfter = Date.now() + 10_000;
        internal.transactions.set(txId, tx);

        expect(() => {
            multisig.executeTransaction(txId, owner3);
        }).toThrow('AdvancedMultiSig: execution timelock active');
    });

    it('covers emergency execute integration callback and request getter copy', () => {
        const hook = jest.fn();
        multisig.registerIntegration('EmergencyPause', hook, owner1);

        const txId = multisig.submitTransaction('EmergencyPause', 1000, '0x', owner1);
        const requestId = multisig.requestEmergencyOverride(
            txId,
            EmergencyActionType.EXECUTE_TRANSACTION,
            'urgent',
            owner1
        );
        multisig.approveEmergencyOverride(requestId, owner2);
        multisig.approveEmergencyOverride(requestId, owner3);
        multisig.approveEmergencyOverride(requestId, owner4);

        const snapshot = multisig.getEmergencyOverrideRequest(requestId);
        snapshot.approvals.push('0xMutate');

        const fresh = multisig.getEmergencyOverrideRequest(requestId);
        expect(fresh.approvals).not.toContain('0xMutate');

        multisig.executeEmergencyOverride(requestId, owner5);
        expect(hook).toHaveBeenCalledTimes(1);
        expect(multisig.getOwners()).toContain(owner1);
    });

    it('covers sequential inactive-stage guard via tamper and executed/cancelled no-op state updates', () => {
        multisig.registerWorkflow(
            {
                id: 'wf_seq_tamper',
                name: 'x',
                mode: WorkflowMode.SEQUENTIAL,
                stages: [
                    { id: 'a', name: 'a', approvers: [owner1], minApprovals: 1, timelockMs: 0 },
                    { id: 'b', name: 'b', approvers: [owner2], minApprovals: 1, timelockMs: 0 }
                ]
            },
            owner1
        );
        const txId = multisig.submitTransaction('Governance', 1000, '0x', owner1, 'wf_seq_tamper');
        const internals = multisig as unknown as { transactions: Map<string, any>; updateDerivedTransactionState: (tx: any, now: number) => void };
        const tx = internals.transactions.get(txId);
        tx.stageCompletedAt.a = Date.now();
        tx.stageReadyAt.b = 0;
        internals.transactions.set(txId, tx);

        expect(() => {
            multisig.confirmTransaction(txId, owner2);
        }).toThrow('AdvancedMultiSig: next sequential stage is not active');

        tx.status = TransactionStatus.EXECUTED;
        tx.lastUpdatedAt = 1;
        internals.updateDerivedTransactionState(tx, Date.now());
        expect(tx.lastUpdatedAt).toBe(1);

        tx.status = TransactionStatus.CANCELLED;
        tx.lastUpdatedAt = 2;
        internals.updateDerivedTransactionState(tx, Date.now());
        expect(tx.lastUpdatedAt).toBe(2);
    });
});
