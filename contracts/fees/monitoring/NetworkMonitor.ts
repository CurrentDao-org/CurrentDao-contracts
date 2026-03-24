export class NetworkMonitor {
    private congestionLevel: number = 0;
    private lastUpdate: number = Date.now();

    updateCongestion(level: number): void {
        this.congestionLevel = Math.max(0, Math.min(1, level));
        this.lastUpdate = Date.now();
    }

    getCongestion(): number {
        return this.congestionLevel;
    }

    isUpdateStale(): boolean {
        // Update must happen every 30 seconds
        return (Date.now() - this.lastUpdate) > 30000;
    }
}
