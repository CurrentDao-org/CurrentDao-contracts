"use strict";
/**
 * @title Location Registry Contract
 * @dev Geographic location registry for energy production and consumption
 * @author CurrentDAO
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationRegistry = void 0;
const GeoLib_1 = require("./libraries/GeoLib");
const LocationStructure_1 = require("./structures/LocationStructure");
class LocationRegistry {
    // Storage
    locations = new Map();
    ownerLocations = new Map();
    gridZoneLocations = new Map();
    typeLocations = new Map();
    gridZones = new Map();
    pricingZones = new Map();
    verificationHistory = new Map();
    verifiers = new Map();
    privacyZones = new Map();
    distanceCache = new Map();
    // State variables
    registrationPaused = false;
    locationCounter = 0;
    gridZoneCounter = 0;
    pricingZoneCounter = 0;
    // Constants
    static MAX_LOCATIONS_PER_OWNER = 100;
    static VERIFICATION_TIMEOUT = 86400; // 24 hours in seconds
    static DISTANCE_CACHE_SIZE = 1000;
    constructor() {
        // Initialize with default admin
        this.verifiers.set('admin', true);
    }
    // Core location management functions
    async registerLocation(coordinates, locationType, privacyLevel, metadata, owner = 'default' // In real implementation, this would be msg.sender
    ) {
        if (this.registrationPaused) {
            throw new Error('Registration is currently paused');
        }
        if (!GeoLib_1.GeoLib.validateCoordinates(coordinates)) {
            throw new Error('Invalid coordinates');
        }
        // Check owner limit
        const ownerLocs = this.ownerLocations.get(owner) || [];
        if (ownerLocs.length >= LocationRegistry.MAX_LOCATIONS_PER_OWNER) {
            throw new Error('Maximum locations per owner exceeded');
        }
        // Generate unique location ID
        const locationId = this.generateLocationId(owner);
        // Find appropriate grid zone
        const gridZoneId = await this.findGridZoneForLocation(coordinates);
        // Create privacy zone if needed
        let privacyZone;
        if (privacyLevel !== LocationStructure_1.PrivacyLevel.PUBLIC) {
            privacyZone = GeoLib_1.GeoLib.generatePrivacyZone(coordinates, privacyLevel);
            this.privacyZones.set(locationId, privacyZone);
        }
        const locationData = {
            id: locationId,
            owner,
            coordinates,
            gridZone: gridZoneId,
            locationType,
            verificationStatus: LocationStructure_1.VerificationStatus.UNVERIFIED,
            privacyLevel,
            registeredAt: Date.now(),
            lastVerified: 0,
            metadata
        };
        // Store location
        this.locations.set(locationId, locationData);
        // Update indexes
        ownerLocs.push(locationId);
        this.ownerLocations.set(owner, ownerLocs);
        const gridZoneLocs = this.gridZoneLocations.get(gridZoneId) || [];
        gridZoneLocs.push(locationId);
        this.gridZoneLocations.set(gridZoneId, gridZoneLocs);
        const typeLocs = this.typeLocations.get(locationType) || [];
        typeLocs.push(locationId);
        this.typeLocations.set(locationType, typeLocs);
        // Emit event (in real implementation)
        console.log(`LocationRegistered: ${locationId}, owner: ${owner}`);
        return locationId;
    }
    async updateLocation(locationId, coordinates, metadata, caller = 'default' // In real implementation, this would be msg.sender
    ) {
        const location = this.locations.get(locationId);
        if (!location) {
            throw new Error('Location not found');
        }
        if (location.owner !== caller && !this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        if (!GeoLib_1.GeoLib.validateCoordinates(coordinates)) {
            throw new Error('Invalid coordinates');
        }
        // Update location
        location.coordinates = coordinates;
        location.metadata = metadata;
        location.lastVerified = 0; // Reset verification status
        // Update grid zone if coordinates changed significantly
        const newGridZoneId = await this.findGridZoneForLocation(coordinates);
        if (newGridZoneId !== location.gridZone) {
            // Remove from old grid zone
            const oldGridZoneLocs = this.gridZoneLocations.get(location.gridZone) || [];
            const oldIndex = oldGridZoneLocs.indexOf(locationId);
            if (oldIndex > -1) {
                oldGridZoneLocs.splice(oldIndex, 1);
                this.gridZoneLocations.set(location.gridZone, oldGridZoneLocs);
            }
            // Add to new grid zone
            const newGridZoneLocs = this.gridZoneLocations.get(newGridZoneId) || [];
            newGridZoneLocs.push(locationId);
            this.gridZoneLocations.set(newGridZoneId, newGridZoneLocs);
            location.gridZone = newGridZoneId;
        }
        // Update privacy zone if needed
        if (location.privacyLevel !== LocationStructure_1.PrivacyLevel.PUBLIC) {
            const privacyZone = GeoLib_1.GeoLib.generatePrivacyZone(coordinates, location.privacyLevel);
            this.privacyZones.set(locationId, privacyZone);
        }
        this.locations.set(locationId, location);
        // Emit event
        console.log(`LocationUpdated: ${locationId}`);
        return true;
    }
    async deactivateLocation(locationId, caller = 'default' // In real implementation, this would be msg.sender
    ) {
        const location = this.locations.get(locationId);
        if (!location) {
            throw new Error('Location not found');
        }
        if (location.owner !== caller && !this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        // Remove from indexes
        const ownerLocs = this.ownerLocations.get(location.owner) || [];
        const ownerIndex = ownerLocs.indexOf(locationId);
        if (ownerIndex > -1) {
            ownerLocs.splice(ownerIndex, 1);
            this.ownerLocations.set(location.owner, ownerLocs);
        }
        const gridZoneLocs = this.gridZoneLocations.get(location.gridZone) || [];
        const gridZoneIndex = gridZoneLocs.indexOf(locationId);
        if (gridZoneIndex > -1) {
            gridZoneLocs.splice(gridZoneIndex, 1);
            this.gridZoneLocations.set(location.gridZone, gridZoneLocs);
        }
        const typeLocs = this.typeLocations.get(location.locationType) || [];
        const typeIndex = typeLocs.indexOf(locationId);
        if (typeIndex > -1) {
            typeLocs.splice(typeIndex, 1);
            this.typeLocations.set(location.locationType, typeLocs);
        }
        // Remove location
        this.locations.delete(locationId);
        this.privacyZones.delete(locationId);
        // Emit event
        console.log(`LocationDeactivated: ${locationId}`);
        return true;
    }
    // Location query functions
    async getLocation(locationId) {
        const location = this.locations.get(locationId);
        if (!location) {
            throw new Error('Location not found');
        }
        return location;
    }
    async getLocationsByOwner(owner) {
        const locationIds = this.ownerLocations.get(owner) || [];
        const locations = [];
        for (const id of locationIds) {
            const location = this.locations.get(id);
            if (location) {
                locations.push(location);
            }
        }
        return locations;
    }
    async getLocationsByGridZone(gridZoneId) {
        const locationIds = this.gridZoneLocations.get(gridZoneId) || [];
        const locations = [];
        for (const id of locationIds) {
            const location = this.locations.get(id);
            if (location) {
                locations.push(location);
            }
        }
        return locations;
    }
    async getLocationsByType(locationType) {
        const locationIds = this.typeLocations.get(locationType) || [];
        const locations = [];
        for (const id of locationIds) {
            const location = this.locations.get(id);
            if (location) {
                locations.push(location);
            }
        }
        return locations;
    }
    // Grid zone management
    async createGridZone(name, boundaries, pricingZoneId, restrictions, caller = 'default' // In real implementation, this would be msg.sender
    ) {
        if (!this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        if (boundaries.length < 3) {
            throw new Error('Invalid grid zone boundaries');
        }
        const gridZoneId = this.generateGridZoneId();
        const gridZone = {
            id: gridZoneId,
            name,
            boundaries,
            pricingZone: pricingZoneId,
            isActive: true,
            restrictions
        };
        this.gridZones.set(gridZoneId, gridZone);
        // Emit event
        console.log(`GridZoneCreated: ${gridZoneId}`);
        return gridZoneId;
    }
    async assignGridZone(locationId, caller = 'default') {
        const location = this.locations.get(locationId);
        if (!location) {
            throw new Error('Location not found');
        }
        if (location.owner !== caller && !this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        const newGridZoneId = await this.findGridZoneForLocation(location.coordinates);
        if (newGridZoneId !== location.gridZone) {
            // Remove from old grid zone
            const oldGridZoneLocs = this.gridZoneLocations.get(location.gridZone) || [];
            const oldIndex = oldGridZoneLocs.indexOf(locationId);
            if (oldIndex > -1) {
                oldGridZoneLocs.splice(oldIndex, 1);
                this.gridZoneLocations.set(location.gridZone, oldGridZoneLocs);
            }
            // Add to new grid zone
            const newGridZoneLocs = this.gridZoneLocations.get(newGridZoneId) || [];
            newGridZoneLocs.push(locationId);
            this.gridZoneLocations.set(newGridZoneId, newGridZoneLocs);
            location.gridZone = newGridZoneId;
            this.locations.set(locationId, location);
            // Emit event
            console.log(`GridZoneAssigned: ${locationId} -> ${newGridZoneId}`);
        }
        return newGridZoneId;
    }
    async updateGridZoneBoundaries(zoneId, boundaries, caller = 'default') {
        if (!this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        const gridZone = this.gridZones.get(zoneId);
        if (!gridZone) {
            throw new Error('Grid zone not found');
        }
        if (boundaries.length < 3) {
            throw new Error('Invalid grid zone boundaries');
        }
        gridZone.boundaries = boundaries;
        this.gridZones.set(zoneId, gridZone);
        return true;
    }
    // Verification functions
    async verifyLocation(locationId, verificationMethod, evidence, verifier = 'default' // In real implementation, this would be msg.sender
    ) {
        if (!this.verifiers.get(verifier)) {
            throw new Error('Unauthorized verifier');
        }
        const location = this.locations.get(locationId);
        if (!location) {
            throw new Error('Location not found');
        }
        // Perform verification based on method
        let confidenceScore = 0;
        let verified = false;
        switch (verificationMethod) {
            case LocationStructure_1.VerificationMethod.GPS_COORDINATES:
                // Simple GPS coordinate verification
                verified = GeoLib_1.GeoLib.validateCoordinates(location.coordinates);
                confidenceScore = verified ? 95 : 0;
                break;
            case LocationStructure_1.VerificationMethod.SATELLITE_IMAGERY:
                // In real implementation, this would use satellite imagery API
                verified = true; // Placeholder
                confidenceScore = 90;
                break;
            case LocationStructure_1.VerificationMethod.THIRD_PARTY_ORACLE:
                // In real implementation, this would call external oracle
                verified = true; // Placeholder
                confidenceScore = 85;
                break;
            case LocationStructure_1.VerificationMethod.MANUAL_VERIFICATION:
                // Manual verification by authorized verifier
                verified = true;
                confidenceScore = 100;
                break;
        }
        if (!verified) {
            throw new Error('Verification failed');
        }
        // Update location verification status
        location.verificationStatus = LocationStructure_1.VerificationStatus.VERIFIED;
        location.lastVerified = Date.now();
        this.locations.set(locationId, location);
        // Record verification
        const verification = {
            locationId,
            verifier,
            verificationMethod,
            confidenceScore,
            verifiedAt: Date.now(),
            evidence
        };
        const history = this.verificationHistory.get(locationId) || [];
        history.push(verification);
        this.verificationHistory.set(locationId, history);
        // Emit event
        console.log(`LocationVerified: ${locationId} by ${verifier}`);
        return true;
    }
    async requestVerification(locationId) {
        const location = this.locations.get(locationId);
        if (!location) {
            throw new Error('Location not found');
        }
        if (location.verificationStatus === LocationStructure_1.VerificationStatus.PENDING) {
            throw new Error('Verification already pending');
        }
        location.verificationStatus = LocationStructure_1.VerificationStatus.PENDING;
        this.locations.set(locationId, location);
        return true;
    }
    async getVerificationHistory(locationId) {
        return this.verificationHistory.get(locationId) || [];
    }
    // Privacy functions
    async updatePrivacyLevel(locationId, privacyLevel, caller = 'default') {
        const location = this.locations.get(locationId);
        if (!location) {
            throw new Error('Location not found');
        }
        if (location.owner !== caller && !this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        const oldLevel = location.privacyLevel;
        location.privacyLevel = privacyLevel;
        this.locations.set(locationId, location);
        // Update privacy zone
        if (privacyLevel === LocationStructure_1.PrivacyLevel.PUBLIC) {
            this.privacyZones.delete(locationId);
        }
        else {
            const privacyZone = GeoLib_1.GeoLib.generatePrivacyZone(location.coordinates, privacyLevel);
            this.privacyZones.set(locationId, privacyZone);
        }
        // Emit event
        console.log(`PrivacyLevelUpdated: ${locationId} from ${oldLevel} to ${privacyLevel}`);
        return true;
    }
    async getPublicCoordinates(locationId) {
        const location = this.locations.get(locationId);
        if (!location) {
            throw new Error('Location not found');
        }
        if (location.privacyLevel === LocationStructure_1.PrivacyLevel.PUBLIC) {
            return location.coordinates;
        }
        const privacyZone = this.privacyZones.get(locationId);
        if (privacyZone) {
            return privacyZone.obscuredCoordinates;
        }
        return location.coordinates;
    }
    async isWithinPrivacyZone(locationId, coordinates) {
        const privacyZone = this.privacyZones.get(locationId);
        if (!privacyZone) {
            return false;
        }
        return GeoLib_1.GeoLib.isWithinRadius(privacyZone.center, coordinates, privacyZone.radius);
    }
    // Distance and trading functions
    async calculateDistance(fromLocationId, toLocationId) {
        const fromLocation = this.locations.get(fromLocationId);
        const toLocation = this.locations.get(toLocationId);
        if (!fromLocation || !toLocation) {
            throw new Error('Location not found');
        }
        const distance = GeoLib_1.GeoLib.calculateDistance(fromLocation.coordinates, toLocation.coordinates);
        const calculation = {
            fromLocation: fromLocationId,
            toLocation: toLocationId,
            distance,
            calculationMethod: LocationStructure_1.DistanceMethod.HAVERSINE,
            calculatedAt: Date.now()
        };
        // Cache the calculation
        const cacheKey = `${fromLocationId}-${toLocationId}`;
        const cache = this.distanceCache.get(cacheKey) || [];
        cache.push(calculation);
        // Limit cache size
        if (cache.length > LocationRegistry.DISTANCE_CACHE_SIZE) {
            cache.shift();
        }
        this.distanceCache.set(cacheKey, cache);
        return calculation;
    }
    async canTrade(locationId1, locationId2, maxDistanceKm) {
        const location1 = this.locations.get(locationId1);
        const location2 = this.locations.get(locationId2);
        if (!location1 || !location2) {
            throw new Error('Location not found');
        }
        return GeoLib_1.GeoLib.canTrade(location1.coordinates, location2.coordinates, maxDistanceKm);
    }
    async getNearbyLocations(locationId, radiusKm, locationType) {
        const centerLocation = this.locations.get(locationId);
        if (!centerLocation) {
            throw new Error('Location not found');
        }
        const nearbyLocations = [];
        // Get all locations of the specified type
        const typeLocations = await this.getLocationsByType(locationType);
        for (const location of typeLocations) {
            if (location.id === locationId)
                continue; // Skip self
            const distance = GeoLib_1.GeoLib.calculateDistance(centerLocation.coordinates, location.coordinates);
            if (distance <= radiusKm) {
                nearbyLocations.push(location);
            }
        }
        return nearbyLocations;
    }
    // Pricing zone functions
    async createPricingZone(name, basePrice, peakMultiplier, offPeakMultiplier, regionalAdjustment, caller = 'default') {
        if (!this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        const pricingZoneId = this.generatePricingZoneId();
        const pricingZone = {
            id: pricingZoneId,
            name,
            basePrice,
            peakMultiplier,
            offPeakMultiplier,
            regionalAdjustment,
            isActive: true
        };
        this.pricingZones.set(pricingZoneId, pricingZone);
        // Emit event
        console.log(`PricingZoneCreated: ${pricingZoneId}`);
        return pricingZoneId;
    }
    async updatePricingZone(pricingZoneId, basePrice, peakMultiplier, offPeakMultiplier, regionalAdjustment, caller = 'default') {
        if (!this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        const pricingZone = this.pricingZones.get(pricingZoneId);
        if (!pricingZone) {
            throw new Error('Pricing zone not found');
        }
        pricingZone.basePrice = basePrice;
        pricingZone.peakMultiplier = peakMultiplier;
        pricingZone.offPeakMultiplier = offPeakMultiplier;
        pricingZone.regionalAdjustment = regionalAdjustment;
        this.pricingZones.set(pricingZoneId, pricingZone);
        // Emit event
        console.log(`PricingZoneUpdated: ${pricingZoneId}`);
        return true;
    }
    async getPricingZone(pricingZoneId) {
        const pricingZone = this.pricingZones.get(pricingZoneId);
        if (!pricingZone) {
            throw new Error('Pricing zone not found');
        }
        return pricingZone;
    }
    async getPricingZoneForLocation(locationId) {
        const location = this.locations.get(locationId);
        if (!location) {
            throw new Error('Location not found');
        }
        const gridZone = this.gridZones.get(location.gridZone);
        if (!gridZone) {
            throw new Error('Grid zone not found');
        }
        return this.getPricingZone(gridZone.pricingZone);
    }
    // Admin functions
    async addVerifier(verifier, caller = 'default') {
        if (!this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        this.verifiers.set(verifier, true);
        return true;
    }
    async removeVerifier(verifier, caller = 'default') {
        if (!this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        this.verifiers.delete(verifier);
        return true;
    }
    async pauseRegistration(caller = 'default') {
        if (!this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        this.registrationPaused = true;
        return true;
    }
    async unpauseRegistration(caller = 'default') {
        if (!this.verifiers.get(caller)) {
            throw new Error('Unauthorized access');
        }
        this.registrationPaused = false;
        return true;
    }
    // Helper functions
    generateLocationId(owner) {
        this.locationCounter++;
        return `loc_${owner}_${this.locationCounter}`;
    }
    generateGridZoneId() {
        this.gridZoneCounter++;
        return `zone_${this.gridZoneCounter}`;
    }
    generatePricingZoneId() {
        this.pricingZoneCounter++;
        return `price_${this.pricingZoneCounter}`;
    }
    async findGridZoneForLocation(coordinates) {
        const gridZones = Array.from(this.gridZones.values());
        const nearestZone = GeoLib_1.GeoLib.findNearestGridZone(coordinates, gridZones);
        if (nearestZone) {
            return nearestZone.id;
        }
        // Create default zone if none found
        const defaultZoneId = await this.createGridZone('Default Zone', [
            { latitude: -90, longitude: -180 },
            { latitude: 90, longitude: -180 },
            { latitude: 90, longitude: 180 },
            { latitude: -90, longitude: 180 }
        ], 'default_price', {
            maxProductionCapacity: Number.MAX_SAFE_INTEGER,
            maxConsumptionDemand: Number.MAX_SAFE_INTEGER,
            allowedLocationTypes: [LocationStructure_1.LocationType.PRODUCER, LocationStructure_1.LocationType.CONSUMER, LocationStructure_1.LocationType.PROSUMER, LocationStructure_1.LocationType.GRID_NODE],
            verificationRequired: false
        });
        return defaultZoneId;
    }
}
exports.LocationRegistry = LocationRegistry;
//# sourceMappingURL=LocationRegistry.js.map