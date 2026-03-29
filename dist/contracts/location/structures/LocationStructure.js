"use strict";
/**
 * @title Location Structure Library
 * @dev Data structures for geographic location registry
 * @author CurrentDAO
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationEventType = exports.DistanceMethod = exports.VerificationMethod = exports.PrivacyLevel = exports.VerificationStatus = exports.LocationType = void 0;
var LocationType;
(function (LocationType) {
    LocationType[LocationType["PRODUCER"] = 0] = "PRODUCER";
    LocationType[LocationType["CONSUMER"] = 1] = "CONSUMER";
    LocationType[LocationType["PROSUMER"] = 2] = "PROSUMER";
    LocationType[LocationType["GRID_NODE"] = 3] = "GRID_NODE";
})(LocationType || (exports.LocationType = LocationType = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus[VerificationStatus["UNVERIFIED"] = 0] = "UNVERIFIED";
    VerificationStatus[VerificationStatus["PENDING"] = 1] = "PENDING";
    VerificationStatus[VerificationStatus["VERIFIED"] = 2] = "VERIFIED";
    VerificationStatus[VerificationStatus["REJECTED"] = 3] = "REJECTED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var PrivacyLevel;
(function (PrivacyLevel) {
    PrivacyLevel[PrivacyLevel["PUBLIC"] = 0] = "PUBLIC";
    PrivacyLevel[PrivacyLevel["PRIVACY_ZONE"] = 1] = "PRIVACY_ZONE";
    PrivacyLevel[PrivacyLevel["PRIVATE"] = 2] = "PRIVATE";
})(PrivacyLevel || (exports.PrivacyLevel = PrivacyLevel = {}));
var VerificationMethod;
(function (VerificationMethod) {
    VerificationMethod[VerificationMethod["GPS_COORDINATES"] = 0] = "GPS_COORDINATES";
    VerificationMethod[VerificationMethod["SATELLITE_IMAGERY"] = 1] = "SATELLITE_IMAGERY";
    VerificationMethod[VerificationMethod["THIRD_PARTY_ORACLE"] = 2] = "THIRD_PARTY_ORACLE";
    VerificationMethod[VerificationMethod["MANUAL_VERIFICATION"] = 3] = "MANUAL_VERIFICATION";
})(VerificationMethod || (exports.VerificationMethod = VerificationMethod = {}));
var DistanceMethod;
(function (DistanceMethod) {
    DistanceMethod[DistanceMethod["HAVERSINE"] = 0] = "HAVERSINE";
    DistanceMethod[DistanceMethod["EUCLIDEAN"] = 1] = "EUCLIDEAN";
    DistanceMethod[DistanceMethod["MANHATTAN"] = 2] = "MANHATTAN";
})(DistanceMethod || (exports.DistanceMethod = DistanceMethod = {}));
var LocationEventType;
(function (LocationEventType) {
    LocationEventType[LocationEventType["REGISTERED"] = 0] = "REGISTERED";
    LocationEventType[LocationEventType["VERIFIED"] = 1] = "VERIFIED";
    LocationEventType[LocationEventType["UPDATED"] = 2] = "UPDATED";
    LocationEventType[LocationEventType["PRIVACY_CHANGED"] = 3] = "PRIVACY_CHANGED";
    LocationEventType[LocationEventType["ZONE_ASSIGNED"] = 4] = "ZONE_ASSIGNED";
    LocationEventType[LocationEventType["DEACTIVATED"] = 5] = "DEACTIVATED";
})(LocationEventType || (exports.LocationEventType = LocationEventType = {}));
//# sourceMappingURL=LocationStructure.js.map