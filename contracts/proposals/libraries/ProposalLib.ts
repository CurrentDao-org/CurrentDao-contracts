import { ProposalCategory, ProposalType, VotingRequirements, ProposalFilter, SophisticatedProposal, ProposalStatus } from '../structures/ProposalStructure';
import { Proposal } from '../../dao/structures/ProposalStructure';
import { VotingLib } from '../../dao/libraries/VotingLib';
import type { WattToken } from '../../token/WattToken'; // Assume importable

export class ProposalLib {
  /**
   * Validates proposal creation parameters
   */
  public static validateCreation(
    metadata: any,
    category: ProposalCategory,
    proposerBalance: number,
    threshold: number
  ): boolean {
    if (!metadata || typeof metadata !== 'object') return false;
    if (typeof metadata.title !== 'string' || metadata.title.length < 10 || metadata.title.length > 200) return false;
    if (typeof metadata.description !== 'string' || metadata.description.length < 50) return false;
    if (typeof metadata.implementationPlan !== 'string' || metadata.implementationPlan.length < 100) return false;
    if (proposerBalance < threshold) return false;
    // Category must be valid enum
    if (!Object.values(ProposalCategory).includes(category)) return false;
    return true;
  }

  /**
   * Calculates type-based voting requirements (gas optimized)
   */
  public static calculateVotingRequirements(type: ProposalType, totalSupply: number): VotingRequirements {
    const baseQuorum = Math.floor(totalSupply * 0.04); // 4%
    switch (type) {
      case ProposalType.Standard:
        return {
          quorum: baseQuorum,
          votingPeriod: 24 * 60 * 60 * 1000, // 1 day
          proposalThreshold: 100,
          timelockDelay: 48 * 60 * 60 * 1000 // 2 days
        };
      case ProposalType.Emergency:
        return {
          quorum: Math.floor(totalSupply * 0.10), // 10%
          votingPeriod: 60 * 60 * 1000, // 1 hour
          proposalThreshold: 500,
          timelockDelay: 60 * 60 * 1000 // 1 hour
        };
      default:
        throw new Error('Invalid proposal type');
    }
  }

  /**
   * Filters proposals (client-side or paginated server-side simulation)
   */
  public static filterProposals(
    proposals: SophisticatedProposal[], 
    filter: ProposalFilter
  ): SophisticatedProposal[] {
    let filtered = proposals.filter(p => {
      if (filter.category && p.category !== filter.category) return false;
      if (filter.status && p.status !== filter.status) return false;
      if (filter.proposer && p.proposer.toLowerCase() !== filter.proposer.toLowerCase()) return false;
      if (filter.startAfter && p.createdAt < filter.startAfter) return false;
      if (filter.endBefore && p.createdAt > filter.endBefore) return false;
      return true;
    });

    // Pagination
    const start = filter.page * filter.limit;
    return filtered.slice(start, start + filter.limit);
  }

  /**
   * Checks if emergency proposer is authorized (e.g., owner check in impl)
   */
  public static isEmergencyAuthorized(proposer: string, owner: string): boolean {
    return proposer === owner; // Simplified; use multisig in real
  }

  /**
   * Generates unique ID (extend existing)
   */
  public static generateId(proposer: string, nonce: number, category: string): string {
    return `PROP_${category[0]}${proposer.slice(-6)}_${nonce}`;
  }

  /**
   * Gas-efficient quorum check
   */
  public static hasQuorum(proposal: SophisticatedProposal): boolean {
    const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    return total >= proposal.votingReqs.quorum;
  }

  /**
   * Validates calldata safety (basic)
   */
  public static validateCalldatas(calldatas: string[]): boolean {
    return calldatas.every(cd => cd.length > 10 && cd.length < 10000); // Mock
  }
}

