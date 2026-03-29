"use strict";
// --- Core Data Types ---
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPTIMIZATION_TEMPLATES = exports.DEFAULT_CONFIGURATION = exports.DEFAULT_PRIVACY_SETTINGS = void 0;
// --- Default Values and Constants ---
exports.DEFAULT_PRIVACY_SETTINGS = {
    userAddress: '',
    dataCollection: true,
    anonymizationLevel: 'partial',
    dataRetention: 90,
    sharingConsent: false,
    analyticsOptOut: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
};
exports.DEFAULT_CONFIGURATION = {
    maxHistoryDays: 365,
    aggregationInterval: 60, // 1 hour
    privacyLevel: 'standard',
    alertThresholds: {
        gasUsage: 100000,
        errorRate: 5, // percentage
        latency: 5000, // milliseconds
        availability: 99.9 // percentage
    },
    reportSchedule: {
        weekly: true,
        monthly: true,
        recipients: []
    },
    optimization: {
        enabled: true,
        autoImplement: false,
        maxPriority: 'medium'
    }
};
exports.OPTIMIZATION_TEMPLATES = [
    {
        id: 'gas_batch_operations',
        category: 'gas',
        priority: 'high',
        title: 'Implement Batch Operations',
        description: 'Enable batch processing for similar operations to reduce gas costs',
        impact: {
            gasSavings: 30,
            performanceImprovement: 15
        },
        implementation: {
            difficulty: 'medium',
            estimatedTime: 8,
            prerequisites: ['Interface redesign', 'Testing framework']
        },
        status: 'pending',
        createdAt: Date.now(),
        validUntil: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    },
    {
        id: 'performance_caching',
        category: 'performance',
        priority: 'medium',
        title: 'Add Result Caching',
        description: 'Cache frequently accessed data to improve response times',
        impact: {
            performanceImprovement: 25,
            gasSavings: 10
        },
        implementation: {
            difficulty: 'easy',
            estimatedTime: 4,
            prerequisites: ['Cache infrastructure']
        },
        status: 'pending',
        createdAt: Date.now(),
        validUntil: Date.now() + (30 * 24 * 60 * 60 * 1000)
    }
];
//# sourceMappingURL=UsageStructure.js.map