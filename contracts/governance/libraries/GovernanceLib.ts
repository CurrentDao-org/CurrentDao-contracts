import { ReputationRecord, VoteType } from '../structures/GovernanceStructs';

export class GovernanceLib {
    static generateProposalId(proposer: string, description: string, count: number): string {
        return `PROP-${proposer.slice(0, 8)}-${count}-${Date.now()}`;
    }

    /**
     * Quadratic voting: voting power = sqrt(tokens)
     * Prevents whale dominance while preserving proportionality.
     */
    static quadraticVotingPower(tokenBalance: number): number {
        return Math.floor(Math.sqrt(tokenBalance));
    }

    /**
     * Reputation bonus: up to 20% extra voting power based on participation history.
     */
    static reputationBonus(rep: ReputationRecord): number {
        const participationScore = Math.min(rep.votesParticipated / 100, 1); // cap at 1
        return Math.floor(participationScore * 20); // 0-20% bonus
    }

    static effectiveVotingPower(tokenBalance: number, rep: ReputationRecord): number {
        const base = this.quadraticVotingPower(tokenBalance);
        const bonus = this.reputationBonus(rep);
        return base + Math.floor((base * bonus) / 100);
    }

    static participationRate(votes: number, totalEligible: number): number {
        if (totalEligible === 0) return 0;
        return Math.floor((votes * 100) / totalEligible);
    }
}
