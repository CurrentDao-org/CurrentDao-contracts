"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReentrancyType = void 0;
var ReentrancyType;
(function (ReentrancyType) {
    ReentrancyType[ReentrancyType["NONE"] = 0] = "NONE";
    ReentrancyType[ReentrancyType["SAME_FUNCTION"] = 1] = "SAME_FUNCTION";
    ReentrancyType[ReentrancyType["CROSS_FUNCTION"] = 2] = "CROSS_FUNCTION";
    ReentrancyType[ReentrancyType["CROSS_CONTRACT"] = 3] = "CROSS_CONTRACT";
})(ReentrancyType || (exports.ReentrancyType = ReentrancyType = {}));
//# sourceMappingURL=IReentrancyGuard.js.map