"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationStatus = void 0;
/**
 * Enumeration of migration statuses to track the lifecycle of an emergency migration.
 */
var MigrationStatus;
(function (MigrationStatus) {
    MigrationStatus["IDLE"] = "IDLE";
    MigrationStatus["TRIGGERED"] = "TRIGGERED";
    MigrationStatus["IN_PROGRESS"] = "IN_PROGRESS";
    MigrationStatus["COMPLETED"] = "COMPLETED";
    MigrationStatus["ROLLED_BACK"] = "ROLLED_BACK";
    MigrationStatus["FAILED"] = "FAILED";
})(MigrationStatus || (exports.MigrationStatus = MigrationStatus = {}));
//# sourceMappingURL=IEmergencyMigration.js.map