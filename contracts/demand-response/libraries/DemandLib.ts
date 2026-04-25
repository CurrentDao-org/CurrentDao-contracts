import {
  DemandEvent,
  Participant,
  SmartMeterReading,
  DemandResponseIncentive,
  GridStabilityMetrics,
  RewardCalculation,
  DemandEventParticipation,
  RewardTier,
  IncentiveType,
  DemandEventStatus,
  ParticipantStatus,
  DemandResponseConfig,
  DEMAND_RESPONSE_ERRORS
} from '../interfaces/IDemandResponse';
import {
  DemandResponseStatistics,
  RegionalDemandData,
  DemandForecast,
  RewardTierBenefits,
  DemandResponseOptimization,
  ValidationResult,
  ValidationRule,
  DemandResponseAudit,
  EmergencyDemandResponse,
  DEMAND_RESPONSE_VALIDATION_RULES
} from '../structures/DemandStructs';

export class DemandLib {
  // Time utilities
  static now(): number {
    return Math.floor(Date.now() / 1000);
  }

  static addHours(timestamp: number, hours: number): number {
    return timestamp + (hours * 3600);
  }

  static addDays(timestamp: number, days: number): number {
    return timestamp + (days * 86400);
  }

  static isTimeRangeValid(startTime: number, endTime: number): boolean {
    return startTime > DemandLib.now() && endTime > startTime && (endTime - startTime) <= 86400;
  }

  // ID generation
  static generateEventId(): string {
    return `DE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateParticipantId(): string {
    return `PA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateReadingId(): string {
    return `RD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateIncentiveId(): string {
    return `IN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validation utilities
  static validateInput(data: any, rules: Record<string, ValidationRule>): ValidationResult {
    const errors: Array<{ field: string; message: string; value: any }> = [];
    const warnings: Array<{ field: string; message: string; value: any }> = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];

      if (rule.required && (value === undefined || value === null)) {
        errors.push({ field, message: `${field} is required`, value });
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rule.type === 'number' && (typeof value !== 'number' || isNaN(value))) {
          errors.push({ field, message: `${field} must be a number`, value });
        } else if (rule.type === 'string' && typeof value !== 'string') {
          errors.push({ field, message: `${field} must be a string`, value });
        } else if (rule.type === 'boolean' && typeof value !== 'boolean') {
          errors.push({ field, message: `${field} must be a boolean`, value });
        }

        if (rule.min !== undefined && value < rule.min) {
          errors.push({ field, message: `${field} must be at least ${rule.min}`, value });
        }

        if (rule.max !== undefined && value > rule.max) {
          errors.push({ field, message: `${field} must be at most ${rule.max}`, value });
        }

        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
          errors.push({ field, message: `${field} format is invalid`, value });
        }

        if (rule.custom && !rule.custom(value)) {
          errors.push({ field, message: `${field} failed custom validation`, value });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateDemandEvent(event: Partial<DemandEvent>): ValidationResult {
    const rules = {
      title: { required: true, type: 'string' as const, min: 1, max: 200 },
      description: { required: true, type: 'string' as const, min: 1, max: 1000 },
      startTime: { required: true, type: 'number' as const },
      endTime: { required: true, type: 'number' as const },
      targetLoadReduction: { required: true, type: 'number' as const, min: 0.1 },
      region: { required: true, type: 'string' as const, min: 1 },
      priority: { required: true, type: 'string' as const },
      maxParticipants: { required: true, type: 'number' as const, min: 1 },
      incentiveRate: { required: true, type: 'number' as const, min: 0 }
    };

    return DemandLib.validateInput(event, rules);
  }

  static validateParticipant(participant: Partial<Participant>): ValidationResult {
    const rules = {
      address: { required: true, type: 'string' as const, pattern: /^0x[a-fA-F0-9]{40}$/ },
      smartMeterId: { required: true, type: 'string' as const, min: 1 },
      region: { required: true, type: 'string' as const, min: 1 },
      baselineLoad: { required: true, type: 'number' as const, min: 0 },
      maxReductionCapacity: { required: true, type: 'number' as const, min: 0 }
    };

    return DemandLib.validateInput(participant, rules);
  }

  // Performance calculations
  static calculatePerformanceScore(
    committedReduction: number,
    actualReduction: number,
    responseTime: number,
    targetResponseTime: number = 300 // 5 minutes
  ): number {
    const reductionRatio = Math.min(actualReduction / Math.max(committedReduction, 0.001), 1.5);
    const responseScore = Math.max(0, 1 - (responseTime - targetResponseTime) / targetResponseTime);
    
    return Math.round((reductionRatio * 0.7 + responseScore * 0.3) * 100);
  }

  static calculateRewardTier(
    totalEvents: number,
    successRate: number,
    totalReduction: number,
    participationMonths: number
  ): RewardTier {
    if (totalEvents >= 50 && successRate >= 0.95 && totalReduction >= 1000 && participationMonths >= 12) {
      return RewardTier.PLATINUM;
    } else if (totalEvents >= 25 && successRate >= 0.9 && totalReduction >= 500 && participationMonths >= 6) {
      return RewardTier.GOLD;
    } else if (totalEvents >= 10 && successRate >= 0.8 && totalReduction >= 200 && participationMonths >= 3) {
      return RewardTier.SILVER;
    } else {
      return RewardTier.BRONZE;
    }
  }

  static calculateEventReward(
    baseRate: number,
    actualReduction: number,
    performanceScore: number,
    tier: RewardTier,
    isEmergency: boolean = false
  ): RewardCalculation {
    const tierMultipliers = {
      [RewardTier.BRONZE]: 1.0,
      [RewardTier.SILVER]: 1.2,
      [RewardTier.GOLD]: 1.5,
      [RewardTier.PLATINUM]: 2.0
    };

    const emergencyMultiplier = isEmergency ? 2.0 : 1.0;
    const performanceMultiplier = performanceScore / 100;
    const tierMultiplier = tierMultipliers[tier];

    const baseReward = baseRate * actualReduction;
    const performanceBonus = baseReward * performanceMultiplier * 0.5;
    const totalReward = baseReward * emergencyMultiplier * tierMultiplier * (1 + performanceMultiplier * 0.5);

    return {
      participantId: '', // to be filled
      eventId: '', // to be filled
      baselineReduction: actualReduction,
      actualReduction,
      performanceRatio: performanceMultiplier,
      baseReward,
      performanceBonus,
      tierMultiplier,
      totalReward
    };
  }

  // Grid stability calculations
  static calculateGridStabilityIndex(
    frequency: number,
    voltageStability: number,
    loadBalance: number,
    demandResponseContribution: number
  ): number {
    const frequencyScore = Math.max(0, 1 - Math.abs(frequency - 50) / 2); // assuming 50Hz standard
    const voltageScore = voltageStability;
    const balanceScore = 1 - Math.abs(loadBalance - 1);
    const drScore = demandResponseContribution;

    return (frequencyScore * 0.4 + voltageScore * 0.3 + balanceScore * 0.2 + drScore * 0.1) * 100;
  }

  static detectGridAnomaly(metrics: GridStabilityMetrics): Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
  }> {
    const anomalies = [];

    if (Math.abs(metrics.frequency - 50) > 0.5) {
      anomalies.push({
        type: 'FREQUENCY_DEVIATION',
        severity: Math.abs(metrics.frequency - 50) > 1 ? 'CRITICAL' : 'HIGH',
        message: `Grid frequency deviation: ${metrics.frequency}Hz`
      });
    }

    if (metrics.voltageStability < 0.8) {
      anomalies.push({
        type: 'VOLTAGE_INSTABILITY',
        severity: metrics.voltageStability < 0.6 ? 'CRITICAL' : 'HIGH',
        message: `Voltage stability index: ${metrics.voltageStability}`
      });
    }

    const loadImbalance = Math.abs(metrics.totalLoad - metrics.targetLoad) / metrics.targetLoad;
    if (loadImbalance > 0.1) {
      anomalies.push({
        type: 'LOAD_IMBALANCE',
        severity: loadImbalance > 0.2 ? 'HIGH' : 'MEDIUM',
        message: `Load imbalance: ${(loadImbalance * 100).toFixed(1)}%`
      });
    }

    return anomalies;
  }

  // Demand forecasting
  static forecastDemand(
    historicalData: number[],
    timeFactors: {
      weather: number;
      timeOfDay: number;
      dayOfWeek: number;
      seasonal: number;
    }
  ): DemandForecast {
    const baseline = historicalData.length > 0 
      ? historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length 
      : 1000;

    const weatherImpact = timeFactors.weather * 0.3;
    const timeImpact = timeFactors.timeOfDay * 0.25;
    const dayImpact = timeFactors.dayOfWeek * 0.2;
    const seasonalImpact = timeFactors.seasonal * 0.15;
    const eventImpact = 0.1; // base event impact

    const forecastedLoad = baseline * (1 + weatherImpact + timeImpact + dayImpact + seasonalImpact + eventImpact);
    const confidence = 0.8 - Math.abs(weatherImpact) * 0.3;

    return {
      region: '',
      timestamp: DemandLib.now(),
      forecastedLoad,
      confidence,
      factors: timeFactors,
      recommendedActions: DemandLib.generateRecommendedActions(forecastedLoad, baseline)
    };
  }

  private static generateRecommendedActions(
    forecastedLoad: number,
    baseline: number
  ): Array<{
    action: 'REDUCE_LOAD' | 'SHIFT_LOAD' | 'INCREASE_SUPPLY' | 'ACTIVATE_DR';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    estimatedImpact: number;
    cost: number;
  }> {
    const loadIncrease = (forecastedLoad - baseline) / baseline;
    const actions = [];

    if (loadIncrease > 0.15) {
      actions.push({
        action: 'ACTIVATE_DR' as const,
        priority: 'HIGH' as const,
        estimatedImpact: loadIncrease * 0.5,
        cost: 100
      });
    } else if (loadIncrease > 0.1) {
      actions.push({
        action: 'REDUCE_LOAD' as const,
        priority: 'MEDIUM' as const,
        estimatedImpact: loadIncrease * 0.3,
        cost: 50
      });
    }

    if (loadIncrease > 0.05) {
      actions.push({
        action: 'SHIFT_LOAD' as const,
        priority: 'LOW' as const,
        estimatedImpact: loadIncrease * 0.2,
        cost: 25
      });
    }

    return actions;
  }

  // Optimization algorithms
  static optimizeDemandResponse(
    targetReduction: number,
    participants: Participant[],
    eventDuration: number
  ): DemandResponseOptimization {
    const availableParticipants = participants.filter(p => 
      p.status === ParticipantStatus.ACTIVE && p.maxReductionCapacity > 0
    );

    // Sort by efficiency (reduction capacity vs baseline load)
    const sortedParticipants = availableParticipants.sort((a, b) => {
      const efficiencyA = a.maxReductionCapacity / Math.max(a.baselineLoad, 1);
      const efficiencyB = b.maxReductionCapacity / Math.max(b.baselineLoad, 1);
      return efficiencyB - efficiencyA;
    });

    const participantEfficiency = new Map<string, number>();
    const recommendedAllocation = new Map<string, number>();
    let totalReduction = 0;
    let totalCost = 0;

    for (const participant of sortedParticipants) {
      if (totalReduction >= targetReduction) break;

      const efficiency = participant.maxReductionCapacity / Math.max(participant.baselineLoad, 1);
      participantEfficiency.set(participant.id, efficiency);

      const recommendedReduction = Math.min(
        participant.maxReductionCapacity,
        targetReduction - totalReduction
      );

      recommendedAllocation.set(participant.id, recommendedReduction);
      totalReduction += recommendedReduction;
      totalCost += recommendedReduction * 0.1; // assumed cost per kWh
    }

    const confidence = totalReduction >= targetReduction ? 0.9 : 0.7;
    const gridImpact = totalReduction / 1000; // simplified impact calculation

    return {
      targetLoadReduction: targetReduction,
      availableParticipants: availableParticipants.map(p => p.id),
      participantEfficiency,
      recommendedAllocation,
      estimatedCost: totalCost,
      estimatedGridImpact: gridImpact,
      confidence
    };
  }

  // Audit and logging
  static createAuditEntry(
    action: string,
    actor: string,
    success: boolean,
    targetId?: string,
    targetType?: string,
    details?: Record<string, any>,
    previousState?: any,
    newState?: any
  ): DemandResponseAudit {
    return {
      id: `AU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: DemandLib.now(),
      action,
      actor,
      targetId,
      targetType,
      details: details || {},
      previousState,
      newState,
      success
    };
  }

  // Smart meter data processing
  static processSmartMeterReading(
    consumption: number,
    baseline: number,
    timestamp: number,
    eventId?: string
  ): SmartMeterReading {
    const reduction = Math.max(0, baseline - consumption);
    
    return {
      id: DemandLib.generateReadingId(),
      participantId: '', // to be filled
      meterId: '', // to be filled
      timestamp,
      consumption,
      baseline,
      reduction,
      eventId,
      verified: false
    };
  }

  // Emergency response utilities
  static createEmergencyResponse(
    triggerType: EmergencyDemandResponse['triggerType'],
    severity: EmergencyDemandResponse['severity'],
    requiredReduction: number,
    affectedRegions: string[],
    autoActivate: boolean = true
  ): EmergencyDemandResponse {
    return {
      id: `ER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      triggerType,
      severity,
      requiredReduction,
      responseTime: severity === 'CRITICAL' ? 60 : 300, // 1 min for critical, 5 min otherwise
      autoActivate,
      affectedRegions,
      notificationMessage: `Emergency ${triggerType} detected. Immediate demand response required.`,
      createdAt: DemandLib.now(),
      participantResponse: new Map()
    };
  }

  // Statistics calculation
  static calculateStatistics(
    events: DemandEvent[],
    participants: Participant[],
    participations: DemandEventParticipation[],
    incentives: DemandResponseIncentive[]
  ): DemandResponseStatistics {
    const activeParticipants = participants.filter(p => p.status === ParticipantStatus.ACTIVE);
    const successfulEvents = events.filter(e => e.status === DemandEventStatus.COMPLETED);
    const totalLoadReduction = participations.reduce((sum, p) => sum + p.actualReduction, 0);
    const totalRewardsDistributed = incentives
      .filter(i => i.distributed)
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const averagePerformanceScore = participations.length > 0
      ? participations.reduce((sum, p) => sum + p.performanceScore, 0) / participations.length
      : 0;

    const averageParticipationRate = events.length > 0
      ? events.reduce((sum, e) => sum + (e.currentParticipants / Math.max(e.maxParticipants, 1)), 0) / events.length
      : 0;

    return {
      participantStats: {
        total: participants.length,
        byRegion: DemandLib.groupByRegion(participants),
        byTier: DemandLib.groupByTier(participants),
        byStatus: DemandLib.groupByStatus(participants),
        averageBaselineLoad: participants.reduce((sum, p) => sum + p.baselineLoad, 0) / Math.max(participants.length, 1),
        averageReductionCapacity: participants.reduce((sum, p) => sum + p.maxReductionCapacity, 0) / Math.max(participants.length, 1)
      },
      eventStats: {
        total: events.length,
        byStatus: DemandLib.groupEventsByStatus(events),
        byPriority: DemandLib.groupEventsByPriority(events),
        byRegion: DemandLib.groupEventsByRegion(events),
        averageParticipants: events.reduce((sum, e) => sum + e.currentParticipants, 0) / Math.max(events.length, 1),
        averageLoadReduction: events.reduce((sum, e) => sum + e.actualLoadReduction, 0) / Math.max(events.length, 1),
        successRate: successfulEvents.length / Math.max(events.length, 1)
      },
      rewardStats: {
        totalDistributed: totalRewardsDistributed,
        averagePerEvent: successfulEvents.length > 0 ? totalRewardsDistributed / successfulEvents.length : 0,
        averagePerParticipant: activeParticipants.length > 0 ? totalRewardsDistributed / activeParticipants.length : 0,
        byTier: DemandLib.groupRewardsByTier(incentives, participants),
        byIncentiveType: DemandLib.groupRewardsByType(incentives)
      },
      gridStats: {
        stabilityEvents: 0, // to be calculated from grid metrics
        averageFrequency: 50, // default value
        averageVoltageStability: 0.95, // default value
        demandResponseContribution: totalLoadReduction / 10000 // simplified calculation
      },
      performanceMetrics: {
        totalEvents: events.length,
        successfulEvents: successfulEvents.length,
        totalParticipants: participants.length,
        activeParticipants: activeParticipants.length,
        totalLoadReduction,
        averageParticipationRate,
        averagePerformanceScore,
        totalRewardsDistributed,
        gridStabilityEvents: 0,
        responseTime: 300 // default response time
      }
    };
  }

  private static groupByRegion(participants: Participant[]): Record<string, number> {
    const groups: Record<string, number> = {};
    participants.forEach(p => {
      groups[p.region] = (groups[p.region] || 0) + 1;
    });
    return groups;
  }

  private static groupByTier(participants: Participant[]): Record<RewardTier, number> {
    const groups: Record<RewardTier, number> = {
      [RewardTier.BRONZE]: 0,
      [RewardTier.SILVER]: 0,
      [RewardTier.GOLD]: 0,
      [RewardTier.PLATINUM]: 0
    };
    participants.forEach(p => {
      groups[p.rewardTier] = (groups[p.rewardTier] || 0) + 1;
    });
    return groups;
  }

  private static groupByStatus(participants: Participant[]): Record<ParticipantStatus, number> {
    const groups: Record<ParticipantStatus, number> = {
      [ParticipantStatus.REGISTERED]: 0,
      [ParticipantStatus.ACTIVE]: 0,
      [ParticipantStatus.INACTIVE]: 0,
      [ParticipantStatus.SUSPENDED]: 0
    };
    participants.forEach(p => {
      groups[p.status] = (groups[p.status] || 0) + 1;
    });
    return groups;
  }

  private static groupEventsByStatus(events: DemandEvent[]): Record<DemandEventStatus, number> {
    const groups: Record<DemandEventStatus, number> = {
      [DemandEventStatus.SCHEDULED]: 0,
      [DemandEventStatus.ACTIVE]: 0,
      [DemandEventStatus.COMPLETED]: 0,
      [DemandEventStatus.CANCELLED]: 0,
      [DemandEventStatus.EMERGENCY]: 0
    };
    events.forEach(e => {
      groups[e.status] = (groups[e.status] || 0) + 1;
    });
    return groups;
  }

  private static groupEventsByPriority(events: DemandEvent[]): Record<string, number> {
    const groups: Record<string, number> = {};
    events.forEach(e => {
      groups[e.priority] = (groups[e.priority] || 0) + 1;
    });
    return groups;
  }

  private static groupEventsByRegion(events: DemandEvent[]): Record<string, number> {
    const groups: Record<string, number> = {};
    events.forEach(e => {
      groups[e.region] = (groups[e.region] || 0) + 1;
    });
    return groups;
  }

  private static groupRewardsByTier(incentives: DemandResponseIncentive[], participants: Participant[]): Record<RewardTier, number> {
    const groups: Record<RewardTier, number> = {
      [RewardTier.BRONZE]: 0,
      [RewardTier.SILVER]: 0,
      [RewardTier.GOLD]: 0,
      [RewardTier.PLATINUM]: 0
    };

    const participantMap = new Map(participants.map(p => [p.id, p.rewardTier]));
    
    incentives.forEach(i => {
      const tier = participantMap.get(i.participantId);
      if (tier) {
        groups[tier] = (groups[tier] || 0) + i.totalAmount;
      }
    });

    return groups;
  }

  private static groupRewardsByType(incentives: DemandResponseIncentive[]): Record<IncentiveType, number> {
    const groups: Record<IncentiveType, number> = {
      [IncentiveType.FIXED]: 0,
      [IncentiveType.PERCENTAGE]: 0,
      [IncentiveType.PERFORMANCE]: 0,
      [IncentiveType.BONUS]: 0
    };

    incentives.forEach(i => {
      groups[i.type] = (groups[i.type] || 0) + i.totalAmount;
    });

    return groups;
  }
}
