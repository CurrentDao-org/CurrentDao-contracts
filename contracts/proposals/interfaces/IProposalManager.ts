import { ProposalStatus } from '../../dao/structures/ProposalStructure';
import { Proposal } from '../structures/ProposalStructure';

export enum ProposalCategory {
  ProtocolChanges = 'ProtocolChanges',
  FeeAdjustments = 'FeeAdjustments', 
  ParameterUpdates = 'ParameterUpdates',
  Emergency = 'Emergency',
  Other = 'Other'
}

export enum ProposalType {
  Standard = 'Standard',
  Emergency = 'Emergency'
}

export interface ProposalMetadata {
  title: string;
  description: string;
  implementationPlan: string;
}

export interface VotingRequirements {
  quorum: number;
  votingPeriod: number; // ms
  proposalThreshold: number; // tokens
  timelockDelay: number; // ms
}

export interface ProposalFilter {
  category?: ProposalCategory;
  status?: ProposalStatus;
  startAfter?: number; // timestamp
  endBefore?: number;
  proposer?: string;
  page: number;
  limit: number;
}

export interface IGProposalManager {
  // Creation & Validation
  createProposal(
    category: ProposalCategory,
    metadata: ProposalMetadata,
    targets: string[],
    values: number[],
    calldatas: string[],
    proposer: string
  ): string; // returns proposalId

  validateProposal(proposalId: string, validator: string): boolean;

  // Categorization & Metadata
  setCategory(proposalId: string, category: ProposalCategory, setter: string): void;

  getMetadata(proposalId: string): ProposalMetadata | null;

  // Voting Requirements (type-based)
  calculateVotingRequirements(type: ProposalType, totalSupply: number): VotingRequirements;

  // Status & Lifecycle
  getProposalStatus(proposalId: string): ProposalStatus;

  archiveProposal(proposalId: string, reason: string, archiver: string): void;

  // Emergency
  createEmergencyProposal(
    metadata: ProposalMetadata,
    targets: string[],
    values: number[],
    calldatas: string[],
    proposer: string // must be owner/multisig
  ): string;

  // Search & Filter (gas-optimized, paginated)
  searchProposals(filter: ProposalFilter): Proposal[];

  getProposal(proposalId: string): Proposal | null;

  // Integration hooks (with existing Governance)
  linkToGovernance(proposalId: string, governanceProposalId: string): void;
}

