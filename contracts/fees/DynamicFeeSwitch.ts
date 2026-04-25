import { IDynamicFeeSwitch, NetworkConditions, FeeTier, EmergencyModeEvent } from './interfaces/IDynamicFeeSwitch';
import { NetworkMonitor } from './monitoring/NetworkMonitor';
import { FeeOptimizer } from './optimization/FeeOptimizer';
import { FeeDistributor, ValidationError } from './distribution/FeeDistributor';

export class DynamicFeeSwitch implements IDynamicFeeSwitch {
    private networkMonitor: NetworkMonitor;
    private feeDistributor: FeeDistributor;
    private tiers: FeeTier[];
    private emergencyMode: boolean = false;
    private safeFeeBps: number = 0;
    private emergencyEvents: EmergencyModeEvent[] = [];
    private emergencyListeners: Array<(event: EmergencyModeEvent) => void> = [];

    constructor(tiers: FeeTier[]) {
        for (const tier of tiers) {
            if (tier.minFeeBps > tier.maxFeeBps) {
                throw new ValidationError(
                    `FeeTier invalid: minFeeBps (${tier.minFeeBps}) must be <= maxFeeBps (${tier.maxFeeBps})`
                );
            }
            if (tier.baseFeeBps < tier.minFeeBps || tier.baseFeeBps > tier.maxFeeBps) {
                throw new ValidationError(
                    `FeeTier invalid: baseFeeBps (${tier.baseFeeBps}) must be within [${tier.minFeeBps}, ${tier.maxFeeBps}]`
                );
            }
        }
        this.tiers = tiers;
        this.networkMonitor = new NetworkMonitor();
        this.feeDistributor = new FeeDistributor();
    }

    calculateDynamicFee(userAddress: string, transactionVolume: number): number {
        if (userAddress === '') {
            throw new ValidationError('userAddress must not be empty');
        }
        if (transactionVolume <= 0) {
            throw new ValidationError(
                `transactionVolume must be greater than 0, got ${transactionVolume}`
            );
        }

        if (this.emergencyMode) {
            return this.safeFeeBps;
        }

        if (this.networkMonitor.isUpdateStale()) {
            console.warn('Network conditions are stale; proceeding with last known congestion value');
        }

        // Select tier: pick the last tier whose index is appropriate based on volume
        const tier = this.selectTier(transactionVolume);

        const raw = FeeOptimizer.optimize(transactionVolume, this.networkMonitor.getCongestion(), 0);

        // Clamp to tier bounds
        return Math.min(tier.maxFeeBps, Math.max(tier.minFeeBps, raw));
    }

    private selectTier(transactionVolume: number): FeeTier {
        if (this.tiers.length === 1) {
            return this.tiers[0];
        }
        // Use index-based selection: tiers are sorted ascending by volume threshold
        // tiers[0] for volume < 1000, tiers[1] for volume < 10000, etc.
        const thresholds = [1000, 10000, 100000];
        let selectedIndex = 0;
        for (let i = 0; i < this.tiers.length - 1; i++) {
            const threshold = thresholds[i] ?? Math.pow(10, i + 3);
            if (transactionVolume >= threshold) {
                selectedIndex = i + 1;
            }
        }
        return this.tiers[Math.min(selectedIndex, this.tiers.length - 1)];
    }

    updateNetworkConditions(conditions: NetworkConditions): void {
        if (conditions.congestionLevel < 0 || conditions.congestionLevel > 100) {
            throw new RangeError(
                `congestionLevel must be between 0 and 100 inclusive, got ${conditions.congestionLevel}`
            );
        }
        if (conditions.averageBlockTime <= 0) {
            throw new RangeError(
                `averageBlockTime must be greater than 0, got ${conditions.averageBlockTime}`
            );
        }
        this.networkMonitor.updateCongestion(conditions.congestionLevel, conditions.averageBlockTime);
    }

    triggerEmergencyMode(isEmergency: boolean, safeFeeBps: number): void {
        if (isEmergency && safeFeeBps <= 0) {
            throw new ValidationError(
                `safeFeeBps must be greater than 0 when activating emergency mode, got ${safeFeeBps}`
            );
        }
        this.emergencyMode = isEmergency;
        this.safeFeeBps = safeFeeBps;

        const event: EmergencyModeEvent = {
            isEmergency,
            safeFeeBps,
            timestamp: Date.now(),
        };
        this.emergencyEvents.push(event);
        for (const listener of this.emergencyListeners) {
            listener(event);
        }
    }

    distributeFees(amount: number): void {
        this.feeDistributor.distribute(amount);
    }

    getEmergencyEvents(): EmergencyModeEvent[] {
        return this.emergencyEvents;
    }

    onEmergencyMode(listener: (event: EmergencyModeEvent) => void): void {
        this.emergencyListeners.push(listener);
    }
}
