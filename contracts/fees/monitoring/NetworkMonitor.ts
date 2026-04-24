const STALENESS_THRESHOLD_MS = 30_000;

export class NetworkMonitor {
    private congestionLevel: number = 0;
    private averageBlockTime: number = 1;
    private lastUpdate: number = 0;

    updateCongestion(level: number, averageBlockTime: number): void {
        if (level < 0 || level > 100) {
            throw new RangeError(
                `congestionLevel must be between 0 and 100 inclusive, got ${level}`
            );
        }
        if (averageBlockTime <= 0) {
            throw new RangeError(
                `averageBlockTime must be greater than 0, got ${averageBlockTime}`
            );
        }
        this.congestionLevel = level;
        this.averageBlockTime = averageBlockTime;
        this.lastUpdate = Date.now();
    }

    getCongestion(): number {
        return this.congestionLevel;
    }

    getAverageBlockTime(): number {
        return this.averageBlockTime;
    }

    isUpdateStale(): boolean {
        return (Date.now() - this.lastUpdate) > STALENESS_THRESHOLD_MS;
    }
}
