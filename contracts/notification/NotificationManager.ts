/**
 * NotificationManager.ts
 * 
 * Main contract implementing the full DAO event and notification system.
 * Stores events, manages subscriptions, and provides frontend integration.
 */

import { EventStruct, EventFilter, EventType, Subscription, EventEmissionPayload } from './structures/EventStructure';
import { EventLib } from './libraries/EventLib';
import { INotificationManager } from './interfaces/INotificationManager';

/**
 * NotificationManager - Core DAO event and notification management contract
 * 
 * Features:
 * - Gas-optimized event storage with struct-based design
 * - Subscription system for targeted notifications
 * - IndexedEvent queries (by type, actor, target, date)
 * - 1-year historical event retention
 * - Real-time event emission for frontend listeners
 * - Batch event operations for efficiency
 */
export class NotificationManager implements INotificationManager {
  // ============================================================
  // STATE VARIABLES
  // ============================================================

  /** Array of all stored events */
  private events: EventStruct[] = [];

  /** Increment counter for event IDs */
  private eventCounter: number = 0;

  /** Map of user address to their subscriptions */
  private subscriptions: Map<string, Subscription> = new Map();

  /** Indexes for fast lookups */
  private eventTypeIndex: Map<string, number[]> = new Map();
  private actorIndex: Map<string, number[]> = new Map();
  private targetIndex: Map<string, number[]> = new Map();
  private timestampIndex: Map<number, number[]> = new Map();

  /** Contract state */
  private isPausedState: boolean = false;
  private owner: string;
  private authorizedEmitters: Set<string> = new Set();

  /** Event listeners for frontend integration */
  private eventListeners: Map<string, Set<Function>> = new Map();

  /** Configuration */
  private readonly EVENT_RETENTION_DAYS = 365;
  private readonly MAX_BATCH_SIZE = 50;
  private readonly MAX_QUERY_RESULTS = 1000;

  /**
   * Constructor - Initialize NotificationManager
   * 
   * @param ownerAddress - Address with administrative rights
   */
  constructor(ownerAddress: string) {
    if (!ownerAddress || ownerAddress.trim().length === 0) {
      throw new Error('NotificationManager: Owner address cannot be empty');
    }
    this.owner = ownerAddress.toLowerCase();
    this.authorizedEmitters.add(this.owner);
    this.emitEventInternal('SYSTEM_INITIALIZED', this.owner, '', JSON.stringify({ version: '1.0.0' }));
  }

  // ============================================================
  // MODIFIERS & INTERNAL HELPERS
  // ============================================================

  /**
   * Ensure caller is contract owner
   */
  private onlyOwner(caller: string): void {
    if (caller.toLowerCase() !== this.owner) {
      throw new Error('NotificationManager: Only owner can call this function');
    }
  }

  /**
   * Ensure contract is not paused
   */
  private requiredNotPaused(): void {
    if (this.isPausedState) {
      throw new Error('NotificationManager: Contract is paused');
    }
  }

  /**
   * Ensure caller is authorized to emit events
   */
  private requiredAuthorizedEmitter(caller: string): void {
    if (!this.authorizedEmitters.has(caller.toLowerCase())) {
      throw new Error('NotificationManager: Caller is not authorized to emit events');
    }
  }

  /**
   * Internal event emission with index updates
   */
  private emitEventInternal(
    eventType: string,
    actor: string,
    target: string = '',
    metadata: string = '{}'
  ): EventStruct {
    this.requiredNotPaused();

    // Create event
    this.eventCounter++;
    const event = EventLib.createEvent(
      this.eventCounter,
      eventType,
      actor,
      target,
      metadata,
      EventLib['getCategoryFromEventType'](eventType),
      0
    );

    // Store event
    this.events.push(event);

    // Update indexes
    this.updateIndexes(event);

    // Emit to listeners
    this.notifyEventListeners('EventEmitted', event);

    return event;
  }

  /**
   * Update all indexes for new event
   */
  private updateIndexes(event: EventStruct): void {
    // Update type index
    if (!this.eventTypeIndex.has(event.eventType)) {
      this.eventTypeIndex.set(event.eventType, []);
    }
    this.eventTypeIndex.get(event.eventType)!.push(this.events.length - 1);

    // Update actor index
    if (!this.actorIndex.has(event.actor)) {
      this.actorIndex.set(event.actor, []);
    }
    this.actorIndex.get(event.actor)!.push(this.events.length - 1);

    // Update target index
    if (event.target) {
      if (!this.targetIndex.has(event.target)) {
        this.targetIndex.set(event.target, []);
      }
      this.targetIndex.get(event.target)!.push(this.events.length - 1);
    }

    // Update timestamp index
    const dayBucket = Math.floor(event.timestamp / 86400) * 86400;
    if (!this.timestampIndex.has(dayBucket)) {
      this.timestampIndex.set(dayBucket, []);
    }
    this.timestampIndex.get(dayBucket)!.push(this.events.length - 1);
  }

  /**
   * Notify all listeners of event
   */
  private notifyEventListeners(eventName: string, data: any): void {
    if (!this.eventListeners.has(eventName)) {
      return;
    }

    const listeners = this.eventListeners.get(eventName)!;
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`Error in ${eventName} listener:`, e);
      }
    });
  }

  // ============================================================
  // EVENT EMISSION FUNCTIONS
  // ============================================================

  /**
   * Emit a new DAO event and store it
   * @see INotificationManager.emitEvent
   */
  async emitEvent(
    eventType: string,
    actor: string,
    target: string = '',
    metadata: string = '{}'
  ): Promise<void> {
    this.requiredNotPaused();
    this.requiredAuthorizedEmitter(actor);

    const event = this.emitEventInternal(eventType, actor, target, metadata);

    // Trigger notifications for subscribed users
    this.triggerNotificationsForEvent(event);
  }

  /**
   * Emit multiple events in batch (gas-efficient)
   * @see INotificationManager.emitBatchEvents
   */
  async emitBatchEvents(
    events: Array<{
      eventType: string;
      actor: string;
      target?: string;
      metadata?: string;
    }>
  ): Promise<void> {
    this.requiredNotPaused();

    if (events.length > this.MAX_BATCH_SIZE) {
      throw new Error(`NotificationManager: Batch size exceeds maximum (${this.MAX_BATCH_SIZE})`);
    }

    const emittedEvents: EventStruct[] = [];

    for (const eventData of events) {
      this.requiredAuthorizedEmitter(eventData.actor);
      const event = this.emitEventInternal(
        eventData.eventType,
        eventData.actor,
        eventData.target || '',
        eventData.metadata || '{}'
      );
      emittedEvents.push(event);
    }

    // Trigger notifications for all events
    emittedEvents.forEach(event => this.triggerNotificationsForEvent(event));
  }

  /**
   * Trigger notifications for subscribers of event type
   */
  private triggerNotificationsForEvent(event: EventStruct): void {
    this.subscriptions.forEach((subscription, user) => {
      if (
        subscription.isActive &&
        (subscription.eventTypes.has(event.eventType) || subscription.eventTypes.has('*'))
      ) {
        // Update last notification time
        subscription.lastNotificationTime = Math.floor(Date.now() / 1000);

        // Emit notification event
        const payload: EventEmissionPayload = {
          eventName: `Event:${event.eventType}`,
          data: {
            id: event.id,
            eventType: event.eventType,
            timestamp: event.timestamp,
            actor: event.actor,
            target: event.target,
            metadata: EventLib.parseMetadata(event.metadata),
            blockNumber: event.blockNumber,
          },
          indexed: {
            eventType: event.eventType,
            actor: event.actor,
            target: event.target,
          },
        };

        this.notifyEventListeners(`Notification:${user}`, payload);
      }
    });
  }

  // ============================================================
  // SUBSCRIPTION MANAGEMENT FUNCTIONS
  // ============================================================

  /**
   * Subscribe user to specific event type(s)
   * @see INotificationManager.subscribe
   */
  async subscribe(user: string, eventType: string): Promise<void> {
    const userAddr = user.toLowerCase();
    // Allow '*' as a wildcard for all event types, otherwise validate
    if (eventType !== '*') {
      EventLib['validateEventType'](eventType);
    }

    let subscription = this.subscriptions.get(userAddr);
    if (!subscription) {
      subscription = {
        user: userAddr,
        eventTypes: new Set(),
        isActive: true,
        createdAt: Math.floor(Date.now() / 1000),
        lastNotificationTime: 0,
      };
      this.subscriptions.set(userAddr, subscription);
    }

    subscription.eventTypes.add(eventType);
    this.notifyEventListeners('SubscriptionChanged', { user: userAddr, eventType, subscribed: true });
  }

  /**
   * Subscribe user to multiple event types
   * @see INotificationManager.subscribeToMultiple
   */
  async subscribeToMultiple(user: string, eventTypes: string[]): Promise<void> {
    for (const eventType of eventTypes) {
      await this.subscribe(user, eventType);
    }
  }

  /**
   * Subscribe user to all DAO events
   * @see INotificationManager.subscribeToAll
   */
  async subscribeToAll(user: string): Promise<void> {
    await this.subscribe(user, '*');
  }

  /**
   * Unsubscribe user from specific event type
   * @see INotificationManager.unsubscribe
   */
  async unsubscribe(user: string, eventType: string): Promise<void> {
    const userAddr = user.toLowerCase();
    const subscription = this.subscriptions.get(userAddr);

    if (subscription) {
      subscription.eventTypes.delete(eventType);
      if (subscription.eventTypes.size === 0) {
        subscription.isActive = false;
      }
    }

    this.notifyEventListeners('SubscriptionChanged', { user: userAddr, eventType, subscribed: false });
  }

  /**
   * Unsubscribe user from all event types
   * @see INotificationManager.unsubscribeFromAll
   */
  async unsubscribeFromAll(user: string): Promise<void> {
    const userAddr = user.toLowerCase();
    const subscription = this.subscriptions.get(userAddr);

    if (subscription) {
      subscription.eventTypes.clear();
      subscription.isActive = false;
    }

    this.notifyEventListeners('SubscriptionChanged', { user: userAddr, eventType: '*', subscribed: false });
  }

  /**
   * Check if user is subscribed to event type
   * @see INotificationManager.isSubscribed
   */
  async isSubscribed(user: string, eventType: string): Promise<boolean> {
    const subscription = this.subscriptions.get(user.toLowerCase());
    if (!subscription || !subscription.isActive) {
      return false;
    }
    return subscription.eventTypes.has(eventType) || subscription.eventTypes.has('*');
  }

  /**
   * Get all event types user is subscribed to
   * @see INotificationManager.getUserSubscriptions
   */
  async getUserSubscriptions(user: string): Promise<string[]> {
    const subscription = this.subscriptions.get(user.toLowerCase());
    if (!subscription || !subscription.isActive) {
      return [];
    }
    return Array.from(subscription.eventTypes);
  }

  // ============================================================
  // EVENT RETRIEVAL & FILTERING FUNCTIONS
  // ============================================================

  /**
   * Get events with optional filtering
   * @see INotificationManager.getEvents
   */
  async getEvents(filter?: EventFilter): Promise<EventStruct[]> {
    if (!filter) {
      return this.events.slice(0, this.MAX_QUERY_RESULTS);
    }

    const filtered = EventLib.filterEvents(this.events, filter);
    return filtered.slice(0, this.MAX_QUERY_RESULTS);
  }

  /**
   * Get recent events (last N events)
   * @see INotificationManager.getRecentEvents
   */
  async getRecentEvents(count: number): Promise<EventStruct[]> {
    const limit = Math.min(count, this.MAX_QUERY_RESULTS);
    return this.events.slice(-limit).reverse();
  }

  /**
   * Get event by ID
   * @see INotificationManager.getEventById
   */
  async getEventById(eventId: number): Promise<EventStruct | null> {
    const event = this.events.find(e => e.id === eventId);
    return event || null;
  }

  /**
   * Get all events of a specific type
   * @see INotificationManager.getEventsByType
   */
  async getEventsByType(eventType: string, limit: number = 100): Promise<EventStruct[]> {
    const indices = this.eventTypeIndex.get(eventType) || [];
    const events = indices.map(i => this.events[i]).reverse();
    return events.slice(0, Math.min(limit, this.MAX_QUERY_RESULTS));
  }

  /**
   * Get all events triggered by specific actor
   * @see INotificationManager.getEventsByActor
   */
  async getEventsByActor(actor: string, limit: number = 100): Promise<EventStruct[]> {
    const normalizedActor = actor.toLowerCase();
    const indices = this.actorIndex.get(normalizedActor) || [];
    const events = indices.map(i => this.events[i]).reverse();
    return events.slice(0, Math.min(limit, this.MAX_QUERY_RESULTS));
  }

  /**
   * Get events for specific target address
   * @see INotificationManager.getEventsByTarget
   */
  async getEventsByTarget(target: string, limit: number = 100): Promise<EventStruct[]> {
    const normalizedTarget = target.toLowerCase();
    const indices = this.targetIndex.get(normalizedTarget) || [];
    const events = indices.map(i => this.events[i]).reverse();
    return events.slice(0, Math.min(limit, this.MAX_QUERY_RESULTS));
  }

  /**
   * Get events in date range
   * @see INotificationManager.getEventsByDateRange
   */
  async getEventsByDateRange(startDate: number, endDate: number, limit: number = 100): Promise<EventStruct[]> {
    const filter: EventFilter = {
      startDate,
      endDate,
      limit: Math.min(limit, this.MAX_QUERY_RESULTS),
    };
    return this.getEvents(filter);
  }

  /**
   * Get event count by type
   * @see INotificationManager.getEventCount
   */
  async getEventCount(eventType?: string): Promise<number> {
    if (!eventType) {
      return this.events.length;
    }
    const indices = this.eventTypeIndex.get(eventType) || [];
    return indices.length;
  }

  /**
   * Get event count by date
   * @see INotificationManager.getEventCountByDate
   */
  async getEventCountByDate(eventType?: string, startDate?: number, endDate?: number): Promise<number> {
    let filtered = this.events;

    if (eventType) {
      filtered = filtered.filter(e => e.eventType === eventType);
    }

    if (startDate !== undefined) {
      filtered = filtered.filter(e => e.timestamp >= startDate);
    }

    if (endDate !== undefined) {
      filtered = filtered.filter(e => e.timestamp <= endDate);
    }

    return filtered.length;
  }

  // ============================================================
  // NOTIFICATION & FRONTEND INTEGRATION
  // ============================================================

  /**
   * Get notifiable events for a user (events they're subscribed to, new since last check)
   * @see INotificationManager.getNotifiableEvents
   */
  async getNotifiableEvents(user: string, sinceTimestamp?: number): Promise<EventStruct[]> {
    const subscription = this.subscriptions.get(user.toLowerCase());
    if (!subscription || !subscription.isActive) {
      return [];
    }

    const since = sinceTimestamp || subscription.lastNotificationTime;
    const eventTypes = Array.from(subscription.eventTypes);

    const filter: EventFilter = {
      eventTypes: eventTypes.length > 0 && !eventTypes.includes('*') ? eventTypes : undefined,
      startDate: since > 0 ? since : undefined,
      limit: 100,
    };

    return this.getEvents(filter);
  }

  /**
   * Mark events as notified for a user
   * @see INotificationManager.markEventsAsNotified
   */
  async markEventsAsNotified(user: string): Promise<void> {
    const subscription = this.subscriptions.get(user.toLowerCase());
    if (subscription) {
      subscription.lastNotificationTime = Math.floor(Date.now() / 1000);
    }
  }

  /**
   * Get notification summary for user
   * @see INotificationManager.getNotificationSummary
   */
  async getNotificationSummary(user: string): Promise<Record<string, number>> {
    const notifiableEvents = await this.getNotifiableEvents(user);
    const summary: Record<string, number> = {};

    for (const event of notifiableEvents) {
      summary[event.eventType] = (summary[event.eventType] || 0) + 1;
    }

    return summary;
  }

  // ============================================================
  // UTILITY & MAINTENANCE FUNCTIONS
  // ============================================================

  /**
   * Get total number of stored events
   * @see INotificationManager.getTotalEventCount
   */
  async getTotalEventCount(): Promise<number> {
    return this.events.length;
  }

  /**
   * Get all unique event types currently stored
   * @see INotificationManager.getEventTypes
   */
  async getEventTypes(): Promise<string[]> {
    return Array.from(this.eventTypeIndex.keys());
  }

  /**
   * Get all subscribers to a specific event type
   * @see INotificationManager.getSubscribers
   */
  async getSubscribers(eventType: string): Promise<string[]> {
    const subscribers: string[] = [];

    this.subscriptions.forEach((subscription, user) => {
      if (
        subscription.isActive &&
        (subscription.eventTypes.has(eventType) || subscription.eventTypes.has('*'))
      ) {
        subscribers.push(user);
      }
    });

    return subscribers;
  }

  /**
   * Get subscription count by event type
   * @see INotificationManager.getSubscriptionCount
   */
  async getSubscriptionCount(eventType: string): Promise<number> {
    const subscribers = await this.getSubscribers(eventType);
    return subscribers.length;
  }

  /**
   * Cleanup expired events (older than 1 year)
   * @see INotificationManager.cleanupExpiredEvents
   */
  async cleanupExpiredEvents(daysToRetain: number = 365): Promise<number> {
    this.onlyOwner(this.owner);

    const beforeCount = this.events.length;
    const now = Math.floor(Date.now() / 1000);
    const maxAgeSeconds = daysToRetain * 86400;

    // Filter out expired events
    this.events = this.events.filter(event => now - event.timestamp <= maxAgeSeconds);

    // Rebuild indexes
    this.rebuildIndexes();

    const removedCount = beforeCount - this.events.length;
    this.notifyEventListeners('EventsCleanedUp', removedCount);

    return removedCount;
  }

  /**
   * Rebuild all indexes (expensive operation)
   */
  private rebuildIndexes(): void {
    this.eventTypeIndex.clear();
    this.actorIndex.clear();
    this.targetIndex.clear();
    this.timestampIndex.clear();

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      this.updateIndexes(event);
    }
  }

  /**
   * Get storage statistics
   * @see INotificationManager.getStorageStats
   */
  async getStorageStats(): Promise<{
    totalEvents: number;
    oldestEventDate: number;
    newestEventDate: number;
    estimatedGasUsed: number;
    averageEventSize: number;
  }> {
    if (this.events.length === 0) {
      return {
        totalEvents: 0,
        oldestEventDate: 0,
        newestEventDate: 0,
        estimatedGasUsed: 0,
        averageEventSize: 0,
      };
    }

    let totalGas = 0;
    for (const event of this.events) {
      totalGas += EventLib.estimateGasCost(event);
    }

    return {
      totalEvents: this.events.length,
      oldestEventDate: this.events[0].timestamp,
      newestEventDate: this.events[this.events.length - 1].timestamp,
      estimatedGasUsed: totalGas,
      averageEventSize: totalGas / this.events.length,
    };
  }

  /**
   * Export events to JSON format for backup
   * @see INotificationManager.exportEvents
   */
  async exportEvents(filter?: EventFilter): Promise<string> {
    const eventsToExport = filter ? await this.getEvents(filter) : this.events;

    return JSON.stringify(eventsToExport, null, 2);
  }

  /**
   * Authorize additional emitters
   * 
   * @param caller - Address of caller (must be owner)
   * @param emitter - Address to authorize
   */
  async authorizeEmitter(caller: string, emitter: string): Promise<void> {
    this.onlyOwner(caller);
    this.authorizedEmitters.add(emitter.toLowerCase());
  }

  /**
   * Revoke emitter authorization
   * 
   * @param caller - Address of caller (must be owner)
   * @param emitter - Address to revoke
   */
  async revokeEmitterAuth(caller: string, emitter: string): Promise<void> {
    this.onlyOwner(caller);
    const addr = emitter.toLowerCase();
    if (addr !== this.owner) {
      this.authorizedEmitters.delete(addr);
    }
  }

  /**
   * Pause event emissions (emergency only)
   * @see INotificationManager.pause
   */
  async pause(): Promise<void> {
    this.isPausedState = true;
    this.notifyEventListeners('PauseToggled', true);
  }

  /**
   * Resume event emissions
   * @see INotificationManager.unpause
   */
  async unpause(): Promise<void> {
    this.isPausedState = false;
    this.notifyEventListeners('PauseToggled', false);
  }

  /**
   * Check if event emissions are paused
   * @see INotificationManager.isPaused
   */
  async isPaused(): Promise<boolean> {
    return this.isPausedState;
  }

  // ============================================================
  // EVENT LISTENER MANAGEMENT (Frontend Integration)
  // ============================================================

  /**
   * Add event listener for frontend real-time updates
   * @see INotificationManager.on
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.delete(listener);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
  }

  // ============================================================
  // GETTERS FOR INTERNAL STATE (for testing/debugging)
  // ============================================================

  /**
   * Get all events (internal method for testing)
   */
  getAllEvents(): EventStruct[] {
    return this.events;
  }

  /**
   * Get subscription map (internal method for testing)
   */
  getSubscriptionMap(): Map<string, Subscription> {
    return this.subscriptions;
  }

  /**
   * Get owner address
   */
  getOwner(): string {
    return this.owner;
  }

  /**
   * Get authorized emitters
   */
  getAuthorizedEmitters(): string[] {
    return Array.from(this.authorizedEmitters);
  }
}
