import { DemandResponse } from './DemandResponse';
import {
  DemandEventStatus,
  ParticipantStatus,
  RewardTier,
  IncentiveType,
  DEFAULT_DEMAND_RESPONSE_CONFIG,
  DEMAND_RESPONSE_ERRORS
} from './interfaces/IDemandResponse';
import { DemandLib } from './libraries/DemandLib';

describe('DemandResponse', () => {
  let demandResponse: DemandResponse;
  let testOperator: string;
  let testParticipant: string;
  let testRegion: string;

  beforeEach(() => {
    demandResponse = new DemandResponse();
    testOperator = '0x1234567890123456789012345678901234567890';
    testParticipant = '0x9876543210987654321098765432109876543210';
    testRegion = 'CALIFORNIA';
  });

  describe('Event Management', () => {
    it('should create a demand event successfully', async () => {
      const startTime = DemandLib.now() + 3600; // 1 hour from now
      const endTime = startTime + 7200; // 2 hours duration
      
      const event = await demandResponse.createDemandEvent(
        'Peak Load Reduction',
        'Reduce load during peak hours',
        startTime,
        endTime,
        1000, // 1000 kWh target
        testRegion,
        'HIGH',
        100,
        0.1, // $0.1 per kWh
        testOperator
      );

      expect(event.id).toBeDefined();
      expect(event.title).toBe('Peak Load Reduction');
      expect(event.status).toBe(DemandEventStatus.SCHEDULED);
      expect(event.targetLoadReduction).toBe(1000);
      expect(event.region).toBe(testRegion);
      expect(event.createdBy).toBe(testOperator);
    });

    it('should reject event creation with invalid time range', async () => {
      const pastTime = DemandLib.now() - 3600;
      const futureTime = pastTime + 7200;

      await expect(
        demandResponse.createDemandEvent(
          'Invalid Event',
          'Test event with invalid time',
          pastTime,
          futureTime,
          100,
          testRegion,
          'LOW',
          10,
          0.05,
          testOperator
        )
      ).rejects.toThrow(DEMAND_RESPONSE_ERRORS.INVALID_TIME_RANGE);
    });

    it('should activate a scheduled event', async () => {
      const event = await createTestEvent();
      
      // Mock current time to be after start time
      jest.spyOn(DemandLib, 'now').mockReturnValue(event.startTime + 60);

      await demandResponse.activateDemandEvent(event.id, testOperator);

      const updatedEvent = demandResponse.getDemandEvent(event.id);
      expect(updatedEvent?.status).toBe(DemandEventStatus.ACTIVE);
    });

    it('should complete an active event and calculate load reduction', async () => {
      const event = await createTestEvent();
      const participant = await createTestParticipant();
      
      // Setup participation
      await demandResponse.commitToEvent(event.id, participant.id, 50);
      await demandResponse.recordParticipation(event.id, participant.id, 45, event.startTime, event.endTime);
      
      // Activate and complete event
      await demandResponse.activateDemandEvent(event.id, testOperator);
      await demandResponse.completeDemandEvent(event.id, testOperator);

      const completedEvent = demandResponse.getDemandEvent(event.id);
      expect(completedEvent?.status).toBe(DemandEventStatus.COMPLETED);
      expect(completedEvent?.actualLoadReduction).toBe(45);
    });

    it('should cancel an event', async () => {
      const event = await createTestEvent();
      
      await demandResponse.cancelDemandEvent(event.id, 'Test cancellation', testOperator);

      const cancelledEvent = demandResponse.getDemandEvent(event.id);
      expect(cancelledEvent?.status).toBe(DemandEventStatus.CANCELLED);
    });
  });

  describe('Participant Management', () => {
    it('should register a participant successfully', async () => {
      const participant = await demandResponse.registerParticipant(
        testParticipant,
        'METER_001',
        testRegion,
        500, // baseline load in kWh
        100, // max reduction capacity in kWh
        { utility: 'PG&E' }
      );

      expect(participant.id).toBeDefined();
      expect(participant.address).toBe(testParticipant);
      expect(participant.status).toBe(ParticipantStatus.REGISTERED);
      expect(participant.rewardTier).toBe(RewardTier.BRONZE);
      expect(participant.baselineLoad).toBe(500);
      expect(participant.maxReductionCapacity).toBe(100);
    });

    it('should reject duplicate participant registration', async () => {
      await createTestParticipant();

      await expect(
        demandResponse.registerParticipant(
          testParticipant,
          'METER_001',
          testRegion,
          500,
          100
        )
      ).rejects.toThrow(DEMAND_RESPONSE_ERRORS.PARTICIPANT_ALREADY_REGISTERED);
    });

    it('should update participant profile', async () => {
      const participant = await createTestParticipant();
      
      await demandResponse.updateParticipantProfile(
        participant.id,
        { baselineLoad: 600, maxReductionCapacity: 120 },
        testOperator
      );

      const updatedParticipant = demandResponse.getParticipant(participant.id);
      expect(updatedParticipant?.baselineLoad).toBe(600);
      expect(updatedParticipant?.maxReductionCapacity).toBe(120);
    });

    it('should suspend and reactivate participant', async () => {
      const participant = await createTestParticipant();
      
      await demandResponse.suspendParticipant(participant.id, 'Non-compliance', testOperator);
      let suspendedParticipant = demandResponse.getParticipant(participant.id);
      expect(suspendedParticipant?.status).toBe(ParticipantStatus.SUSPENDED);

      await demandResponse.reactivateParticipant(participant.id, testOperator);
      let reactivatedParticipant = demandResponse.getParticipant(participant.id);
      expect(reactivatedParticipant?.status).toBe(ParticipantStatus.ACTIVE);
    });
  });

  describe('Event Participation', () => {
    it('should allow participant to commit to event', async () => {
      const event = await createTestEvent();
      const participant = await createTestParticipant();

      const participation = await demandResponse.commitToEvent(
        event.id,
        participant.id,
        50 // committed reduction
      );

      expect(participation.eventId).toBe(event.id);
      expect(participation.participantId).toBe(participant.id);
      expect(participation.committedReduction).toBe(50);
      expect(participation.status).toBe('COMMITTED');
      
      const updatedEvent = demandResponse.getDemandEvent(event.id);
      expect(updatedEvent?.currentParticipants).toBe(1);
    });

    it('should reject commitment from suspended participant', async () => {
      const event = await createTestEvent();
      const participant = await createTestParticipant();
      
      await demandResponse.suspendParticipant(participant.id, 'Test suspension', testOperator);

      await expect(
        demandResponse.commitToEvent(event.id, participant.id, 50)
      ).rejects.toThrow(DEMAND_RESPONSE_ERRORS.PARTICIPANT_SUSPENDED);
    });

    it('should reject commitment exceeding participant capacity', async () => {
      const event = await createTestEvent();
      const participant = await createTestParticipant();

      await expect(
        demandResponse.commitToEvent(event.id, participant.id, 150) // exceeds capacity of 100
      ).rejects.toThrow(DEMAND_RESPONSE_ERRORS.INSUFFICIENT_CAPACITY);
    });

    it('should record participation and calculate performance score', async () => {
      const event = await createTestEvent();
      const participant = await createTestParticipant();
      
      await demandResponse.commitToEvent(event.id, participant.id, 50);
      
      const participation = await demandResponse.recordParticipation(
        event.id,
        participant.id,
        45, // actual reduction (90% of committed)
        event.startTime,
        event.endTime
      );

      expect(participation.actualReduction).toBe(45);
      expect(participation.status).toBe('COMPLETED');
      expect(participation.performanceScore).toBeGreaterThan(0);
      expect(participation.performanceScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Smart Meter Integration', () => {
    it('should submit smart meter reading', async () => {
      const participant = await createTestParticipant();
      const timestamp = DemandLib.now();

      const reading = await demandResponse.submitSmartMeterReading(
        participant.id,
        'METER_001',
        timestamp,
        450, // consumption
        500, // baseline
        undefined // no event
      );

      expect(reading.participantId).toBe(participant.id);
      expect(reading.meterId).toBe('METER_001');
      expect(reading.consumption).toBe(450);
      expect(reading.baseline).toBe(500);
      expect(reading.reduction).toBe(50);
      expect(reading.verified).toBe(false);
    });

    it('should reject reading for non-existent participant', async () => {
      await expect(
        demandResponse.submitSmartMeterReading(
          'non_existent',
          'METER_001',
          DemandLib.now(),
          450,
          500
        )
      ).rejects.toThrow(DEMAND_RESPONSE_ERRORS.PARTICIPANT_NOT_FOUND);
    });

    it('should verify smart meter reading', async () => {
      const participant = await createTestParticipant();
      const reading = await demandResponse.submitSmartMeterReading(
        participant.id,
        'METER_001',
        DemandLib.now(),
        450,
        500
      );

      await demandResponse.verifySmartMeterReading(reading.id, true, testOperator);

      const verifiedReading = demandResponse.getSmartMeterReadings(participant.id)[0];
      expect(verifiedReading.verified).toBe(true);
      expect(verifiedReading.verificationTimestamp).toBeDefined();
    });

    it('should reject verification of already verified reading', async () => {
      const participant = await createTestParticipant();
      const reading = await demandResponse.submitSmartMeterReading(
        participant.id,
        'METER_001',
        DemandLib.now(),
        450,
        500
      );

      await demandResponse.verifySmartMeterReading(reading.id, true, testOperator);

      await expect(
        demandResponse.verifySmartMeterReading(reading.id, true, testOperator)
      ).rejects.toThrow(DEMAND_RESPONSE_ERRORS.READING_ALREADY_VERIFIED);
    });
  });

  describe('Incentive and Reward Management', () => {
    it('should calculate event rewards based on performance', async () => {
      const event = await createTestEvent();
      const participant = await createTestParticipant();
      
      // Setup participation with good performance
      await demandResponse.commitToEvent(event.id, participant.id, 50);
      await demandResponse.recordParticipation(event.id, participant.id, 50, event.startTime, event.endTime);
      
      // Complete event
      await demandResponse.activateDemandEvent(event.id, testOperator);
      await demandResponse.completeDemandEvent(event.id, testOperator);

      const rewards = await demandResponse.calculateEventRewards(event.id);

      expect(rewards).toHaveLength(1);
      expect(rewards[0].participantId).toBe(participant.id);
      expect(rewards[0].eventId).toBe(event.id);
      expect(rewards[0].totalReward).toBeGreaterThan(0);
      expect(rewards[0].performanceRatio).toBe(1); // 100% performance
    });

    it('should distribute rewards for completed event', async () => {
      const event = await createTestEvent();
      const participant = await createTestParticipant();
      
      // Setup participation
      await demandResponse.commitToEvent(event.id, participant.id, 50);
      await demandResponse.recordParticipation(event.id, participant.id, 45, event.startTime, event.endTime);
      
      // Complete event
      await demandResponse.activateDemandEvent(event.id, testOperator);
      await demandResponse.completeDemandEvent(event.id, testOperator);

      const incentives = await demandResponse.distributeRewards(event.id, testOperator);

      expect(incentives).toHaveLength(1);
      expect(incentives[0].type).toBe(IncentiveType.PERFORMANCE);
      expect(incentives[0].distributed).toBe(false);
      expect(incentives[0].totalAmount).toBeGreaterThan(0);
    });

    it('should apply tier multipliers to rewards', async () => {
      const event = await createTestEvent();
      const participant = await createTestParticipant();
      
      // Upgrade participant to GOLD tier
      const participantData = demandResponse.getParticipant(participant.id)!;
      participantData.rewardTier = RewardTier.GOLD;
      participantData.totalEventsParticipated = 30;
      participantData.successfulParticipations = 28;
      
      // Setup participation
      await demandResponse.commitToEvent(event.id, participant.id, 50);
      await demandResponse.recordParticipation(event.id, participant.id, 50, event.startTime, event.endTime);
      
      // Complete event
      await demandResponse.activateDemandEvent(event.id, testOperator);
      await demandResponse.completeDemandEvent(event.id, testOperator);

      const rewards = await demandResponse.calculateEventRewards(event.id);
      const baseReward = event.incentiveRate * 50; // 50 kWh at $0.1/kWh = $5

      expect(rewards[0].tierMultiplier).toBe(1.5); // GOLD tier multiplier
      expect(rewards[0].totalReward).toBeGreaterThan(baseReward);
    });
  });

  describe('Grid Stability Monitoring', () => {
    it('should update grid stability metrics', async () => {
      const metrics = {
        totalLoad: 10000,
        targetLoad: 9500,
        loadReduction: 500,
        frequency: 49.8,
        voltageStability: 0.92,
        demandResponseActive: true,
        activeEvents: 2,
        participatingConsumers: 50
      };

      await demandResponse.updateGridStabilityMetrics(metrics, testOperator);

      const updatedMetrics = await demandResponse.getGridStabilityMetrics();
      expect(updatedMetrics.totalLoad).toBe(10000);
      expect(updatedMetrics.frequency).toBe(49.8);
      expect(updatedMetrics.voltageStability).toBe(0.92);
    });

    it('should detect grid anomalies', async () => {
      // Critical frequency deviation
      const criticalMetrics = {
        frequency: 48.5, // Critical deviation
        voltageStability: 0.95,
        totalLoad: 10000,
        targetLoad: 9500,
        loadReduction: 500,
        demandResponseActive: false,
        activeEvents: 0,
        participatingConsumers: 0
      };

      const eventHandler = {
        onGridStabilityAlert: jest.fn()
      };
      
      const drWithHandler = new DemandResponse({ eventHandlers });
      
      await drWithHandler.updateGridStabilityMetrics(criticalMetrics, testOperator);

      expect(eventHandler.onGridStabilityAlert).toHaveBeenCalled();
    });
  });

  describe('Query Functions', () => {
    it('should get active events', async () => {
      const event1 = await createTestEvent();
      const event2 = await createTestEvent();
      
      await demandResponse.activateDemandEvent(event1.id, testOperator);
      // event2 remains scheduled

      const activeEvents = demandResponse.getActiveEvents();
      expect(activeEvents).toHaveLength(1);
      expect(activeEvents[0].id).toBe(event1.id);
    });

    it('should get participants by region', async () => {
      const participant1 = await demandResponse.registerParticipant(
        '0x1111111111111111111111111111111111111111',
        'METER_001',
        testRegion,
        500,
        100
      );
      
      const participant2 = await demandResponse.registerParticipant(
        '0x2222222222222222222222222222222222222222',
        'METER_002',
        'NEW_YORK',
        600,
        120
      );

      const californiaParticipants = demandResponse.getParticipantsByRegion(testRegion);
      expect(californiaParticipants).toHaveLength(1);
      expect(californiaParticipants[0].id).toBe(participant1.id);

      const newYorkParticipants = demandResponse.getParticipantsByRegion('NEW_YORK');
      expect(newYorkParticipants).toHaveLength(1);
      expect(newYorkParticipants[0].id).toBe(participant2.id);
    });

    it('should get participant history', async () => {
      const participant = await createTestParticipant();
      const event1 = await createTestEvent();
      const event2 = await createTestEvent();
      
      await demandResponse.commitToEvent(event1.id, participant.id, 50);
      await demandResponse.recordParticipation(event1.id, participant.id, 45, event1.startTime, event1.endTime);
      
      await demandResponse.commitToEvent(event2.id, participant.id, 30);
      await demandResponse.recordParticipation(event2.id, participant.id, 28, event2.startTime, event2.endTime);

      const history = demandResponse.getParticipantHistory(participant.id);
      expect(history).toHaveLength(2);
      expect(history[0].eventId).toBe(event2.id); // Most recent first
      expect(history[1].eventId).toBe(event1.id);
    });

    it('should get smart meter readings with time filter', async () => {
      const participant = await createTestParticipant();
      const timestamp1 = DemandLib.now() - 7200; // 2 hours ago
      const timestamp2 = DemandLib.now() - 3600; // 1 hour ago
      const timestamp3 = DemandLib.now(); // now

      await demandResponse.submitSmartMeterReading(participant.id, 'METER_001', timestamp1, 450, 500);
      await demandResponse.submitSmartMeterReading(participant.id, 'METER_001', timestamp2, 460, 500);
      await demandResponse.submitSmartMeterReading(participant.id, 'METER_001', timestamp3, 470, 500);

      const allReadings = demandResponse.getSmartMeterReadings(participant.id);
      expect(allReadings).toHaveLength(3);

      const filteredReadings = demandResponse.getSmartMeterReadings(
        participant.id,
        timestamp2 - 1800, // 30 minutes before timestamp2
        timestamp2 + 1800  // 30 minutes after timestamp2
      );
      expect(filteredReadings).toHaveLength(1);
      expect(filteredReadings[0].timestamp).toBe(timestamp2);
    });

    it('should get pending rewards', async () => {
      const event = await createTestEvent();
      const participant = await createTestParticipant();
      
      // Setup participation
      await demandResponse.commitToEvent(event.id, participant.id, 50);
      await demandResponse.recordParticipation(event.id, participant.id, 45, event.startTime, event.endTime);
      
      // Complete event and distribute rewards
      await demandResponse.activateDemandEvent(event.id, testOperator);
      await demandResponse.completeDemandEvent(event.id, testOperator);
      await demandResponse.distributeRewards(event.id, testOperator);

      const pendingRewards = demandResponse.getPendingRewards(participant.id);
      expect(pendingRewards).toHaveLength(1);
      expect(pendingRewards[0].distributed).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = demandResponse.getConfig();
      expect(config.minParticipantsPerEvent).toBe(DEFAULT_DEMAND_RESPONSE_CONFIG.minParticipantsPerEvent);
      expect(config.maxEventsPerDay).toBe(DEFAULT_DEMAND_RESPONSE_CONFIG.maxEventsPerDay);
    });

    it('should update configuration with valid values', async () => {
      const updates = {
        minParticipantsPerEvent: 20,
        maxEventsPerDay: 10,
        performanceThreshold: 0.85
      };

      await demandResponse.updateConfig(updates, testOperator);

      const updatedConfig = demandResponse.getConfig();
      expect(updatedConfig.minParticipantsPerEvent).toBe(20);
      expect(updatedConfig.maxEventsPerDay).toBe(10);
      expect(updatedConfig.performanceThreshold).toBe(0.85);
    });

    it('should reject invalid configuration updates', async () => {
      const invalidUpdates = {
        minParticipantsPerEvent: -1, // Invalid: negative
        maxEventsPerDay: 200, // Invalid: exceeds max
        performanceThreshold: 1.5 // Invalid: exceeds 1.0
      };

      await expect(
        demandResponse.updateConfig(invalidUpdates, testOperator)
      ).rejects.toThrow('Config validation failed');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of participants efficiently', async () => {
      const participantCount = 1000;
      const participants: string[] = [];

      // Create many participants
      for (let i = 0; i < participantCount; i++) {
        const participant = await demandResponse.registerParticipant(
          `0x${i.toString(16).padStart(40, '0')}`,
          `METER_${i.toString().padStart(6, '0')}`,
          testRegion,
          500 + Math.random() * 500,
          50 + Math.random() * 100
        );
        participants.push(participant.id);
      }

      expect(participants).toHaveLength(participantCount);

      // Test query performance
      const startTime = Date.now();
      const regionParticipants = demandResponse.getParticipantsByRegion(testRegion);
      const endTime = Date.now();

      expect(regionParticipants).toHaveLength(participantCount);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle concurrent event participation', async () => {
      const eventCount = 10;
      const participantsPerEvent = 50;
      const events: string[] = [];

      // Create multiple events
      for (let i = 0; i < eventCount; i++) {
        const event = await createTestEvent(`Event ${i}`);
        events.push(event.id);
      }

      // Create participants and commit to events
      for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
        for (let participantIndex = 0; participantIndex < participantsPerEvent; participantIndex++) {
          const participant = await demandResponse.registerParticipant(
            `0x${eventIndex}${participantIndex}`.padEnd(42, '0'),
            `METER_${eventIndex}_${participantIndex}`,
            testRegion,
            500,
            50
          );

          await demandResponse.commitToEvent(events[eventIndex], participant.id, 25);
        }
      }

      // Verify all participations
      let totalParticipations = 0;
      for (const eventId of events) {
        const participations = demandResponse.getEventParticipations(eventId);
        totalParticipations += participations.length;
        expect(participations).toHaveLength(participantsPerEvent);
      }

      expect(totalParticipations).toBe(eventCount * participantsPerEvent);
    });
  });

  // Helper functions
  async function createTestEvent(title: string = 'Test Event'): Promise<DemandEvent> {
    const startTime = DemandLib.now() + 3600;
    const endTime = startTime + 7200;
    
    return await demandResponse.createDemandEvent(
      title,
      'Test event description',
      startTime,
      endTime,
      1000,
      testRegion,
      'HIGH',
      100,
      0.1,
      testOperator
    );
  }

  async function createTestParticipant(): Promise<Participant> {
    return await demandResponse.registerParticipant(
      testParticipant,
      'METER_001',
      testRegion,
      500,
      100
    );
  }
});

describe('DemandLib', () => {
  describe('Time Utilities', () => {
    it('should generate valid timestamps', () => {
      const now = DemandLib.now();
      expect(now).toBeGreaterThan(0);
      
      const future = DemandLib.addHours(now, 2);
      expect(future).toBe(now + 7200);
      
      const nextWeek = DemandLib.addDays(now, 7);
      expect(nextWeek).toBe(now + 604800);
    });

    it('should validate time ranges', () => {
      const future = DemandLib.now() + 3600;
      const later = future + 7200;
      
      expect(DemandLib.isTimeRangeValid(future, later)).toBe(true);
      expect(DemandLib.isTimeRangeValid(DemandLib.now() - 3600, later)).toBe(false);
      expect(DemandLib.isTimeRangeValid(future, future - 3600)).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate demand event data', () => {
      const validEvent = {
        title: 'Test Event',
        description: 'Test description',
        startTime: DemandLib.now() + 3600,
        endTime: DemandLib.now() + 7200,
        targetLoadReduction: 1000,
        region: 'CALIFORNIA',
        priority: 'HIGH',
        maxParticipants: 100,
        incentiveRate: 0.1
      };

      const result = DemandLib.validateDemandEvent(validEvent);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate participant data', () => {
      const validParticipant = {
        address: '0x1234567890123456789012345678901234567890',
        smartMeterId: 'METER_001',
        region: 'CALIFORNIA',
        baselineLoad: 500,
        maxReductionCapacity: 100
      };

      const result = DemandLib.validateParticipant(validParticipant);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid participant address', () => {
      const invalidParticipant = {
        address: 'invalid_address',
        smartMeterId: 'METER_001',
        region: 'CALIFORNIA',
        baselineLoad: 500,
        maxReductionCapacity: 100
      };

      const result = DemandLib.validateParticipant(invalidParticipant);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('address');
    });
  });

  describe('Performance Calculations', () => {
    it('should calculate performance score correctly', () => {
      const score1 = DemandLib.calculatePerformanceScore(50, 50, 240); // Perfect performance, fast response
      expect(score1).toBeGreaterThan(90);

      const score2 = DemandLib.calculatePerformanceScore(50, 40, 240); // 80% performance, fast response
      expect(score2).toBeGreaterThan(70);
      expect(score2).toBeLessThan(score1);

      const score3 = DemandLib.calculatePerformanceScore(50, 50, 600); // Perfect performance, slow response
      expect(score3).toBeLessThan(score1);
    });

    it('should calculate reward tier correctly', () => {
      const tier1 = DemandLib.calculateRewardTier(5, 0.9, 100, 2); // Low activity
      expect(tier1).toBe(RewardTier.BRONZE);

      const tier2 = DemandLib.calculateRewardTier(15, 0.85, 250, 4); // Medium activity
      expect(tier2).toBe(RewardTier.SILVER);

      const tier3 = DemandLib.calculateRewardTier(30, 0.92, 600, 8); // High activity
      expect(tier3).toBe(RewardTier.GOLD);

      const tier4 = DemandLib.calculateRewardTier(60, 0.96, 1200, 15); // Very high activity
      expect(tier4).toBe(RewardTier.PLATINUM);
    });

    it('should calculate event rewards with multipliers', () => {
      const reward = DemandLib.calculateEventReward(
        0.1, // $0.1 per kWh
        50, // 50 kWh reduction
        95, // 95% performance score
        RewardTier.GOLD,
        false
      );

      expect(reward.baseReward).toBe(5); // 50 * 0.1
      expect(reward.tierMultiplier).toBe(1.5); // GOLD tier
      expect(reward.performanceRatio).toBe(0.95);
      expect(reward.totalReward).toBeGreaterThan(reward.baseReward);
    });
  });

  describe('Grid Stability', () => {
    it('should calculate grid stability index', () => {
      const index = DemandLib.calculateGridStabilityIndex(
        50.1, // Slightly high frequency
        0.95, // Good voltage stability
        1.02, // Small load imbalance
        0.8   // Good DR contribution
      );

      expect(index).toBeGreaterThan(0);
      expect(index).toBeLessThanOrEqual(100);
    });

    it('should detect grid anomalies', () => {
      const normalMetrics = {
        timestamp: DemandLib.now(),
        totalLoad: 10000,
        targetLoad: 9500,
        loadReduction: 500,
        frequency: 50.0,
        voltageStability: 0.95,
        demandResponseActive: false,
        activeEvents: 0,
        participatingConsumers: 0,
        regionMetrics: {}
      };

      const anomalies1 = DemandLib.detectGridAnomaly(normalMetrics);
      expect(anomalies1).toHaveLength(0);

      const criticalMetrics = {
        ...normalMetrics,
        frequency: 48.5, // Critical deviation
        voltageStability: 0.7 // Critical instability
      };

      const anomalies2 = DemandLib.detectGridAnomaly(criticalMetrics);
      expect(anomalies2.length).toBeGreaterThan(0);
      expect(anomalies2.some(a => a.type === 'FREQUENCY_DEVIATION')).toBe(true);
      expect(anomalies2.some(a => a.type === 'VOLTAGE_INSTABILITY')).toBe(true);
    });
  });

  describe('Demand Forecasting', () => {
    it('should generate demand forecast', () => {
      const historicalData = [1000, 1100, 1050, 1200, 1150];
      const timeFactors = {
        weather: 0.1, // Hot weather increases demand
        timeOfDay: 0.05, // Peak hour
        dayOfWeek: 0.02, // Weekday
        seasonal: 0.08   // Summer season
      };

      const forecast = DemandLib.forecastDemand(historicalData, timeFactors);

      expect(forecast.forecastedLoad).toBeGreaterThan(0);
      expect(forecast.confidence).toBeGreaterThan(0);
      expect(forecast.confidence).toBeLessThanOrEqual(1);
      expect(forecast.recommendedActions).toBeDefined();
    });
  });

  describe('Optimization', () => {
    it('should optimize demand response allocation', () => {
      const participants = [
        { id: '1', status: ParticipantStatus.ACTIVE, baselineLoad: 500, maxReductionCapacity: 100, region: '', smartMeterId: '', rewardTier: RewardTier.BRONZE, totalEventsParticipated: 0, successfulParticipations: 0, totalRewardsEarned: 0, registrationDate: 0, lastActiveDate: 0, currentReduction: 0, metadata: {} },
        { id: '2', status: ParticipantStatus.ACTIVE, baselineLoad: 300, maxReductionCapacity: 80, region: '', smartMeterId: '', rewardTier: RewardTier.SILVER, totalEventsParticipated: 0, successfulParticipations: 0, totalRewardsEarned: 0, registrationDate: 0, lastActiveDate: 0, currentReduction: 0, metadata: {} },
        { id: '3', status: ParticipantStatus.ACTIVE, baselineLoad: 800, maxReductionCapacity: 150, region: '', smartMeterId: '', rewardTier: RewardTier.GOLD, totalEventsParticipated: 0, successfulParticipations: 0, totalRewardsEarned: 0, registrationDate: 0, lastActiveDate: 0, currentReduction: 0, metadata: {} }
      ];

      const optimization = DemandLib.optimizeDemandResponse(200, participants, 3600);

      expect(optimization.targetLoadReduction).toBe(200);
      expect(optimization.availableParticipants).toHaveLength(3);
      expect(optimization.confidence).toBeGreaterThan(0);
      expect(optimization.recommendedAllocation.size).toBeGreaterThan(0);
    });
  });
});
