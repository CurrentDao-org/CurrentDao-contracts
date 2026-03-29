"use strict";
/**
 * Comprehensive fee structure definitions for the fee management system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FEE_DISTRIBUTION = exports.DEFAULT_FEE_STRUCTURES = exports.ExemptionType = exports.FeeType = void 0;
var FeeType;
(function (FeeType) {
    FeeType["FIXED"] = "FIXED";
    FeeType["PERCENTAGE"] = "PERCENTAGE";
    FeeType["TIERED"] = "TIERED";
    FeeType["HYBRID"] = "HYBRID";
})(FeeType || (exports.FeeType = FeeType = {}));
var ExemptionType;
(function (ExemptionType) {
    ExemptionType["PERCENTAGE"] = "PERCENTAGE";
    ExemptionType["FIXED"] = "FIXED";
    ExemptionType["FULL"] = "FULL";
})(ExemptionType || (exports.ExemptionType = ExemptionType = {}));
// Default fee structures for common transaction types
exports.DEFAULT_FEE_STRUCTURES = {
    TRADE: {
        feeType: FeeType.TIERED,
        baseFee: 1,
        percentageFee: 50, // 0.5%
        minFee: 0.5,
        maxFee: 100,
        dynamicAdjustment: {
            enabled: true,
            minRate: 25, // 0.25%
            maxRate: 250, // 2.5%
            congestionMultiplier: 1.5
        },
        volumeThresholds: {
            discountThresholds: [
                { volume: 1000, discount: 500 }, // 5% discount for $1000+ volume
                { volume: 10000, discount: 1000 }, // 10% discount for $10000+ volume
                { volume: 100000, discount: 2000 } // 20% discount for $100000+ volume
            ],
            resetPeriod: 'monthly'
        }
    },
    TRANSFER: {
        feeType: FeeType.HYBRID,
        baseFee: 0.5,
        percentageFee: 10, // 0.1%
        minFee: 0.1,
        maxFee: 10,
        dynamicAdjustment: {
            enabled: false,
            minRate: 10,
            maxRate: 50,
            congestionMultiplier: 1.2
        },
        volumeThresholds: {
            discountThresholds: [
                { volume: 500, discount: 200 }, // 2% discount
                { volume: 5000, discount: 500 } // 5% discount
            ],
            resetPeriod: 'monthly'
        }
    },
    STAKING: {
        feeType: FeeType.FIXED,
        baseFee: 2,
        percentageFee: 0,
        minFee: 2,
        maxFee: 2,
        dynamicAdjustment: {
            enabled: false,
            minRate: 0,
            maxRate: 0,
            congestionMultiplier: 1
        },
        volumeThresholds: {
            discountThresholds: [],
            resetPeriod: 'monthly'
        }
    }
};
// Default fee distribution
exports.DEFAULT_FEE_DISTRIBUTION = {
    TRADE: {
        transactionType: 'TRADE',
        recipients: [
            { address: 'treasury', percentage: 5000, name: 'Treasury' }, // 50%
            { address: 'validators', percentage: 3000, name: 'Validators' }, // 30%
            { address: 'developers', percentage: 2000, name: 'Developers' } // 20%
        ],
        totalPercentage: 10000
    },
    TRANSFER: {
        transactionType: 'TRANSFER',
        recipients: [
            { address: 'treasury', percentage: 6000, name: 'Treasury' }, // 60%
            { address: 'validators', percentage: 4000, name: 'Validators' } // 40%
        ],
        totalPercentage: 10000
    },
    STAKING: {
        transactionType: 'STAKING',
        recipients: [
            { address: 'treasury', percentage: 7000, name: 'Treasury' }, // 70%
            { address: 'validators', percentage: 3000, name: 'Validators' } // 30%
        ],
        totalPercentage: 10000
    }
};
//# sourceMappingURL=FeeStructure.js.map