/**
 * @title Geographic Library
 * @dev Library for geographic calculations and verifications
 * @author CurrentDAO
 */
import { Coordinates, DistanceMethod, PrivacyZone, GridZone } from '../structures/LocationStructure';
export declare class GeoLib {
    private static readonly EARTH_RADIUS_KM;
    private static readonly ACCURACY_THRESHOLD;
    private static readonly MAX_VERIFICATION_DISTANCE;
    /**
     * @dev Calculate distance between two coordinates using Haversine formula
     * @param from Starting coordinates
     * @param to Ending coordinates
     * @return Distance in kilometers
     */
    static calculateDistance(from: Coordinates, to: Coordinates, method?: DistanceMethod): number;
    /**
     * @dev Haversine distance calculation (most accurate for GPS coordinates)
     */
    private static haversineDistance;
    /**
     * @dev Euclidean distance calculation (faster but less accurate)
     */
    private static euclideanDistance;
    /**
     * @dev Manhattan distance calculation
     */
    private static manhattanDistance;
    /**
     * @dev Check if coordinates are within a specified radius
     */
    static isWithinRadius(center: Coordinates, point: Coordinates, radiusKm: number): boolean;
    /**
     * @dev Check if coordinates are within a grid zone
     */
    static isWithinGridZone(coordinates: Coordinates, gridZone: GridZone): boolean;
    /**
     * @dev Check if a point is within a polygon using ray casting algorithm
     */
    private static isPointInPolygon;
    /**
     * @dev Generate privacy zone coordinates
     */
    static generatePrivacyZone(original: Coordinates, privacyLevel: number): PrivacyZone;
    /**
     * @dev Obscure coordinates within a given radius
     */
    private static obscureCoordinates;
    /**
     * @dev Verify coordinates against expected location
     */
    static verifyCoordinates(submitted: Coordinates, expected: Coordinates, toleranceKm?: number): boolean;
    /**
     * @dev Validate coordinate bounds
     */
    static validateCoordinates(coordinates: Coordinates): boolean;
    /**
     * @dev Calculate bearing between two points
     */
    static calculateBearing(from: Coordinates, to: Coordinates): number;
    /**
     * @dev Find nearest grid zone to coordinates
     */
    static findNearestGridZone(coordinates: Coordinates, gridZones: GridZone[]): GridZone | null;
    /**
     * @dev Calculate centroid of a polygon
     */
    private static calculatePolygonCentroid;
    /**
     * @dev Calculate area of a polygon (in square kilometers)
     */
    static calculatePolygonArea(polygon: Coordinates[]): number;
    /**
     * @dev Utility function to convert degrees to radians
     */
    private static toRadians;
    /**
     * @dev Utility function to convert radians to degrees
     */
    private static toDegrees;
    /**
     * @dev Check if distance calculation meets accuracy requirements
     */
    static validateAccuracy(distance: number, expectedDistance: number): boolean;
    /**
     * @dev Generate location hash for quick lookups
     */
    static generateLocationHash(coordinates: Coordinates, precision?: number): string;
    /**
     * @dev Check if two locations are within trading distance
     */
    static canTrade(location1: Coordinates, location2: Coordinates, maxDistanceKm: number): boolean;
}
//# sourceMappingURL=GeoLib.d.ts.map