import { IGProposalManager, ProposalCategory, ProposalType, ProposalMetadata, VotingRequirements, ProposalFilter } from './interfaces/IProposalManager';
import { ProposalStatus } from '../dao/structures/ProposalStructure';
import { SophisticatedProposal, Proposal } from './structures/ProposalStructure';
import { ProposalLib } from './libraries/ProposalLib';
import type { WattToken } from '../token/WattToken';
import type { IGovernance } from '../dao/interfaces/IGovernance';
import { VotingLib } from '../dao/libraries/VotingLib';

export class ProposalManager implements IGProposalManager {
  private proposalsById: Map<string, SophisticatedProposal> = new Map();
  private proposalsByCategory: Map<string, string[]> = new Map();
  private proposalsByStatus: Map<string, string[]> = new Map();
  private nextId: number = 1;
  private proposalCount = 0;

  // Dependencies
  private token: WattToken;
  private governance: IGovernance | null = null;
  private owner: string;

  constructor(token: WattToken, owner: string) {
    this.token = token;
    this.owner = owner;
  }

  setGovernance(governanceAddr: string) {
    // Mock instantiation
    this.governance = {} as IGovernance;
  }

  // --- Creation & Validation ---

  createProposal(
    category: ProposalCategory,
    metadata: ProposalMetadata,
    targets: string[],
    values: number[],
    calldatas: string[],
    proposer: string
  ): string {
    const balance = this.token.balanceOf(proposer);
    const reqs = ProposalLib.calculateVotingRequirements(ProposalType.Standard, this.token.totalSupply());
    
    if (!ProposalLib.validateCreation(metadata, category, balance, reqs.proposalThreshold)) {
      throw new Error('ProposalManager: invalid creation params');
    }
    if (!ProposalLib.validateCalldatas(calldatas)) {
      throw new Error('ProposalManager: invalid calldatas');
    }

    const id = ProposalLib.generateId(proposer, this.nextId++, category);
    const now = Date.now();
    const voteStart = now + 1000;
    const voteEnd = voteStart + reqs.votingPeriod;

    const proposal: SophisticatedProposal = {
      id,
      proposer,
      category,
      type: ProposalType.Standard,
      metadata,
      targets, values, calldatas,
      votingReqs: reqs,
      startTime: now,
      endTime: voteEnd,
      voteStart, voteEnd,
      status: ProposalStatus.Draft,
      forVotes: 0, againstVotes: 0, abstainVotes: 0,
      executed: false, canceled: false,
      createdAt: now, updatedAt: now
    };

    this.proposalsById.set(id, proposal);
    this.addToIndex(proposal.category, id, 'category');
    this.addToIndex(proposal.status.toString(), id, 'status');
    this.proposalCount++;

    return id;
  }

  validateProposal(id: string, validator: string): boolean {
    const proposal = this.proposalsById.get(id);
    if (!proposal) return false;
    
    // Simulate validation (e.g., community votes, checks)
    const isValid = proposal.metadata.title.length > 20 && proposal.targets.length > 0;
    if (isValid) {
      proposal.status = ProposalStatus.Active;
      this.updateStatusIndex(id, ProposalStatus.Active);
      proposal.updatedAt = Date.now();
    }
    return isValid;
  }

  // --- Emergency ---

  createEmergencyProposal(
    metadata: ProposalMetadata,
    targets: string[],
    values: number[],
    calldatas: string[],
    proposer: string
  ): string {
    if (proposer !== this.owner) {
      throw new Error('ProposalManager: emergency only by owner');
    }
    if (!ProposalLib.isEmergencyAuthorized(proposer, this.owner)) {
      throw new Error('ProposalManager: unauthorized emergency');
    }

    const reqs = ProposalLib.calculateVotingRequirements(ProposalType.Emergency, this.token.totalSupply());
    // Create similar to standard but type=Emergency
    const id = this.createProposal(ProposalCategory.Emergency as any, metadata, targets, values, calldatas, proposer);
    const proposal = this.proposalsById.get(id)!;
    proposal.type = ProposalType.Emergency;
    proposal.votingReqs = reqs;
    return id;
  }

  // --- Metadata & Category ---

  setCategory(id: string, category: ProposalCategory, setter: string): void {
    const proposal = this.getProposalMut(id);
    if (setter !== this.owner && setter !== proposal.proposer) throw new Error('Unauthorized');
    
    this.removeFromIndex(proposal.category, id, 'category');
    proposal.category = category;
    this.addToIndex(category, id, 'category');
    proposal.updatedAt = Date.now();
  }

  getMetadata(id: string): ProposalMetadata | null {
    const p = this.proposalsById.get(id);
    return p ? p.metadata : null;
  }

  // --- Voting & Status ---

  calculateVotingRequirements(type: ProposalType, totalSupply: number): VotingRequirements {
    return ProposalLib.calculateVotingRequirements(type, totalSupply);
  }

  getProposalStatus(id: string): ProposalStatus {
    const p = this.proposalsById.get(id);
    return p ? p.status : ProposalStatus.Canceled;
  }

  // --- Search & Filter (indexed, gas efficient) ---

  searchProposals(filter: ProposalFilter): Proposal[] {
    let candidates: string[] = [];
    
    if (filter.category) {
      candidates = this.proposalsByCategory.get(filter.category) || [];
    } else if (filter.status) {
      candidates = this.proposalsByStatus.get(filter.status) || [];
    } else {
      candidates = Array.from(this.proposalsById.keys());
    }

    const proposals: SophisticatedProposal[] = candidates
      .map(id => this.proposalsById.get(id))
      .filter(Boolean) as SophisticatedProposal[];

    return ProposalLib.filterProposals(proposals, filter);
  }

  getProposal(id: string): Proposal | null {
    return this.proposalsById.get(id) || null;
  }

  // --- Lifecycle ---

  archiveProposal(id: string, reason: string, archiver: string): void {
    if (archiver !== this.owner) throw new Error('Only owner can archive');
    
    const proposal = this.getProposalMut(id);
    const oldStatus = proposal.status;
    proposal.status = ProposalStatus.Canceled; // or custom Archived
    proposal.archived = { archivedAt: Date.now(), reason, archiver };
    this.updateStatusIndex(id, ProposalStatus.Canceled);
    proposal.updatedAt = Date.now();
  }

  linkToGovernance(proposalId: string, govProposalId: string): void {
    const proposal = this.getProposalMut(proposalId);
    proposal.governanceProposalId = govProposalId;
    proposal.updatedAt = Date.now();
  }

  // --- Private Helpers ---

  private getProposalMut(id: string): SophisticatedProposal {
    const p = this.proposalsById.get(id);
    if (!p) throw new Error('Proposal not found');
    return p;
  }

  private addToIndex(indexKey: string, id: string, type: 'category' | 'status'): void {
    const list = (type === 'category' ? this.proposalsByCategory : this.proposalsByStatus);
    const arr = list.get(indexKey) || [];
    if (!arr.includes(id)) arr.push(id);
    list.set(indexKey, arr);
  }

  private removeFromIndex(indexKey: string, id: string, type: 'category' | 'status'): void {
    const list = (type === 'category' ? this.proposalsByCategory : this.proposalsByStatus);
    const arr = list.get(indexKey) || [];
    const idx = arr.indexOf(id);
    if (idx > -1) arr.splice(idx, 1);
    if (arr.length === 0) list.delete(indexKey);
    else list.set(indexKey, arr);
  }

  private updateStatusIndex(id: string, newStatus: ProposalStatus): void {
    const proposal = this.proposalsById.get(id)!;
    this.removeFromIndex((proposal.status as any).toString(), id, 'status');
    proposal.status = newStatus;
    this.addToIndex((newStatus as any).toString(), id, 'status');
  }

  // Gas stats helpers (for testing)
  getProposalCount(): number { return this.proposalCount; }
}

