import { ProposalManager } from '../../contracts/proposals/ProposalManager';
import { ProposalCategory, ProposalType, ProposalStatus } from '../../contracts/proposals/structures/ProposalStructure';
import { ProposalLib } from '../../contracts/proposals/libraries/ProposalLib';

// Mock dependencies
class MockWattToken {
  balances = new Map<string, number>();
  totalSupplyVal = 1000000;

  balanceOf(addr: string): number {
    return this.balances.get(addr) || 0;
  }

  totalSupply(): number {
    return this.totalSupplyVal;
  }
}

describe('ProposalManager', () => {
  let manager: ProposalManager;
  let token: MockWattToken;
  const owner = '0xowner';
  const proposer = '0xproposer';

  beforeEach(() => {
    token = new MockWattToken();
    token.balances.set(proposer, 200); // Above threshold
    token.balances.set(owner, 10000);
    manager = new ProposalManager(token as any, owner);
  });

  test('createProposal validates requirements and creates indexed proposal', () => {
    const metadata = {
      title: 'Test Proposal',
      description: 'Description',
      implementationPlan: 'Plan with details'
    };
    const id = manager.createProposal(
      ProposalCategory.ProtocolChanges,
      metadata,
      ['0xtarget'],
      [0],
      ['0xcalldata'],
      proposer
    );

    expect(id).toMatch(/^PROP_/);
    const proposal = manager.getProposal(id)!;
    expect(proposal.category).toBe(ProposalCategory.ProtocolChanges);
    expect(proposal.proposer).toBe(proposer);
    expect(proposal.status).toBe(ProposalStatus.Draft);
    expect(proposal.votingReqs.quorum).toBeCloseTo(40000); // 4%
  });

  test('createProposal rejects insufficient balance', () => {
    token.balances.set(proposer, 50); // Below 100
    const metadata = { title: 'Short', description: 'Short', implementationPlan: 'Short' };
    expect(() => manager.createProposal(
      ProposalCategory.Other,
      metadata,
      [],
      [],
      [],
      proposer
    )).toThrow('invalid creation params');
  });

  test('calculateVotingRequirements returns type-based reqs', () => {
    const standard = manager.calculateVotingRequirements(ProposalType.Standard, 1000000);
    expect(standard.votingPeriod).toBe(86400000);
    
    const emergency = manager.calculateVotingRequirements(ProposalType.Emergency, 1000000);
    expect(emergency.votingPeriod).toBe(3600000);
    expect(emergency.quorum).toBeCloseTo(100000);
  });

  test('searchProposals filters by category/status with pagination', () => {
    manager.createProposal(ProposalCategory.FeeAdjustments, {title: 'Fee1', description: 'D', implementationPlan: 'P'}, [], [], [], proposer);
    manager.createProposal(ProposalCategory.ProtocolChanges, {title: 'Proto', description: 'D', implementationPlan: 'P'}, [], [], [], proposer);

    const feeProposals = manager.searchProposals({ category: ProposalCategory.FeeAdjustments, page: 0, limit: 10 });
    expect(feeProposals.length).toBe(1);
    expect(feeProposals[0].category).toBe(ProposalCategory.FeeAdjustments);

    const draftProposals = manager.searchProposals({ status: ProposalStatus.Draft, page: 0, limit: 1 });
    expect(draftProposals.length).toBe(1);
  });

  test('validateProposal transitions status', () => {
    const id = manager.createProposal(ProposalCategory.Other, {
      title: 'Long Title Here',
      description: 'Long desc',
      implementationPlan: 'Long plan'
    }, ['target'], [0], ['data'], proposer);
    
    const valid = manager.validateProposal(id, owner);
    expect(valid).toBe(true);
    expect(manager.getProposalStatus(id)).toBe(ProposalStatus.Active);
  });

  test('emergency proposal requires owner', () => {
    expect(() => manager.createEmergencyProposal(
      {title: 'Emergency', description: 'D', implementationPlan: 'P'}, [], [], [], proposer
    )).toThrow('emergency only by owner');
  });

  test('archiveProposal only by owner and sets archive info', () => {
    const id = manager.createProposal(ProposalCategory.ParameterUpdates, {
      title: 'Test Archive',
      description: 'D',
      implementationPlan: 'P'
    }, [], [], [], proposer);

    manager.archiveProposal(id, 'Obsolete', owner);
    const p = manager.getProposal(id)!;
    expect(p.archived).toBeDefined();
    expect(p.archived!.reason).toBe('Obsolete');
    expect(p.status).toBe(ProposalStatus.Canceled);
  });

  test('setCategory authorized only by owner/proposer', () => {
    const id = manager.createProposal(ProposalCategory.Other, {
      title: 'Cat Test',
      description: 'D',
      implementationPlan: 'P'
    }, [], [], [], proposer);
    
    manager.setCategory(id, ProposalCategory.FeeAdjustments, proposer);
    const p = manager.getProposal(id)!;
    expect(p.category).toBe(ProposalCategory.FeeAdjustments);

    expect(() => manager.setCategory(id, ProposalCategory.Emergency, 'unauth')).toThrow('Unauthorized');
  });

  test('ProposalLib independent validation', () => {
    expect(ProposalLib.validateCreation(
      {title: 'Good', description: 'Good', implementationPlan: 'Good'},
      ProposalCategory.ProtocolChanges,
      200,
      100
    )).toBe(true);

    expect(ProposalLib.validateCreation(
      {title: 'Short', description: 'Short', implementationPlan: ''},
      ProposalCategory.ProtocolChanges,
      50,
      100
    )).toBe(false);
  });

  test('gas efficient indexing works', () => {
    // Create 3 proposals
    manager.createProposal(ProposalCategory.ProtocolChanges, {
      title: '1', description: 'D1', implementationPlan: 'P1'
    }, [], [], [], proposer);
    manager.createProposal(ProposalCategory.FeeAdjustments, {
      title: '2', description: 'D2', implementationPlan: 'P2'
    }, [], [], [], proposer);
    manager.createProposal(ProposalCategory.ProtocolChanges, {
      title: '3', description: 'D3', implementationPlan: 'P3'
    }, [], [], [], proposer);

    // Check category index
    const proto = manager.searchProposals({category: ProposalCategory.ProtocolChanges, page: 0, limit: 10});
    expect(proto.length).toBe(2);

    manager.validateProposal(manager.getProposal('PROP_...')!.id as string, owner); // Mock status change
  });
});

