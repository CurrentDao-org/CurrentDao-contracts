"use strict";
/**
 * Batch structure definitions for transaction batching system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionType = exports.TransactionPriority = exports.BatchStatus = void 0;
var BatchStatus;
(function (BatchStatus) {
    BatchStatus["PENDING"] = "pending";
    BatchStatus["VALIDATING"] = "validating";
    BatchStatus["EXECUTING"] = "executing";
    BatchStatus["COMPLETED"] = "completed";
    BatchStatus["FAILED"] = "failed";
    BatchStatus["CANCELLED"] = "cancelled";
    BatchStatus["ROLLED_BACK"] = "rolled_back";
})(BatchStatus || (exports.BatchStatus = BatchStatus = {}));
var TransactionPriority;
(function (TransactionPriority) {
    TransactionPriority[TransactionPriority["LOW"] = 0] = "LOW";
    TransactionPriority[TransactionPriority["MEDIUM"] = 1] = "MEDIUM";
    TransactionPriority[TransactionPriority["HIGH"] = 2] = "HIGH";
    TransactionPriority[TransactionPriority["URGENT"] = 3] = "URGENT";
    TransactionPriority[TransactionPriority["EMERGENCY"] = 4] = "EMERGENCY";
})(TransactionPriority || (exports.TransactionPriority = TransactionPriority = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["TRANSFER"] = "transfer";
    TransactionType["APPROVE"] = "approve";
    TransactionType["MINT"] = "mint";
    TransactionType["BURN"] = "burn";
    TransactionType["STAKE"] = "stake";
    TransactionType["UNSTAKE"] = "unstake";
    TransactionType["SWAP"] = "swap";
    TransactionType["CUSTOM"] = "custom";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
//# sourceMappingURL=BatchStructure.js.map