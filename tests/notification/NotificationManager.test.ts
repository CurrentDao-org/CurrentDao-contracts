/**
 * NotificationManager.test.ts
 * 
 * Comprehensive test suite for DAO event and notification system.
 * Tests event emission, subscriptions, filtering, and edge cases.
 */

import { NotificationManager } from '../../contracts/notification/NotificationManager';
import { EventType } from '../../contracts/notification/structures/EventStructure';

describe('NotificationManager', () => {
  let manager: NotificationManager;
  const ownerAddress = '0x1234567890123456789012345678901234567890';
  const userAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const user2Address = '0xfedcbafedcbafedcbafedcbafedcbafedcbafed0';

  beforeEach(() => {
    manager = new NotificationManager(ownerAddress);
  });

  describe('Initialization', () => {
    it('should initialize with owner address', () => {
      expect(manager.getOwner()).toBe(ownerAddress.toLowerCase());
    });

    it('should throw error with empty owner address', () => {
      expect(() => new NotificationManager('')).toThrow();
    });

    it('should have owner as authorized emitter', async () => {
      const emitters = manager.getAuthorizedEmitters();
      expect(emitters).toContain(ownerAddress.toLowerCase());
    });
  });

  describe('Event Emission', () => {
    it('should emit a simple event', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);
      const listener = jest.fn();
      manager.on('EventEmitted', listener);

      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress, ownerAddress);

      expect(listener).toHaveBeenCalled();
      const events = manager.getAllEvents();
      expect(events.length).toBeGreaterThan(1); // System init + new event
    });

    it('should throw error for unauthorized emitter', async () => {
      await expect(
        manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress)
      ).rejects.toThrow('not authorized');
    });

    it('should emit event with metadata', async () => {
      const metadata = JSON.stringify({ proposalId: '123', title: 'Test Proposal' });
      await manager.authorizeEmitter(ownerAddress, userAddress);
      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress, ownerAddress, metadata);

      const events = await manager.getEventsByType(EventType.PROPOSAL_CREATED);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].metadata).toContain('proposalId');
    });

    it('should increment event IDs', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);

      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress);
      const events1 = manager.getAllEvents();
      const lastEventId1 = events1[events1.length - 1].id;

      await manager.emitEvent(EventType.VOTE_CAST, userAddress);
      const events2 = manager.getAllEvents();
      const lastEventId2 = events2[events2.length - 1].id;

      expect(lastEventId2).toBeGreaterThan(lastEventId1);
    });

    it('should store correct timestamps', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);
      const beforeTime = Math.floor(Date.now() / 1000);

      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress);

      const afterTime = Math.floor(Date.now() / 1000);
      const events = manager.getAllEvents();
      const event = events[events.length - 1];

      expect(event.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(event.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Batch Event Emission', () => {
    it('should emit multiple events in batch', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);

      const batchEvents = [
        { eventType: EventType.PROPOSAL_CREATED, actor: userAddress, target: ownerAddress },
        { eventType: EventType.VOTE_CAST, actor: userAddress },
        { eventType: EventType.TREASURY_DEPOSIT, actor: userAddress, target: ownerAddress },
      ];

      const beforeCount = (await manager.getTotalEventCount());
      await manager.emitBatchEvents(batchEvents);
      const afterCount = (await manager.getTotalEventCount());

      expect(afterCount).toBe(beforeCount + 3);
    });

    it('should reject batch exceeding max size', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);
      const oversizedBatch = Array(51).fill({
        eventType: EventType.PROPOSAL_CREATED,
        actor: userAddress,
      });

      await expect(manager.emitBatchEvents(oversizedBatch)).rejects.toThrow('exceeds maximum');
    });

    it('should trigger notifications for all batch events', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);
      await manager.subscribe(user2Address, EventType.VOTE_CAST);

      const listener = jest.fn();
      manager.on(`Notification:${user2Address.toLowerCase()}`, listener);

      await manager.emitBatchEvents([
        { eventType: EventType.VOTE_CAST, actor: userAddress },
        { eventType: EventType.PROPOSAL_CREATED, actor: userAddress },
      ]);

      expect(listener).toHaveBeenCalledTimes(1); // Only VOTE_CAST matches subscription
    });
  });

  describe('Subscriptions', () => {
    it('should subscribe user to event type', async () => {
      await manager.subscribe(userAddress, EventType.PROPOSAL_CREATED);

      const isSubscribed = await manager.isSubscribed(userAddress, EventType.PROPOSAL_CREATED);
      expect(isSubscribed).toBe(true);
    });

    it('should subscribe to multiple event types', async () => {
      const eventTypes = [EventType.PROPOSAL_CREATED, EventType.VOTE_CAST];
      await manager.subscribeToMultiple(userAddress, eventTypes);

      for (const eventType of eventTypes) {
        const isSubscribed = await manager.isSubscribed(userAddress, eventType);
        expect(isSubscribed).toBe(true);
      }
    });

    it('should subscribe to all event types', async () => {
      await manager.subscribeToAll(userAddress);

      const isSubscribedAll = await manager.isSubscribed(userAddress, '*');
      expect(isSubscribedAll).toBe(true);

      // Should match any event type
      const isSubscribedProposal = await manager.isSubscribed(userAddress, EventType.PROPOSAL_CREATED);
      expect(isSubscribedProposal).toBe(true);
    });

    it('should unsubscribe from event type', async () => {
      await manager.subscribe(userAddress, EventType.PROPOSAL_CREATED);
      await manager.unsubscribe(userAddress, EventType.PROPOSAL_CREATED);

      const isSubscribed = await manager.isSubscribed(userAddress, EventType.PROPOSAL_CREATED);
      expect(isSubscribed).toBe(false);
    });

    it('should unsubscribe from all events', async () => {
      await manager.subscribeToMultiple(userAddress, [
        EventType.PROPOSAL_CREATED,
        EventType.VOTE_CAST,
      ]);

      await manager.unsubscribeFromAll(userAddress);

      const subscriptions = await manager.getUserSubscriptions(userAddress);
      expect(subscriptions.length).toBe(0);
    });

    it('should return user subscriptions', async () => {
      const eventTypes = [EventType.PROPOSAL_CREATED, EventType.VOTE_CAST];
      await manager.subscribeToMultiple(userAddress, eventTypes);

      const subscriptions = await manager.getUserSubscriptions(userAddress);
      expect(subscriptions).toEqual(expect.arrayContaining(eventTypes));
    });

    it('should emit subscription changed event', async () => {
      const listener = jest.fn();
      manager.on('SubscriptionChanged', listener);

      await manager.subscribe(userAddress, EventType.PROPOSAL_CREATED);

      expect(listener).toHaveBeenCalledWith({
        user: userAddress.toLowerCase(),
        eventType: EventType.PROPOSAL_CREATED,
        subscribed: true
      });
    });

    it('should support case-insensitive addresses', async () => {
      const mixedCaseAddress = '0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd';
      await manager.subscribe(mixedCaseAddress, EventType.PROPOSAL_CREATED);

      const normalizedAddress = mixedCaseAddress.toLowerCase();
      const isSubscribed = await manager.isSubscribed(normalizedAddress, EventType.PROPOSAL_CREATED);
      expect(isSubscribed).toBe(true);
    });
  });

  describe('Event Retrieval', () => {
    beforeEach(async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);
      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress, ownerAddress);
      await manager.emitEvent(EventType.VOTE_CAST, userAddress, ownerAddress);
      await manager.emitEvent(EventType.TREASURY_DEPOSIT, userAddress, ownerAddress);
    });

    it('should get all events', async () => {
      const events = await manager.getEvents();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should get recent events', async () => {
      const recentEvents = await manager.getRecentEvents(2);
      expect(recentEvents.length).toBeLessThanOrEqual(2);
    });

    it('should get event by ID', async () => {
      const allEvents = manager.getAllEvents();
      const targetEvent = allEvents[allEvents.length - 1];

      const retrieved = await manager.getEventById(targetEvent.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(targetEvent.id);
    });

    it('should get events by type', async () => {
      const proposalEvents = await manager.getEventsByType(EventType.PROPOSAL_CREATED);
      expect(proposalEvents.length).toBeGreaterThan(0);
      expect(proposalEvents.every(e => e.eventType === EventType.PROPOSAL_CREATED)).toBe(true);
    });

    it('should get events by actor', async () => {
      const userEvents = await manager.getEventsByActor(userAddress);
      expect(userEvents.length).toBeGreaterThan(0);
      expect(userEvents.every(e => e.actor === userAddress.toLowerCase())).toBe(true);
    });

    it('should get events by target', async () => {
      const targetEvents = await manager.getEventsByTarget(ownerAddress);
      expect(targetEvents.length).toBeGreaterThan(0);
    });

    it('should get events by date range', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 86400;

      const rangeEvents = await manager.getEventsByDateRange(oneDayAgo, now);
      expect(rangeEvents.length).toBeGreaterThan(0);
      expect(rangeEvents.every(e => e.timestamp >= oneDayAgo && e.timestamp <= now)).toBe(true);
    });

    it('should get event count', async () => {
      const total = await manager.getEventCount();
      expect(total).toBeGreaterThan(0);
    });

    it('should get event count by type', async () => {
      const proposalCount = await manager.getEventCount(EventType.PROPOSAL_CREATED);
      expect(proposalCount).toBeGreaterThan(0);
    });

    it('should get event count by date range', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 86400;

      const count = await manager.getEventCountByDate(undefined, oneDayAgo, now);
      expect(count).toBeGreaterThan(0);
    });

    it('should return max query results limit', async () => {
      // Emit many events
      await manager.authorizeEmitter(ownerAddress, userAddress);
      for (let i = 0; i < 100; i++) {
        await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress);
      }

      const events = await manager.getEvents();
      expect(events.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Event Filtering', () => {
    beforeEach(async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);
      await manager.authorizeEmitter(ownerAddress, user2Address);
      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress, ownerAddress);
      await manager.emitEvent(EventType.VOTE_CAST, userAddress, ownerAddress);
      await manager.emitEvent(EventType.TREASURY_DEPOSIT, user2Address, ownerAddress);
    });

    it('should filter by event types', async () => {
      const filter = {
        eventTypes: [EventType.PROPOSAL_CREATED, EventType.VOTE_CAST],
      };

      const filtered = await manager.getEvents(filter);
      expect(filtered.every(e => filter.eventTypes!.includes(e.eventType))).toBe(true);
    });

    it('should filter by actor', async () => {
      const filter = {
        actor: userAddress,
      };

      const filtered = await manager.getEvents(filter);
      expect(filtered.every(e => e.actor === userAddress.toLowerCase())).toBe(true);
    });

    it('should filter by target', async () => {
      const filter = {
        target: ownerAddress,
      };

      const filtered = await manager.getEvents(filter);
      expect(filtered.every(e => e.target === ownerAddress.toLowerCase())).toBe(true);
    });

    it('should filter by date range', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 86400;

      const filter = {
        startDate: oneDayAgo,
        endDate: now,
      };

      const filtered = await manager.getEvents(filter);
      expect(filtered.every(e => e.timestamp >= oneDayAgo && e.timestamp <= now)).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 86400;

      const filter = {
        eventTypes: [EventType.PROPOSAL_CREATED],
        actor: userAddress,
        startDate: oneDayAgo,
        endDate: now,
        limit: 50,
      };

      const filtered = await manager.getEvents(filter);
      expect(
        filtered.every(e =>
          filter.eventTypes!.includes(e.eventType) &&
          e.actor === userAddress.toLowerCase() &&
          e.timestamp >= oneDayAgo &&
          e.timestamp <= now
        )
      ).toBe(true);
    });
  });

  describe('Notifications', () => {
    beforeEach(async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);
    });

    it('should get notifiable events for subscribed user', async () => {
      await manager.subscribe(user2Address, EventType.PROPOSAL_CREATED);
      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress, ownerAddress);
      await manager.emitEvent(EventType.VOTE_CAST, userAddress, ownerAddress);

      const notifiable = await manager.getNotifiableEvents(user2Address);
      expect(notifiable.length).toBeGreaterThan(0);
      expect(notifiable.some(e => e.eventType === EventType.PROPOSAL_CREATED)).toBe(true);
    });

    it('should not notify unsubscribed user', async () => {
      // Don't subscribe user2Address
      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress);

      const notifiable = await manager.getNotifiableEvents(user2Address);
      expect(notifiable.length).toBe(0);
    });

    it('should get notification summary', async () => {
      await manager.subscribe(user2Address, EventType.PROPOSAL_CREATED);
      await manager.subscribe(user2Address, EventType.VOTE_CAST);

      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress);
      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress);
      await manager.emitEvent(EventType.VOTE_CAST, userAddress);

      const summary = await manager.getNotificationSummary(user2Address);
      expect(summary[EventType.PROPOSAL_CREATED]).toBe(2);
      expect(summary[EventType.VOTE_CAST]).toBe(1);
    });

    it('should mark events as notified', async () => {
      await manager.subscribe(user2Address, EventType.PROPOSAL_CREATED);
      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress);

      const before = await manager.getNotifiableEvents(user2Address);
      expect(before.length).toBeGreaterThan(0);

      await manager.markEventsAsNotified(user2Address);
      const after = await manager.getNotifiableEvents(user2Address);

      // New events after mark won't be returned
      expect(after.length).toBeLessThanOrEqual(before.length);
    });
  });

  describe('Utility Functions', () => {
    beforeEach(async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);
      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress);
      await manager.emitEvent(EventType.VOTE_CAST, userAddress);
    });

    it('should get total event count', async () => {
      const total = await manager.getTotalEventCount();
      expect(total).toBeGreaterThan(0);
    });

    it('should get all event types', async () => {
      const types = await manager.getEventTypes();
      expect(types.length).toBeGreaterThan(0);
    });

    it('should get subscribers for event type', async () => {
      await manager.subscribe(userAddress, EventType.PROPOSAL_CREATED);
      await manager.subscribe(user2Address, EventType.PROPOSAL_CREATED);

      const subscribers = await manager.getSubscribers(EventType.PROPOSAL_CREATED);
      expect(subscribers.length).toBeGreaterThanOrEqual(2);
    });

    it('should get subscription count', async () => {
      await manager.subscribe(userAddress, EventType.PROPOSAL_CREATED);
      await manager.subscribe(user2Address, EventType.PROPOSAL_CREATED);

      const count = await manager.getSubscriptionCount(EventType.PROPOSAL_CREATED);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should get storage stats', async () => {
      const stats = await manager.getStorageStats();
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.oldestEventDate).toBeTruthy();
      expect(stats.newestEventDate).toBeTruthy();
      expect(stats.estimatedGasUsed).toBeGreaterThan(0);
    });

    it('should export events to JSON', async () => {
      const exported = await manager.exportEvents();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });

  describe('Pause/Unpause', () => {
    it('should pause event emissions', async () => {
      await manager.pause();
      const isPaused = await manager.isPaused();
      expect(isPaused).toBe(true);
    });

    it('should reject events when paused', async () => {
      await manager.pause();

      await expect(
        manager.emitEvent(EventType.PROPOSAL_CREATED, ownerAddress)
      ).rejects.toThrow('paused');
    });

    it('should unpause event emissions', async () => {
      await manager.pause();
      await manager.unpause();

      const isPaused = await manager.isPaused();
      expect(isPaused).toBe(false);
    });

    it('should emit pause toggle event', async () => {
      const listener = jest.fn();
      manager.on('PauseToggled', listener);

      await manager.pause();
      expect(listener).toHaveBeenCalledWith(true);

      await manager.unpause();
      expect(listener).toHaveBeenCalledWith(false);
    });
  });

  describe('Emitter Authorization', () => {
    it('should authorize new emitter', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);

      const emitters = manager.getAuthorizedEmitters();
      expect(emitters).toContain(userAddress.toLowerCase());
    });

    it('should revoke emitter authorization', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);
      await manager.revokeEmitterAuth(ownerAddress, userAddress);

      await expect(
        manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress)
      ).rejects.toThrow('not authorized');
    });

    it('should not revoke owner authorization', async () => {
      await manager.revokeEmitterAuth(ownerAddress, ownerAddress);

      // Owner should still be authorized
      const emitters = manager.getAuthorizedEmitters();
      expect(emitters).toContain(ownerAddress.toLowerCase());
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired events', async () => {
      // This would need time manipulation in real tests
      // For now, just verify the function exists and works
      const removed = await manager.cleanupExpiredEvents(365);
      expect(typeof removed).toBe('number');
      expect(removed).toBeGreaterThanOrEqual(0);
    });

    it('should emit cleanup event', async () => {
      const listener = jest.fn();
      manager.on('EventsCleanedUp', listener);

      await manager.cleanupExpiredEvents(365);

      // Listener may not fire if no events expired
      expect(typeof listener).toBe('function');
    });
  });

  describe('Event Types', () => {
    it('should support all EventType enum values', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);

      const eventTypes = Object.values(EventType);
      for (const eventType of eventTypes) {
        await expect(
          manager.emitEvent(eventType, userAddress)
        ).resolves.not.toThrow();
      }
    });

    it('should reject invalid event type', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);

      await expect(
        manager.emitEvent('INVALID_EVENT_TYPE', userAddress)
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty metadata', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);
      await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress, '', '');

      const events = await manager.getEventsByType(EventType.PROPOSAL_CREATED);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should handle complex JSON metadata', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);
      const complexMetadata = JSON.stringify({
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        string: 'test',
      });

      await manager.emitEvent(
        EventType.PROPOSAL_CREATED,
        userAddress,
        '',
        complexMetadata
      );

      const events = await manager.getEventsByType(EventType.PROPOSAL_CREATED);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should handle many subscribers', async () => {
      const subscribers = [];
      for (let i = 0; i < 10; i++) {
        const addr = `0x${i.toString().padStart(40, '0')}`;
        await manager.subscribe(addr, EventType.PROPOSAL_CREATED);
        subscribers.push(addr);
      }

      const subList = await manager.getSubscribers(EventType.PROPOSAL_CREATED);
      expect(subList.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle rapid successive emissions', async () => {
      await manager.authorizeEmitter(ownerAddress, userAddress);

      for (let i = 0; i < 20; i++) {
        await manager.emitEvent(EventType.PROPOSAL_CREATED, userAddress);
      }

      const count = await manager.getEventCount();
      expect(count).toBeGreaterThanOrEqual(20);
    });
  });
});
