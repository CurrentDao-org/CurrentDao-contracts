import type { IGovernanceProposal } from '../interfaces/IYieldFarming';
export declare class PoolGovernance {
    private proposals;
    private nextProposalId;
    private totalVotingWeight;
    private onExecute;
    constructor(totalVotingWeight: number, onExecute: (poolId: number, paramKey: string, newValue: number) => void);
    propose(poolId: number, paramKey: string, newValue: number, proposer: string, now: number): number;
    vote(proposalId: number, voter: string, support: boolean, weight: number, now: number): void;
    execute(proposalId: number, now: number): void;
    getProposal(proposalId: number): IGovernanceProposal | null;
    getActiveProposals(now: number): IGovernanceProposal[];
    updateTotalVotingWeight(weight: number): void;
}
//# sourceMappingURL=PoolGovernance.d.ts.map