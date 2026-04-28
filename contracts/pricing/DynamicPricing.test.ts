import { DynamicPricing } from './DynamicPricing';
import { PricingModel } from './structures/PricingStructs';

describe('DynamicPricing', () => {
    let pricing: DynamicPricing;
    const owner = 'owner';
    const oracle = 'oracle1';

    const zone = {
        regionId: 'US-WEST',
        basePrice: 1_000_000n, // 1 WATT per kWh (scaled 1e6)
        peakMultiplier: 1.5,
        offPeakMultiplier: 0.7,
        peakHoursStart: 8,
        peakHoursEnd: 20,
    };

    beforeEach(() => {
        pricing = new DynamicPricing(owner);
        pricing.setGeographicZone(zone, owner);
        pricing.addOracle(oracle, owner);
    });

    describe('setGeographicZone', () => {
        it('sets zone and initializes base price', () => {
            expect(pricing.getGeographicZone('US-WEST')).toEqual(zone);
            expect(pricing.getPrice('US-WEST')).toBe(zone.basePrice);
        });

        it('rejects invalid multipliers', () => {
            expect(() =>
                pricing.setGeographicZone({ ...zone, regionId: 'BAD', peakMultiplier: -1 }, owner)
            ).toThrow();
        });

        it('rejects non-owner', () => {
            expect(() => pricing.setGeographicZone(zone, 'hacker')).toThrow();
        });
    });

    describe('updatePrice', () => {
        it('returns price for balanced supply/demand', () => {
            const price = pricing.updatePrice('US-WEST', 100, 100, owner);
            expect(price).toBeGreaterThan(0n);
        });

        it('increases price when demand exceeds supply', () => {
            const balanced = pricing.updatePrice('US-WEST', 100, 100, owner);
            // Reset to base
            pricing.setGeographicZone(zone, owner);
            const highDemand = pricing.updatePrice('US-WEST', 100, 200, owner);
            expect(highDemand).toBeGreaterThan(balanced);
        });

        it('applies stability clamp (max 20% change per update)', () => {
            // First update establishes a price from base
            const first = pricing.updatePrice('US-WEST', 100, 100, owner);
            // Extreme demand spike: clamp limits change to 20% of first price
            const second = pricing.updatePrice('US-WEST', 1, 1000, owner);
            const maxAllowed = first + (first * 20n) / 100n;
            expect(second).toBeLessThanOrEqual(maxAllowed + 1n);
        });

        it('flat model returns base price', () => {
            pricing.setPricingModel('US-WEST', PricingModel.FLAT, owner);
            const price = pricing.updatePrice('US-WEST', 50, 200, owner);
            expect(price).toBe(zone.basePrice);
        });
    });

    describe('oracle integration', () => {
        it('accepts data from authorized oracle', () => {
            expect(() =>
                pricing.submitOracleData(
                    { source: 'market', price: 1_200_000n, timestamp: Date.now(), confidence: 90 },
                    oracle
                )
            ).not.toThrow();
        });

        it('rejects unauthorized oracle', () => {
            expect(() =>
                pricing.submitOracleData(
                    { source: 'market', price: 1_200_000n, timestamp: Date.now(), confidence: 90 },
                    'hacker'
                )
            ).toThrow();
        });

        it('rejects invalid confidence score', () => {
            expect(() =>
                pricing.submitOracleData(
                    { source: 'market', price: 1_200_000n, timestamp: Date.now(), confidence: 150 },
                    oracle
                )
            ).toThrow();
        });
    });

    describe('getPriceForAmount', () => {
        it('calculates total cost for kWh amount', () => {
            const total = pricing.getPriceForAmount('US-WEST', 10);
            expect(total).toBe(pricing.getPrice('US-WEST') * 10n);
        });
    });

    describe('price history and volatility', () => {
        it('records price history', () => {
            pricing.updatePrice('US-WEST', 100, 100, owner);
            pricing.updatePrice('US-WEST', 80, 120, owner);
            const history = pricing.getPriceHistory('US-WEST', 10);
            expect(history.length).toBeGreaterThanOrEqual(2);
        });

        it('calculates volatility index', () => {
            for (let i = 0; i < 5; i++) {
                pricing.updatePrice('US-WEST', 100 - i * 10, 100 + i * 10, owner);
            }
            const vol = pricing.getVolatilityIndex('US-WEST');
            expect(vol).toBeGreaterThanOrEqual(0);
        });
    });

    describe('batch operations', () => {
        it('batch updates multiple regions', () => {
            pricing.setGeographicZone({ ...zone, regionId: 'EU-CENTRAL' }, owner);
            const results = pricing.batchUpdatePrices(
                [
                    { regionId: 'US-WEST', supply: 100, demand: 100 },
                    { regionId: 'EU-CENTRAL', supply: 80, demand: 90 },
                ],
                owner
            );
            expect(results.size).toBe(2);
        });
    });
});
