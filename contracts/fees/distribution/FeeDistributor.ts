export class FeeDistributor {
    private treasuryBalance: number = 0;
    private rewardsPoolBalance: number = 0;

    distribute(amount: number): void {
        // 70% to treasury, 30% to user rewards
        const treasuryShare = amount * 0.7;
        const rewardsShare = amount * 0.3;

        this.treasuryBalance += treasuryShare;
        this.rewardsPoolBalance += rewardsShare;
    }

    getTreasuryBalance(): number {
        return this.treasuryBalance;
    }

    getRewardsPoolBalance(): number {
        return this.rewardsPoolBalance;
    }
}
