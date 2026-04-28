import { PricePoint, GeographicZone, OracleData, PricingModel } from '../structures/PricingStructs';

export interface IDynamicPricing {
    updatePrice(regionId: string, supply: number, demand: number, caller: string): bigint;

    getPrice(regionId: string): bigint;

    getPriceForAmount(regionId: string, kWh: number): bigint;

    setGeographicZone(zone: GeographicZone, caller: string): void;

    getGeographicZone(regionId: string): GeographicZone;

    submitOracleData(data: OracleData, caller: string): void;

    setPricingModel(regionId: string, model: PricingModel, caller: string): void;

    getPriceHistory(regionId: string, limit: number): PricePoint[];

    getVolatilityIndex(regionId: string): number;
}
