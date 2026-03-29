/**
 * @title ILocationRegistry Interface
 * @dev Interface for geographic location registry contract
 * @author CurrentDAO
 */
import { Coordinates, LocationData, LocationType, PrivacyLevel, GridZone, PricingZone, LocationVerification, DistanceCalculation, VerificationMethod, ZoneRestrictions } from '../structures/LocationStructure';
export interface ILocationRegistry {
    registerLocation(coordinates: Coordinates, locationType: LocationType, privacyLevel: PrivacyLevel, metadata: string): Promise<string>;
    updateLocation(locationId: string, coordinates: Coordinates, metadata: string): Promise<boolean>;
    deactivateLocation(locationId: string): Promise<boolean>;
    getLocation(locationId: string): Promise<LocationData>;
    getLocationsByOwner(owner: string): Promise<LocationData[]>;
    getLocationsByGridZone(gridZoneId: string): Promise<LocationData[]>;
    getLocationsByType(locationType: LocationType): Promise<LocationData[]>;
    createGridZone(name: string, boundaries: Coordinates[], pricingZoneId: string, restrictions: ZoneRestrictions): Promise<string>;
    assignGridZone(locationId: string): Promise<string>;
    updateGridZoneBoundaries(zoneId: string, boundaries: Coordinates[]): Promise<boolean>;
    verifyLocation(locationId: string, verificationMethod: VerificationMethod, evidence: string): Promise<boolean>;
    requestVerification(locationId: string): Promise<boolean>;
    getVerificationHistory(locationId: string): Promise<LocationVerification[]>;
    updatePrivacyLevel(locationId: string, privacyLevel: PrivacyLevel): Promise<boolean>;
    getPublicCoordinates(locationId: string): Promise<Coordinates>;
    isWithinPrivacyZone(locationId: string, coordinates: Coordinates): Promise<boolean>;
    calculateDistance(fromLocationId: string, toLocationId: string): Promise<DistanceCalculation>;
    canTrade(locationId1: string, locationId2: string, maxDistanceKm: number): Promise<boolean>;
    getNearbyLocations(locationId: string, radiusKm: number, locationType: LocationType): Promise<LocationData[]>;
    createPricingZone(name: string, basePrice: number, peakMultiplier: number, offPeakMultiplier: number, regionalAdjustment: number): Promise<string>;
    updatePricingZone(pricingZoneId: string, basePrice: number, peakMultiplier: number, offPeakMultiplier: number, regionalAdjustment: number): Promise<boolean>;
    getPricingZone(pricingZoneId: string): Promise<PricingZone>;
    getPricingZoneForLocation(locationId: string): Promise<PricingZone>;
    addVerifier(verifier: string): Promise<boolean>;
    removeVerifier(verifier: string): Promise<boolean>;
    pauseRegistration(): Promise<boolean>;
    unpauseRegistration(): Promise<boolean>;
}
export interface ILocationOracle {
    verifyCoordinates(coordinates: Coordinates, evidence: string): Promise<{
        verified: boolean;
        confidence: number;
    }>;
}
export interface IGridManager {
    getOptimalGridZone(coordinates: Coordinates): Promise<string>;
    validateGridZoneAssignment(locationId: string, gridZoneId: string): Promise<boolean>;
}
export interface IPricingOracle {
    getCurrentPrice(pricingZoneId: string): Promise<number>;
    getPeakPrice(pricingZoneId: string): Promise<number>;
    getOffPeakPrice(pricingZoneId: string): Promise<number>;
}
export interface ITradingSystem {
    isLocationEligible(locationId: string): Promise<boolean>;
    getLocationTradingLimits(locationId: string): Promise<{
        productionLimit: number;
        consumptionLimit: number;
    }>;
}
export interface ILocationRegistryStorage {
    locations: Map<string, LocationData>;
    ownerLocations: Map<string, string[]>;
    gridZoneLocations: Map<string, string[]>;
    typeLocations: Map<LocationType, string[]>;
    gridZones: Map<string, GridZone>;
    pricingZones: Map<string, PricingZone>;
    verificationHistory: Map<string, LocationVerification[]>;
    verifiers: Map<string, boolean>;
    privacyZones: Map<string, PrivacyZone>;
    distanceCache: Map<string, DistanceCalculation[]>;
}
//# sourceMappingURL=ILocationRegistry.d.ts.map