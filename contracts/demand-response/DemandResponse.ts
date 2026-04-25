import {
  IDemandResponse,
  DemandEvent,
  Participant,
  SmartMeterReading,
  DemandResponseIncentive,
  GridStabilityMetrics,
  RewardCalculation,
  DemandEventParticipation,
  DemandEventStatus,
  ParticipantStatus,
  RewardTier,
  IncentiveType,
  DemandResponseConfig,
  DemandResponseEvents,
  DEFAULT_DEMAND_RESPONSE_CONFIG,
  DEMAND_RESPONSE_ERRORS
} from './interfaces/IDemandResponse';
import {
  DemandEventStore,
  ParticipantStore,
  ParticipationStore,
  SmartMeterStore,
  IncentiveStore,
  GridMetricsStore,
  DemandResponseState,
  DemandResponseAudit,
  EmergencyDemandResponse,
  ValidationResult
} from './structures/DemandStructs';
import { DemandLib } from './libraries/DemandLib';

export class DemandResponse implements IDemandResponse {
  private readonly eventHandlers: DemandResponseEvents;
  private readonly auditTrail: DemandResponseAudit[] = [];
  private config: DemandResponseConfig;
  private state: DemandResponseState;
  private emergencyResponses: Map<string, EmergencyDemandResponse>;

  constructor(options: { config?: Partial<DemandResponseConfig>; eventHandlers?: DemandResponseEvents } = {}) {
    this.config = { ...DEFAULT_DEMAND_RESPONSE_CONFIG, ...options.config };
    this.eventHandlers = options.eventHandlers || {};
    this.emergencyResponses = new Map();
    
    this.initializeState();
  }

  // Event Management
  public async createDemandEvent(
    title: string,
    description: string,
    startTime: number,
    endTime: number,
    targetLoadReduction: number,
    region: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    maxParticipants: number,
    incentiveRate: number,
    creator: string,
    metadata?: Record<string, string | number | boolean>
  ): Promise<DemandEvent> {
    const eventData: Partial<DemandEvent> = {
      title,
      description,
      startTime,
      endTime,
      targetLoadReduction,
      region,
      priority,
      maxParticipants,
      incentiveRate,
      metadata: metadata || {}
    };

    const validation = DemandLib.validateDemandEvent(eventData);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    if (!DemandLib.isTimeRangeValid(startTime, endTime)) {
      throw new Error(DEMAND_RESPONSE_ERRORS.INVALID_TIME_RANGE);
    }

    const event: DemandEvent = {
      id: DemandLib.generateEventId(),
      title,
      description,
      startTime,
      endTime,
      targetLoadReduction,
      actualLoadReduction: 0,
      region,
      status: DemandEventStatus.SCHEDULED,
      priority,
      maxParticipants,
      currentParticipants: 0,
      incentiveRate,
      createdBy: creator,
      createdAt: DemandLib.now(),
      metadata: metadata || {}
    };

    this.addEventToStore(event);
    this.logAudit('CREATE_EVENT', creator, true, event.id, 'EVENT', { title, region, priority });
    this.eventHandlers.onEventCreated?.(event);

    return event;
  }

  public async activateDemandEvent(eventId: string, operator: string): Promise<void> {
    const event = this.getDemandEvent(eventId);
    if (!event) {
      throw new Error(DEMAND_RESPONSE_ERRORS.EVENT_NOT_FOUND);
    }

    if (event.status !== DemandEventStatus.SCHEDULED) {
      throw new Error(DEMAND_RESPONSE_ERRORS.EVENT_ALREADY_ACTIVE);
    }

    if (DemandLib.now() < event.startTime) {
      throw new Error('EVENT_NOT_READY');
    }

    event.status = DemandEventStatus.ACTIVE;
    this.state.events.activeEvents.add(eventId);
    
    this.logAudit('ACTIVATE_EVENT', operator, true, eventId, 'EVENT');
    this.eventHandlers.onEventActivated?.(event);
  }

  public async completeDemandEvent(eventId: string, operator: string): Promise<void> {
    const event = this.getDemandEvent(eventId);
    if (!event) {
      throw new Error(DEMAND_RESPONSE_ERRORS.EVENT_NOT_FOUND);
    }

    if (event.status !== DemandEventStatus.ACTIVE) {
      throw new Error(DEMAND_RESPONSE_ERRORS.EVENT_NOT_ACTIVE);
    }

    // Calculate final load reduction
    const participations = this.getEventParticipations(eventId);
    event.actualLoadReduction = participations.reduce((sum, p) => sum + p.actualReduction, 0);
    event.status = DemandEventStatus.COMPLETED;
    
    this.state.events.activeEvents.delete(eventId);
    
    this.logAudit('COMPLETE_EVENT', operator, true, eventId, 'EVENT', { 
      actualReduction: event.actualLoadReduction,
      targetReduction: event.targetLoadReduction 
    });
    this.eventHandlers.onEventCompleted?.(event);

    // Trigger reward calculation after completion delay
    setTimeout(() => {
      this.calculateEventRewards(eventId).catch(console.error);
    }, this.config.rewardDistributionDelay * 1000);
  }

  public async cancelDemandEvent(eventId: string, reason: string, operator: string): Promise<void> {
    const event = this.getDemandEvent(eventId);
    if (!event) {
      throw new Error(DEMAND_RESPONSE_ERRORS.EVENT_NOT_FOUND);
    }

    if (event.status === DemandEventStatus.COMPLETED) {
      throw new Error('EVENT_ALREADY_COMPLETED');
    }

    const previousStatus = event.status;
    event.status = DemandEventStatus.CANCELLED;
    
    if (previousStatus === DemandEventStatus.ACTIVE) {
      this.state.events.activeEvents.delete(eventId);
    }
    
    this.logAudit('CANCEL_EVENT', operator, true, eventId, 'EVENT', { reason, previousStatus });
  }

  // Participant Management
  public async registerParticipant(
    address: string,
    smartMeterId: string,
    region: string,
    baselineLoad: number,
    maxReductionCapacity: number,
    metadata?: Record<string, string | number | boolean>
  ): Promise<Participant> {
    const participantData: Partial<Participant> = {
      address,
      smartMeterId,
      region,
      baselineLoad,
      maxReductionCapacity,
      metadata: metadata || {}
    };

    const validation = DemandLib.validateParticipant(participantData);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for existing participant with same address or smart meter
    const existingByAddress = this.state.participants.addressToParticipantId.get(address);
    const existingByMeter = this.state.participants.smartMeterToParticipantId.get(smartMeterId);

    if (existingByAddress || existingByMeter) {
      throw new Error(DEMAND_RESPONSE_ERRORS.PARTICIPANT_ALREADY_REGISTERED);
    }

    const participant: Participant = {
      id: DemandLib.generateParticipantId(),
      address,
      smartMeterId,
      region,
      status: ParticipantStatus.REGISTERED,
      baselineLoad,
      maxReductionCapacity,
      currentReduction: 0,
      rewardTier: RewardTier.BRONZE,
      totalEventsParticipated: 0,
      successfulParticipations: 0,
      totalRewardsEarned: 0,
      registrationDate: DemandLib.now(),
      lastActiveDate: DemandLib.now(),
      metadata: metadata || {}
    };

    this.addParticipantToStore(participant);
    this.logAudit('REGISTER_PARTICIPANT', address, true, participant.id, 'PARTICIPANT', { region, baselineLoad });
    this.eventHandlers.onParticipantRegistered?.(participant);

    return participant;
  }

  public async updateParticipantProfile(
    participantId: string,
    updates: Partial<Pick<Participant, 'baselineLoad' | 'maxReductionCapacity' | 'metadata'>>,
    operator: string
  ): Promise<void> {
    const participant = this.getParticipant(participantId);
    if (!participant) {
      throw new Error(DEMAND_RESPONSE_ERRORS.PARTICIPANT_NOT_FOUND);
    }

    const previousState = { ...participant };
    Object.assign(participant, updates);
    participant.lastActiveDate = DemandLib.now();

    this.logAudit('UPDATE_PARTICIPANT', operator, true, participantId, 'PARTICIPANT', updates, previousState, participant);
  }

  public async suspendParticipant(participantId: string, reason: string, operator: string): Promise<void> {
    const participant = this.getParticipant(participantId);
    if (!participant) {
      throw new Error(DEMAND_RESPONSE_ERRORS.PARTICIPANT_NOT_FOUND);
    }

    participant.status = ParticipantStatus.SUSPENDED;
    this.logAudit('SUSPEND_PARTICIPANT', operator, true, participantId, 'PARTICIPANT', { reason });
  }

  public async reactivateParticipant(participantId: string, operator: string): Promise<void> {
    const participant = this.getParticipant(participantId);
    if (!participant) {
      throw new Error(DEMAND_RESPONSE_ERRORS.PARTICIPANT_NOT_FOUND);
    }

    participant.status = ParticipantStatus.ACTIVE;
    participant.lastActiveDate = DemandLib.now();
    this.logAudit('REACTIVATE_PARTICIPANT', operator, true, participantId, 'PARTICIPANT');
  }

  // Event Participation
  public async commitToEvent(
    eventId: string,
    participantId: string,
    committedReduction: number
  ): Promise<DemandEventParticipation> {
    const event = this.getDemandEvent(eventId);
    const participant = this.getParticipant(participantId);

    if (!event) throw new Error(DEMAND_RESPONSE_ERRORS.EVENT_NOT_FOUND);
    if (!participant) throw new Error(DEMAND_RESPONSE_ERRORS.PARTICIPANT_NOT_FOUND);
    if (participant.status !== ParticipantStatus.ACTIVE) throw new Error(DEMAND_RESPONSE_ERRORS.PARTICIPANT_SUSPENDED);
    if (event.status !== DemandEventStatus.SCHEDULED) throw new Error('EVENT_NOT_OPEN_FOR_COMMITMENT');
    if (event.currentParticipants >= event.maxParticipants) throw new Error(DEMAND_RESPONSE_ERRORS.EVENT_FULL);
    if (committedReduction > participant.maxReductionCapacity) throw new Error(DEMAND_RESPONSE_ERRORS.INSUFFICIENT_CAPACITY);

    const participationId = `${eventId}-${participantId}`;
    const participation: DemandEventParticipation = {
      eventId,
      participantId,
      committedReduction,
      actualReduction: 0,
      startTime: event.startTime,
      endTime: event.endTime,
      status: 'COMMITTED',
      performanceScore: 0,
      rewardEarned: 0
    };

    this.addParticipationToStore(participation);
    event.currentParticipants++;
    participant.totalEventsParticipated++;

    this.logAudit('COMMIT_TO_EVENT', participantId, true, participationId, 'PARTICIPATION', { committedReduction });
    this.eventHandlers.onParticipantParticipated?.(participation);

    return participation;
  }

  public async recordParticipation(
    eventId: string,
    participantId: string,
    actualReduction: number,
    startTime: number,
    endTime: number
  ): Promise<DemandEventParticipation> {
    const participationId = `${eventId}-${participantId}`;
    const participation = this.state.participations.participations.get(participationId);
    
    if (!participation) {
      throw new Error('PARTICIPATION_NOT_FOUND');
    }

    participation.actualReduction = actualReduction;
    participation.startTime = startTime;
    participation.endTime = endTime;
    participation.status = 'COMPLETED';
    
    const responseTime = startTime - participation.startTime;
    participation.performanceScore = DemandLib.calculatePerformanceScore(
      participation.committedReduction,
      actualReduction,
      responseTime
    );

    const participant = this.getParticipant(participantId);
    if (participant) {
      participant.currentReduction = actualReduction;
      if (participation.performanceScore >= this.config.performanceThreshold * 100) {
        participant.successfulParticipations++;
      }
      participant.lastActiveDate = DemandLib.now();
      
      // Update reward tier based on performance
      participant.rewardTier = DemandLib.calculateRewardTier(
        participant.totalEventsParticipated,
        participant.successfulParticipations / Math.max(participant.totalEventsParticipated, 1),
        participant.totalRewardsEarned,
        Math.floor((DemandLib.now() - participant.registrationDate) / (30 * 86400)) // months
      );
    }

    this.logAudit('RECORD_PARTICIPATION', participantId, true, participationId, 'PARTICIPATION', { 
      actualReduction, 
      performanceScore: participation.performanceScore 
    });

    return participation;
  }

  // Smart Meter Integration
  public async submitSmartMeterReading(
    participantId: string,
    meterId: string,
    timestamp: number,
    consumption: number,
    baseline: number,
    eventId?: string
  ): Promise<SmartMeterReading> {
    const participant = this.getParticipant(participantId);
    if (!participant) {
      throw new Error(DEMAND_RESPONSE_ERRORS.PARTICIPANT_NOT_FOUND);
    }

    if (participant.smartMeterId !== meterId) {
      throw new Error(DEMAND_RESPONSE_ERRORS.SMART_METER_NOT_FOUND);
    }

    const reading = DemandLib.processSmartMeterReading(consumption, baseline, timestamp, eventId);
    reading.participantId = participantId;
    reading.meterId = meterId;

    this.addSmartMeterReadingToStore(reading);
    this.logAudit('SUBMIT_METER_READING', participantId, true, reading.id, 'READING', { consumption, baseline });
    this.eventHandlers.onSmartMeterReading?.(reading);

    return reading;
  }

  public async verifySmartMeterReading(readingId: string, verified: boolean, operator: string): Promise<void> {
    const reading = this.state.smartMeters.readings.get(readingId);
    if (!reading) {
      throw new Error('READING_NOT_FOUND');
    }

    if (reading.verified) {
      throw new Error(DEMAND_RESPONSE_ERRORS.READING_ALREADY_VERIFIED);
    }

    reading.verified = verified;
    reading.verificationTimestamp = DemandLib.now();

    if (verified) {
      this.state.smartMeters.unverifiedReadings.delete(readingId);
    }

    this.logAudit('VERIFY_METER_READING', operator, true, readingId, 'READING', { verified });
  }

  // Incentive and Reward Management
  public async calculateEventRewards(eventId: string): Promise<RewardCalculation[]> {
    const event = this.getDemandEvent(eventId);
    if (!event) {
      throw new Error(DEMAND_RESPONSE_ERRORS.EVENT_NOT_FOUND);
    }

    const participations = this.getEventParticipations(eventId);
    const rewards: RewardCalculation[] = [];

    for (const participation of participations) {
      if (participation.status !== 'COMPLETED') continue;

      const participant = this.getParticipant(participation.participantId);
      if (!participant) continue;

      const isEmergency = event.status === DemandEventStatus.EMERGENCY;
      const reward = DemandLib.calculateEventReward(
        event.incentiveRate,
        participation.actualReduction,
        participation.performanceScore,
        participant.rewardTier,
        isEmergency
      );

      reward.participantId = participation.participantId;
      reward.eventId = eventId;
      rewards.push(reward);

      participation.rewardEarned = reward.totalReward;
      participant.totalRewardsEarned += reward.totalReward;
    }

    this.logAudit('CALCULATE_REWARDS', 'SYSTEM', true, eventId, 'EVENT', { rewardCount: rewards.length });
    this.eventHandlers.onRewardCalculated?.(rewards[0]); // Emit first reward as example

    return rewards;
  }

  public async distributeRewards(eventId: string, distributor: string): Promise<DemandResponseIncentive[]> {
    const rewards = await this.calculateEventRewards(eventId);
    const incentives: DemandResponseIncentive[] = [];

    for (const reward of rewards) {
      const incentive: DemandResponseIncentive = {
        id: DemandLib.generateIncentiveId(),
        eventId,
        participantId: reward.participantId,
        type: IncentiveType.PERFORMANCE,
        baseRate: reward.baseReward,
        performanceMultiplier: reward.performanceRatio,
        totalAmount: reward.totalReward,
        calculatedAt: DemandLib.now(),
        distributed: false
      };

      incentives.push(incentive);
      this.addIncentiveToStore(incentive);
    }

    this.logAudit('DISTRIBUTE_REWARDS', distributor, true, eventId, 'EVENT', { 
      totalAmount: incentives.reduce((sum, i) => sum + i.totalAmount, 0) 
    });

    return incentives;
  }

  // Grid Stability Monitoring
  public async getGridStabilityMetrics(): Promise<GridStabilityMetrics> {
    return this.state.gridMetrics.currentMetrics;
  }

  public async updateGridStabilityMetrics(metrics: Partial<GridStabilityMetrics>, operator: string): Promise<void> {
    const previousState = { ...this.state.gridMetrics.currentMetrics };
    Object.assign(this.state.gridMetrics.currentMetrics, metrics);
    this.state.gridMetrics.currentMetrics.timestamp = DemandLib.now();

    const anomalies = DemandLib.detectGridAnomaly(this.state.gridMetrics.currentMetrics);
    
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'CRITICAL') {
        this.eventHandlers.onGridStabilityAlert?.(this.state.gridMetrics.currentMetrics);
      }
    }

    this.logAudit('UPDATE_GRID_METRICS', operator, true, '', 'GRID', metrics, previousState, this.state.gridMetrics.currentMetrics);
  }

  // Query Functions
  public getDemandEvent(eventId: string): DemandEvent | undefined {
    return this.state.events.events.get(eventId);
  }

  public getActiveEvents(): DemandEvent[] {
    return Array.from(this.state.events.activeEvents)
      .map(id => this.state.events.events.get(id))
      .filter((event): event is DemandEvent => event !== undefined);
  }

  public getParticipant(participantId: string): Participant | undefined {
    return this.state.participants.participants.get(participantId);
  }

  public getParticipantsByRegion(region: string): Participant[] {
    const participantIds = this.state.participants.participantsByRegion.get(region);
    if (!participantIds) return [];

    return Array.from(participantIds)
      .map(id => this.state.participants.participants.get(id))
      .filter((participant): participant is Participant => participant !== undefined);
  }

  public getEventParticipations(eventId: string): DemandEventParticipation[] {
    const participationIds = this.state.participations.participationsByEvent.get(eventId);
    if (!participationIds) return [];

    return Array.from(participationIds)
      .map(id => this.state.participations.participations.get(id))
      .filter((participation): participation is DemandEventParticipation => participation !== undefined);
  }

  public getParticipantHistory(participantId: string): DemandEventParticipation[] {
    const eventIds = this.state.participations.participationsByParticipant.get(participantId);
    if (!eventIds) return [];

    const participations: DemandEventParticipation[] = [];
    for (const eventId of eventIds) {
      const participationId = `${eventId}-${participantId}`;
      const participation = this.state.participations.participations.get(participationId);
      if (participation) {
        participations.push(participation);
      }
    }

    return participations.sort((a, b) => b.startTime - a.startTime);
  }

  public getSmartMeterReadings(participantId: string, startTime?: number, endTime?: number): SmartMeterReading[] {
    const readingIds = this.state.smartMeters.readingsByParticipant.get(participantId);
    if (!readingIds) return [];

    let readings = Array.from(readingIds)
      .map(id => this.state.smartMeters.readings.get(id))
      .filter((reading): reading is SmartMeterReading => reading !== undefined);

    if (startTime || endTime) {
      readings = readings.filter(reading => {
        if (startTime && reading.timestamp < startTime) return false;
        if (endTime && reading.timestamp > endTime) return false;
        return true;
      });
    }

    return readings.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getPendingRewards(participantId: string): DemandResponseIncentive[] {
    const incentiveIds = this.state.incentives.incentivesByParticipant.get(participantId);
    if (!incentiveIds) return [];

    return Array.from(incentiveIds)
      .map(id => this.state.incentives.incentives.get(id))
      .filter((incentive): incentive is DemandResponseIncentive => 
        incentive !== undefined && !incentive.distributed
      );
  }

  // Configuration
  public getConfig(): DemandResponseConfig {
    return { ...this.config };
  }

  public async updateConfig(updates: Partial<DemandResponseConfig>, operator: string): Promise<void> {
    const validation = DemandLib.validateInput(updates, DEMAND_RESPONSE_VALIDATION_RULES);
    if (!validation.valid) {
      throw new Error(`Config validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const previousConfig = { ...this.config };
    Object.assign(this.config, updates);

    this.logAudit('UPDATE_CONFIG', operator, true, '', 'CONFIG', updates, previousConfig, this.config);
  }

  // Private helper methods
  private initializeState(): void {
    this.state = {
      events: this.createEventStore(),
      participants: this.createParticipantStore(),
      participations: this.createParticipationStore(),
      smartMeters: this.createSmartMeterStore(),
      incentives: this.createIncentiveStore(),
      gridMetrics: this.createGridMetricsStore(),
      statistics: {
        participantStats: { total: 0, byRegion: {}, byTier: {} as any, byStatus: {} as any, averageBaselineLoad: 0, averageReductionCapacity: 0 },
        eventStats: { total: 0, byStatus: {} as any, byPriority: {}, byRegion: {}, averageParticipants: 0, averageLoadReduction: 0, successRate: 0 },
        rewardStats: { totalDistributed: 0, averagePerEvent: 0, averagePerParticipant: 0, byTier: {} as any, byIncentiveType: {} as any },
        gridStats: { stabilityEvents: 0, averageFrequency: 50, averageVoltageStability: 0.95, demandResponseContribution: 0 },
        performanceMetrics: { totalEvents: 0, successfulEvents: 0, totalParticipants: 0, activeParticipants: 0, totalLoadReduction: 0, averageParticipationRate: 0, averagePerformanceScore: 0, totalRewardsDistributed: 0, gridStabilityEvents: 0, responseTime: 0 }
      },
      auditTrail: [],
      emergencyResponses: new Map()
    };
  }

  private createEventStore(): DemandEventStore {
    return {
      events: new Map(),
      activeEvents: new Set(),
      eventsByRegion: new Map(),
      eventsByStatus: new Map(),
      eventTimeline: []
    };
  }

  private createParticipantStore(): ParticipantStore {
    return {
      participants: new Map(),
      participantsByRegion: new Map(),
      participantsByStatus: new Map(),
      participantsByTier: new Map(),
      addressToParticipantId: new Map(),
      smartMeterToParticipantId: new Map()
    };
  }

  private createParticipationStore(): ParticipationStore {
    return {
      participations: new Map(),
      participationsByEvent: new Map(),
      participationsByParticipant: new Map(),
      activeParticipations: new Set()
    };
  }

  private createSmartMeterStore(): SmartMeterStore {
    return {
      readings: new Map(),
      readingsByParticipant: new Map(),
      readingsByEvent: new Map(),
      readingsByTimeRange: new Map(),
      unverifiedReadings: new Set()
    };
  }

  private createIncentiveStore(): IncentiveStore {
    return {
      incentives: new Map(),
      incentivesByEvent: new Map(),
      incentivesByParticipant: new Map(),
      pendingDistribution: new Set(),
      distributedIncentives: new Set()
    };
  }

  private createGridMetricsStore(): GridMetricsStore {
    return {
      currentMetrics: {
        timestamp: DemandLib.now(),
        totalLoad: 0,
        targetLoad: 0,
        loadReduction: 0,
        frequency: 50,
        voltageStability: 0.95,
        demandResponseActive: false,
        activeEvents: 0,
        participatingConsumers: 0,
        regionMetrics: {}
      },
      historicalMetrics: [],
      alerts: []
    };
  }

  private addEventToStore(event: DemandEvent): void {
    this.state.events.events.set(event.id, event);
    
    if (!this.state.events.eventsByRegion.has(event.region)) {
      this.state.events.eventsByRegion.set(event.region, new Set());
    }
    this.state.events.eventsByRegion.get(event.region)!.add(event.id);
    
    if (!this.state.events.eventsByStatus.has(event.status)) {
      this.state.events.eventsByStatus.set(event.status, new Set());
    }
    this.state.events.eventsByStatus.get(event.status)!.add(event.id);
    
    this.state.events.eventTimeline.push({
      eventId: event.id,
      timestamp: event.createdAt,
      action: 'CREATED'
    });
  }

  private addParticipantToStore(participant: Participant): void {
    this.state.participants.participants.set(participant.id, participant);
    this.state.participants.addressToParticipantId.set(participant.address, participant.id);
    this.state.participants.smartMeterToParticipantId.set(participant.smartMeterId, participant.id);
    
    if (!this.state.participants.participantsByRegion.has(participant.region)) {
      this.state.participants.participantsByRegion.set(participant.region, new Set());
    }
    this.state.participants.participantsByRegion.get(participant.region)!.add(participant.id);
    
    if (!this.state.participants.participantsByStatus.has(participant.status)) {
      this.state.participants.participantsByStatus.set(participant.status, new Set());
    }
    this.state.participants.participantsByStatus.get(participant.status)!.add(participant.id);
    
    if (!this.state.participants.participantsByTier.has(participant.rewardTier)) {
      this.state.participants.participantsByTier.set(participant.rewardTier, new Set());
    }
    this.state.participants.participantsByTier.get(participant.rewardTier)!.add(participant.id);
  }

  private addParticipationToStore(participation: DemandEventParticipation): void {
    const participationId = `${participation.eventId}-${participation.participantId}`;
    this.state.participations.participations.set(participationId, participation);
    
    if (!this.state.participations.participationsByEvent.has(participation.eventId)) {
      this.state.participations.participationsByEvent.set(participation.eventId, new Set());
    }
    this.state.participations.participationsByEvent.get(participation.eventId)!.add(participation.participantId);
    
    if (!this.state.participations.participationsByParticipant.has(participation.participantId)) {
      this.state.participations.participationsByParticipant.set(participation.participantId, new Set());
    }
    this.state.participations.participationsByParticipant.get(participation.participantId)!.add(participation.eventId);
  }

  private addSmartMeterReadingToStore(reading: SmartMeterReading): void {
    this.state.smartMeters.readings.set(reading.id, reading);
    
    if (!this.state.smartMeters.readingsByParticipant.has(reading.participantId)) {
      this.state.smartMeters.readingsByParticipant.set(reading.participantId, new Set());
    }
    this.state.smartMeters.readingsByParticipant.get(reading.participantId)!.add(reading.id);
    
    if (reading.eventId) {
      if (!this.state.smartMeters.readingsByEvent.has(reading.eventId)) {
        this.state.smartMeters.readingsByEvent.set(reading.eventId, new Set());
      }
      this.state.smartMeters.readingsByEvent.get(reading.eventId)!.add(reading.id);
    }
    
    if (!reading.verified) {
      this.state.smartMeters.unverifiedReadings.add(reading.id);
    }
  }

  private addIncentiveToStore(incentive: DemandResponseIncentive): void {
    this.state.incentives.incentives.set(incentive.id, incentive);
    
    if (!this.state.incentives.incentivesByEvent.has(incentive.eventId)) {
      this.state.incentives.incentivesByEvent.set(incentive.eventId, new Set());
    }
    this.state.incentives.incentivesByEvent.get(incentive.eventId)!.add(incentive.id);
    
    if (!this.state.incentives.incentivesByParticipant.has(incentive.participantId)) {
      this.state.incentives.incentivesByParticipant.set(incentive.participantId, new Set());
    }
    this.state.incentives.incentivesByParticipant.get(incentive.participantId)!.add(incentive.id);
    
    if (!incentive.distributed) {
      this.state.incentives.pendingDistribution.add(incentive.id);
    } else {
      this.state.incentives.distributedIncentives.add(incentive.id);
    }
  }

  private logAudit(
    action: string,
    actor: string,
    success: boolean,
    targetId?: string,
    targetType?: string,
    details?: Record<string, any>,
    previousState?: any,
    newState?: any
  ): void {
    const auditEntry = DemandLib.createAuditEntry(
      action,
      actor,
      success,
      targetId,
      targetType,
      details,
      previousState,
      newState
    );
    
    this.auditTrail.push(auditEntry);
    this.state.auditTrail.push(auditEntry);
  }
}
