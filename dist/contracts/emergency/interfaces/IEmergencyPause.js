"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyPauseError = void 0;
/**
 * @dev Emergency pause errors
 */
var EmergencyPauseError;
(function (EmergencyPauseError) {
    EmergencyPauseError["INSUFFICIENT_SIGNATURES"] = "INSUFFICIENT_SIGNATURES";
    EmergencyPauseError["INVALID_PAUSE_LEVEL"] = "INVALID_PAUSE_LEVEL";
    EmergencyPauseError["CONTRACT_ALREADY_PAUSED"] = "CONTRACT_ALREADY_PAUSED";
    EmergencyPauseError["CONTRACT_NOT_PAUSED"] = "CONTRACT_NOT_PAUSED";
    EmergencyPauseError["UNAUTHORIZED_GOVERNANCE_ACTION"] = "UNAUTHORIZED_GOVERNANCE_ACTION";
    EmergencyPauseError["AUTO_RESUME_CONDITIONS_NOT_MET"] = "AUTO_RESUME_CONDITIONS_NOT_MET";
    EmergencyPauseError["PAUSE_DURATION_EXCEEDED"] = "PAUSE_DURATION_EXCEEDED";
    EmergencyPauseError["INVALID_GOVERNANCE_MEMBER"] = "INVALID_GOVERNANCE_MEMBER";
    EmergencyPauseError["EMERGENCY_ALREADY_ACTIVE"] = "EMERGENCY_ALREADY_ACTIVE";
    EmergencyPauseError["NO_EMERGENCY_ACTIVE"] = "NO_EMERGENCY_ACTIVE";
})(EmergencyPauseError || (exports.EmergencyPauseError = EmergencyPauseError = {}));
//# sourceMappingURL=IEmergencyPause.js.map