import { ProposalStatus } from '../../dao/structures/ProposalStructure';

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

export interface ArchiveInfo {
  archivedAt: number;
  reason: string;
  archiver: string;
}

export interface SophisticatedProposal {
  id: string;
  proposer: string;
  category: ProposalCategory;
  type: ProposalType;
  metadata: ProposalMetadata;
  targets: string[];
  values: number[];
  calldatas: string[];
  votingReqs: VotingRequirements;
  startTime: number;
  endTime: number;
  voteStart: number;
  voteEnd: number;
  status: ProposalStatus;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  executed: boolean;
  canceled: boolean;
  archived?: ArchiveInfo;
  governanceProposalId?: string; // Link to existing dao/Governance proposal
  createdAt: number;
  updatedAt: number;
}

export type Proposal = SophisticatedProposal;

export type ProposalFilter = {
  category?: ProposalCategory;
  status?: ProposalStatus;
  startAfter?: number;
  endBefore?: number;
  proposer?: string;
  page: number;
  limit: number;
};

