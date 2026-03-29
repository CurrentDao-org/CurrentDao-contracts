"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeMath = void 0;
class SafeMath {
    static add(a, b) {
        const c = a + b;
        if (c < a) {
            throw new Error("SafeMath: addition overflow");
        }
        return c;
    }
    static sub(a, b) {
        if (b > a) {
            throw new Error("SafeMath: subtraction overflow");
        }
        return a - b;
    }
    static mul(a, b) {
        if (a === 0)
            return 0;
        const c = a * b;
        return c;
    }
    static div(a, b) {
        if (b === 0) {
            throw new Error("SafeMath: division by zero");
        }
        const c = Math.floor(a / b);
        return c;
    }
}
exports.SafeMath = SafeMath;
//# sourceMappingURL=SafeMath.js.map