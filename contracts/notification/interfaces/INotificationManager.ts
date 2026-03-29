/**
 * INotificationManager.ts
 * 
 * Interface defining all public functions and events for the NotificationManager contract.
 * Provides standardized API for DAO event management and subscriptions.
 */

import { EventStruct, EventFilter, Subscription } from '../structures/EventStructure';

/**
 * INotificationManager - Interface for DAO event and notification management
 * 
 * This interface defines the contract for:
 * - Event emission and storage
 * - Subscription management
 * - Event filtering and retrieval
 * - Frontend integration
 */
export interface INotificationManager {
  // ============================================================
  // EVENT EMISSION FUNCTIONS
  // ============================================================

  /**
   * Emit a new DAO event and store it
   * 
   * @param eventType - Type of event from EventType enum
   * @param actor - Address of the actor triggering the event
   * @param target - Optional target address (proposal, recipient, etc.)
   * @param metadata - Optional event metadata as JSON string
   * @throws Error if event type is invalid or storage fails
   * 
   * Example:
   * emitEvent(
   *   'PROPOSAL_CREATED',
   *   '0xUserAddress',
   *   '0xProposalAddress',
   *   '{"proposalId":"123","title":"Add new feature"}'
   * )
   */
  emitEvent(
    eventType: string,
    actor: string,
    target?: string,
    metadata?: string
  ): Promise<void>;

  /**
   * Emit multiple events in batch (gas-efficient)
   * 
   * @param events - Array of event data to emit
   * @throws Error if any event is invalid
   * 
   * Example:
   * emitBatchEvents([
   *   { eventType: 'VOTE_CAST', actor, target, metadata },
   *   { eventType: 'TREASURY_WITHDRAWAL', actor, target, metadata }
   * ])
   */
  emitBatchEvents(
    events: Array<{
      eventType: string;
      actor: string;
      target?: string;
      metadata?: string;
    }>
  ): Promise<void>;

  // ============================================================
  // SUBSCRIPTION MANAGEMENT FUNCTIONS
  // ============================================================

  /**
   * Subscribe user to specific event type(s)
   * 
   * @param user - Address of user subscribing
   * @param eventType - Event type to subscribe to
   * @throws Error if user or event type is invalid
   * 
   * Example: subscribe(userAddress, 'PROPOSAL_CREATED')
   * Example: subscribe(userAddress, 'VOTE_CAST')
   */
  subscribe(user: string, eventType: string): Promise<void>;

  /**
   * Subscribe user to multiple event types
   * 
   * @param user - Address of user subscribing
   * @param eventTypes - Array of event types to subscribe to
   * @throws Error if any event type is invalid
   */
  subscribeToMultiple(user: string, eventTypes: string[]): Promise<void>;

  /**
   * Subscribe user to all DAO events
   * 
   * @param user - Address of user subscribing
   * @throws Error if user is invalid
   */
  subscribeToAll(user: string): Promise<void>;

  /**
   * Unsubscribe user from specific event type
   * 
   * @param user - Address of user unsubscribing
   * @param eventType - Event type to unsubscribe from
   * @throws Error if user or event type is invalid
   */
  unsubscribe(user: string, eventType: string): Promise<void>;

  /**
   * Unsubscribe user from all event types
   * 
   * @param user - Address of user
   * @throws Error if user is invalid
   */
  unsubscribeFromAll(user: string): Promise<void>;

  /**
   * Check if user is subscribed to event type
   * 
   * @param user - Address to check
   * @param eventType - Event type to check
   * @returns True if user is subscribed
   */
  isSubscribed(user: string, eventType: string): Promise<boolean>;

  /**
   * Get all event types user is subscribed to
   * 
   * @param user - Address of user
   * @returns Array of subscribed event types
   */
  getUserSubscriptions(user: string): Promise<string[]>;

  // ============================================================
  // EVENT RETRIEVAL & FILTERING FUNCTIONS
  // ============================================================

  /**
   * Get events with optional filtering
   * 
   * @param filter - Filter criteria (optional)
   * @returns Array of matching EventStructs
   * 
   * Example: Get all proposal events from last 30 days
   * getEvents({
   *   eventTypes: ['PROPOSAL_CREATED', 'PROPOSAL_EXECUTED'],
   *   startDate: Date.now() - (30 * 86400 * 1000),
   *   limit: 100
   * })
   * 
   * Example: Get all votes by specific user
   * getEvents({
   *   eventTypes: ['VOTE_CAST'],
   *   actor: userAddress,
   *   limit: 50
   * })
   */
  getEvents(filter?: EventFilter): Promise<EventStruct[]>;

  /**
   * Get recent events (last N events)
   * 
   * @param count - Number of recent events to return (max 1000)
   * @returns Array of recent EventStructs
   */
  getRecentEvents(count: number): Promise<EventStruct[]>;

  /**
   * Get event by ID
   * 
   * @param eventId - Event ID to retrieve
   * @returns EventStruct or null if not found
   */
  getEventById(eventId: number): Promise<EventStruct | null>;

  /**
   * Get all events of a specific type
   * 
   * @param eventType - Event type to retrieve
   * @param limit - Maximum number of events (default 100)
   * @returns Array of EventStructs
   */
  getEventsByType(eventType: string, limit?: number): Promise<EventStruct[]>;

  /**
   * Get all events triggered by specific actor
   * 
   * @param actor - Actor address
   * @param limit - Maximum number of events (default 100)
   * @returns Array of EventStructs
   */
  getEventsByActor(actor: string, limit?: number): Promise<EventStruct[]>;

  /**
   * Get events for specific target address
   * 
   * @param target - Target address
   * @param limit - Maximum number of events (default 100)
   * @returns Array of EventStructs
   */
  getEventsByTarget(target: string, limit?: number): Promise<EventStruct[]>;

  /**
   * Get events in date range
   * 
   * @param startDate - Start date (Unix timestamp)
   * @param endDate - End date (Unix timestamp)
   * @param limit - Maximum number of events
   * @returns Array of EventStructs
   */
  getEventsByDateRange(startDate: number, endDate: number, limit?: number): Promise<EventStruct[]>;

  /**
   * Get event count by type
   * 
   * @param eventType - Event type (optional, returns all if not specified)
   * @returns Total count of events
   */
  getEventCount(eventType?: string): Promise<number>;

  /**
   * Get event count by date
   * 
   * @param eventType - Event type (optional)
   * @param startDate - Start date (Unix timestamp)
   * @param endDate - End date (Unix timestamp)
   * @returns Count of events in date range
   */
  getEventCountByDate(eventType?: string, startDate?: number, endDate?: number): Promise<number>;

  // ============================================================
  // NOTIFICATION & FRONTEND INTEGRATION
  // ============================================================

  /**
   * Get notifiable events for a user (events they're subscribed to, new since last check)
   * 
   * @param user - User address
   * @param sinceTimestamp - Only return events after this timestamp
   * @returns Array of notifiable EventStructs
   */
  getNotifiableEvents(user: string, sinceTimestamp?: number): Promise<EventStruct[]>;

  /**
   * Mark events as notified for a user
   * Updates the user's last notification timestamp
   * 
   * @param user - User address
   */
  markEventsAsNotified(user: string): Promise<void>;

  /**
   * Get notification summary for user
   * Returns count of new events by type
   * 
   * @param user - User address
   * @returns Object with event type counts
   */
  getNotificationSummary(user: string): Promise<Record<string, number>>;

  // ============================================================
  // UTILITY & MAINTENANCE FUNCTIONS
  // ============================================================

  /**
   * Get total number of stored events
   * 
   * @returns Total event count
   */
  getTotalEventCount(): Promise<number>;

  /**
   * Get all unique event types currently stored
   * 
   * @returns Array of event type strings
   */
  getEventTypes(): Promise<string[]>;

  /**
   * Get all subscribers to a specific event type
   * 
   * @param eventType - Event type
   * @returns Array of subscriber addresses
   */
  getSubscribers(eventType: string): Promise<string[]>;

  /**
   * Get subscription count by event type
   * 
   * @param eventType - Event type
   * @returns Number of subscribers
   */
  getSubscriptionCount(eventType: string): Promise<number>;

  /**
   * Cleanup expired events (older than 1 year)
   * Should be called periodically to free storage
   * 
   * @param daysToRetain - Number of days to retain (default 365)
   * @returns Number of events removed
   */
  cleanupExpiredEvents(daysToRetain?: number): Promise<number>;

  /**
   * Get storage statistics
   * 
   * @returns Object with storage info
   */
  getStorageStats(): Promise<{
    totalEvents: number;
    oldestEventDate: number;
    newestEventDate: number;
    estimatedGasUsed: number;
    averageEventSize: number;
  }>;

  /**
   * Export events to JSON format for backup
   * 
   * @param filter - Optional filter criteria
   * @returns JSON string of events
   */
  exportEvents(filter?: EventFilter): Promise<string>;

  /**
   * Pause event emissions (emergency only)
   * 
   * @throws Error if caller is not authorized
   */
  pause(): Promise<void>;

  /**
   * Resume event emissions
   * 
   * @throws Error if caller is not authorized
   */
  unpause(): Promise<void>;

  /**
   * Check if event emissions are paused
   * 
   * @returns True if paused
   */
  isPaused(): Promise<boolean>;

  // ============================================================
  // EVENT LISTENERS (for frontend integration)
  // ============================================================

  /**
   * Event fired when new event is emitted
   * Allows frontend to listen in real-time
   */
  on(event: 'EventEmitted', listener: (eventData: any) => void): void;

  /**
   * Event fired when user subscription changes
   */
  on(event: 'SubscriptionChanged', listener: (user: string, eventType: string, subscribed: boolean) => void): void;

  /**
   * Event fired when events are cleaned up
   */
  on(event: 'EventsCleanedUp', listener: (count: number) => void): void;

  /**
   * Event fired on pause/unpause
   */
  on(event: 'PauseToggled', listener: (isPaused: boolean) => void): void;
}
