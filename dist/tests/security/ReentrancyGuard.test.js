"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ReentrancyGuard_1 = require("../../contracts/security/ReentrancyGuard");
describe("ReentrancyGuard", () => {
    let guard;
    beforeEach(() => {
        guard = new ReentrancyGuard_1.ReentrancyGuard({
            maxDepth: 5,
            loggingEnabled: false,
            blockOnAttack: true
        });
    });
    it("should allow a single call", async () => {
        const result = await guard.protect(async () => {
            return "success";
        }, "0x1", "0x2", "test()");
        expect(result).toBe("success");
        expect(guard.locked()).toBe(false);
    });
    it("should prevent direct reentrancy", async () => {
        await expect(guard.protect(async () => {
            return await guard.protect(async () => {
                return "fail";
            }, "0x1", "0x2", "test()");
        }, "0x1", "0x2", "test()")).rejects.toThrow("REENTRANCY_ATTACK_PREVENTED: Detected type SAME_FUNCTION");
    });
    it("should prevent cross-function reentrancy in the same contract", async () => {
        await expect(guard.protect(async () => {
            return await guard.protect(async () => {
                return "fail";
            }, "0x1", "0x2", "anotherTest()");
        }, "0x1", "0x2", "test()")).rejects.toThrow("REENTRANCY_ATTACK_PREVENTED: Detected type CROSS_FUNCTION");
    });
    it("should track depth and throw if exceeded", async () => {
        const deepCall = async (current) => {
            if (current > 5)
                return "done";
            return await guard.protect(async () => await deepCall(current + 1), `0x${current}`, `0x${current + 1}`, "call()");
        };
        await expect(deepCall(1)).rejects.toThrow("MAX_CALL_DEPTH_EXCEEDED");
    });
    it("should allow emergency pause", async () => {
        guard.emergencyPause();
        await expect(guard.protect(async () => "success", "0x1", "0x2", "test()")).rejects.toThrow("REENTRANCY_GUARD_PAUSED");
    });
    it("should restore state correctly after a call", async () => {
        await guard.protect(async () => {
            expect(guard.locked()).toBe(true);
        }, "0x1", "0x2", "test()");
        expect(guard.locked()).toBe(false);
    });
});
//# sourceMappingURL=ReentrancyGuard.test.js.map