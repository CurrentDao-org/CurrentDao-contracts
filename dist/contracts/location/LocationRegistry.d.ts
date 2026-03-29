/**
 * @title Location Registry Contract
 * @dev Geographic location registry for energy production and consumption
 * @author CurrentDAO
 */
import { Coordinates, LocationData, LocationType, PrivacyLevel, PricingZone, LocationVerification, DistanceCalculation, VerificationMethod, ZoneRestrictions } from './structures/LocationStructure';
import { ILocationRegistry } from './interfaces/ILocationRegistry';
export declare class LocationRegistry implements ILocationRegistry {
    private locations;
    private ownerLocations;
    private gridZoneLocations;
    private typeLocations;
    private gridZones;
    private pricingZones;
    private verificationHistory;
    private verifiers;
    private privacyZones;
    private distanceCache;
    private registrationPaused;
    private locationCounter;
    private gridZoneCounter;
    private pricingZoneCounter;
    private static readonly MAX_LOCATIONS_PER_OWNER;
    private static readonly VERIFICATION_TIMEOUT;
    private static readonly DISTANCE_CACHE_SIZE;
    constructor();
    registerLocation(coordinates: Coordinates, locationType: LocationType, privacyLevel: PrivacyLevel, metadata: string, owner?: string): Promise<string>;
    updateLocation(locationId: string, coordinates: Coordinates, metadata: string, caller?: string): Promise<boolean>;
    deactivateLocation(locationId: string, caller?: string): Promise<boolean>;
    getLocation(locationId: string): Promise<LocationData>;
    getLocationsByOwner(owner: string): Promise<LocationData[]>;
    getLocationsByGridZone(gridZoneId: string): Promise<LocationData[]>;
    getLocationsByType(locationType: LocationType): Promise<LocationData[]>;
    createGridZone(name: string, boundaries: Coordinates[], pricingZoneId: string, restrictions: ZoneRestrictions, caller?: string): Promise<string>;
    assignGridZone(locationId: string, caller?: string): Promise<string>;
    updateGridZoneBoundaries(zoneId: string, boundaries: Coordinates[], caller?: string): Promise<boolean>;
    verifyLocation(locationId: string, verificationMethod: VerificationMethod, evidence: string, verifier?: string): Promise<boolean>;
    requestVerification(locationId: string): Promise<boolean>;
    getVerificationHistory(locationId: string): Promise<LocationVerification[]>;
    updatePrivacyLevel(locationId: string, privacyLevel: PrivacyLevel, caller?: string): Promise<boolean>;
    getPublicCoordinates(locationId: string): Promise<Coordinates>;
    isWithinPrivacyZone(locationId: string, coordinates: Coordinates): Promise<boolean>;
    calculateDistance(fromLocationId: string, toLocationId: string): Promise<DistanceCalculation>;
    canTrade(locationId1: string, locationId2: string, maxDistanceKm: number): Promise<boolean>;
    getNearbyLocations(locationId: string, radiusKm: number, locationType: LocationType): Promise<LocationData[]>;
    createPricingZone(name: string, basePrice: number, peakMultiplier: number, offPeakMultiplier: number, regionalAdjustment: number, caller?: string): Promise<string>;
    updatePricingZone(pricingZoneId: string, basePrice: number, peakMultiplier: number, offPeakMultiplier: number, regionalAdjustment: number, caller?: string): Promise<boolean>;
    getPricingZone(pricingZoneId: string): Promise<PricingZone>;
    getPricingZoneForLocation(locationId: string): Promise<PricingZone>;
    addVerifier(verifier: string, caller?: string): Promise<boolean>;
    removeVerifier(verifier: string, caller?: string): Promise<boolean>;
    pauseRegistration(caller?: string): Promise<boolean>;
    unpauseRegistration(caller?: string): Promise<boolean>;
    private generateLocationId;
    private generateGridZoneId;
    private generatePricingZoneId;
    private findGridZoneForLocation;
}
//# sourceMappingURL=LocationRegistry.d.ts.map