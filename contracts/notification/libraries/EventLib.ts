/**
 * EventLib.ts
 * 
 * Helper library for event creation, filtering, and indexing operations.
 * Provides utility functions for efficient event management and retrieval.
 */

import { EventStruct, EventFilter, EventType } from '../structures/EventStructure';

/**
 * EventLib - Library of static helper functions for event operations.
 * Designed to be gas-efficient and provide fast lookups.
 */
export class EventLib {
  /**
   * Create a new EventStruct with validated parameters
   * 
   * @param id - Unique event identifier
   * @param eventType - Type of event from EventType enum
   * @param actor - Address that triggered the event
   * @param target - Target address (optional)
   * @param metadata - Event-specific data as JSON string
   * @param category - Event category for fast filtering
   * @param blockNumber - Block number when event occurred
   * @returns New EventStruct instance
   * @throws Error if parameters are invalid
   */
  public static createEvent(
    id: number,
    eventType: string,
    actor: string,
    target: string = '',
    metadata: string = '{}',
    category: string = '',
    blockNumber: number = 0
  ): EventStruct {
    // Validate event type is supported
    EventLib.validateEventType(eventType);

    // Validate actor address
    if (!actor || actor.trim().length === 0) {
      throw new Error('EventLib: Actor address cannot be empty');
    }

    // Clean and validate addresses
    const cleanedActor = EventLib.normalizeAddress(actor);
    const cleanedTarget = target ? EventLib.normalizeAddress(target) : '';

    // Validate metadata is valid JSON
    if (metadata && metadata.trim().length > 0) {
      try {
        JSON.parse(metadata);
      } catch (e) {
        throw new Error(`EventLib: Invalid JSON metadata: ${e}`);
      }
    }

    // Create event struct
    const event: EventStruct = {
      id,
      eventType: eventType as EventType,
      timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
      actor: cleanedActor,
      target: cleanedTarget,
      metadata: metadata || '{}',
      category: category || EventLib.getCategoryFromEventType(eventType),
      blockNumber: blockNumber > 0 ? blockNumber : 0,
    };

    return event;
  }

  /**
   * Filter events based on criteria
   * 
   * @param events - Array of events to filter
   * @param filter - Filter criteria
   * @returns Filtered array of events
   */
  public static filterEvents(events: EventStruct[], filter: EventFilter): EventStruct[] {
    let filtered = events;

    // Filter by event types
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      filtered = filtered.filter(e => filter.eventTypes!.includes(e.eventType));
    }

    // Filter by start date
    if (filter.startDate !== undefined) {
      filtered = filtered.filter(e => e.timestamp >= filter.startDate!);
    }

    // Filter by end date
    if (filter.endDate !== undefined) {
      filtered = filtered.filter(e => e.timestamp <= filter.endDate!);
    }

    // Filter by actor
    if (filter.actor) {
      const normalizedActor = EventLib.normalizeAddress(filter.actor);
      filtered = filtered.filter(e => e.actor === normalizedActor);
    }

    // Filter by target
    if (filter.target) {
      const normalizedTarget = EventLib.normalizeAddress(filter.target);
      filtered = filtered.filter(e => e.target === normalizedTarget);
    }

    // Filter by category
    if (filter.category) {
      filtered = filtered.filter(e => e.category === filter.category);
    }

    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;
    filtered = filtered.slice(offset, offset + limit);

    return filtered;
  }

  /**
   * Create a reverse index for fast lookups by event type
   * 
   * @param events - Array of events to index
   * @returns Map of event type to event indices
   */
  public static createEventTypeIndex(events: EventStruct[]): Map<string, number[]> {
    const index = new Map<string, number[]>();

    for (let i = 0; i < events.length; i++) {
      const eventType = events[i].eventType;
      if (!index.has(eventType)) {
        index.set(eventType, []);
      }
      index.get(eventType)!.push(i);
    }

    return index;
  }

  /**
   * Create a reverse index for fast lookups by actor
   * 
   * @param events - Array of events to index
   * @returns Map of actor address to event indices
   */
  public static createActorIndex(events: EventStruct[]): Map<string, number[]> {
    const index = new Map<string, number[]>();

    for (let i = 0; i < events.length; i++) {
      const actor = events[i].actor;
      if (!index.has(actor)) {
        index.set(actor, []);
      }
      index.get(actor)!.push(i);
    }

    return index;
  }

  /**
   * Create a reverse index for fast lookups by target
   * 
   * @param events - Array of events to index
   * @returns Map of target address to event indices
   */
  public static createTargetIndex(events: EventStruct[]): Map<string, number[]> {
    const index = new Map<string, number[]>();

    for (let i = 0; i < events.length; i++) {
      const target = events[i].target;
      if (target && target.length > 0) {
        if (!index.has(target)) {
          index.set(target, []);
        }
        index.get(target)!.push(i);
      }
    }

    return index;
  }

  /**
   * Create a timestamp-based index for fast date range queries
   * 
   * @param events - Array of events to index
   * @returns Array of timestamp buckets (day-based)
   */
  public static createTimestampIndex(events: EventStruct[]): Map<number, number[]> {
    const index = new Map<number, number[]>();
    const ONE_DAY_SECONDS = 86400;

    for (let i = 0; i < events.length; i++) {
      const dayBucket = Math.floor(events[i].timestamp / ONE_DAY_SECONDS) * ONE_DAY_SECONDS;
      if (!index.has(dayBucket)) {
        index.set(dayBucket, []);
      }
      index.get(dayBucket)!.push(i);
    }

    return index;
  }

  /**
   * Parse metadata JSON string safely
   * 
   * @param metadata - JSON metadata string
   * @returns Parsed metadata object or empty object if invalid
   */
  public static parseMetadata(metadata: string): Record<string, any> {
    try {
      return metadata ? JSON.parse(metadata) : {};
    } catch (e) {
      console.warn('EventLib: Failed to parse metadata:', metadata);
      return {};
    }
  }

  /**
   * Create metadata JSON string from object
   * 
   * @param data - Metadata object
   * @returns JSON string representation
   */
  public static stringifyMetadata(data: Record<string, any>): string {
    try {
      return JSON.stringify(data);
    } catch (e) {
      console.warn('EventLib: Failed to stringify metadata:', data);
      return '{}';
    }
  }

  /**
   * Check if an event matches a subscription type
   * 
   * @param event - Event to check
   * @param subscribedTypes - Set of subscribed event types
   * @returns True if event matches subscription
   */
  public static eventMatchesSubscription(event: EventStruct, subscribedTypes: Set<string>): boolean {
    return subscribedTypes.has(event.eventType) || subscribedTypes.has('*'); // '*' means subscribe to all
  }

  /**
   * Calculate event age in seconds
   * 
   * @param event - Event to check
   * @returns Age in seconds
   */
  public static getEventAge(event: EventStruct): number {
    const now = Math.floor(Date.now() / 1000);
    return now - event.timestamp;
  }

  /**
   * Check if event is older than retention period (1 year)
   * 
   * @param event - Event to check
   * @param retentionDays - Retention period in days (default 365)
   * @returns True if event is older than retention period
   */
  public static isEventExpired(event: EventStruct, retentionDays: number = 365): boolean {
    const maxAgeDays = retentionDays;
    const maxAgeSeconds = maxAgeDays * 86400;
    return EventLib.getEventAge(event) > maxAgeSeconds;
  }

  /**
   * Validate event type is in supported enum
   * 
   * @param eventType - Event type to validate
   * @throws Error if event type is not supported
   */
  private static validateEventType(eventType: string): void {
    const supportedTypes = Object.values(EventType);
    if (!supportedTypes.includes(eventType as EventType)) {
      throw new Error(`EventLib: Unsupported event type: ${eventType}`);
    }
  }

  /**
   * Normalize and validate an address
   * 
   * @param address - Address to normalize
   * @returns Normalized address (lowercase)
   * @throws Error if address is invalid
   */
  private static normalizeAddress(address: string): string {
    if (!address || typeof address !== 'string') {
      throw new Error('EventLib: Invalid address format');
    }

    // Clean whitespace
    const cleaned = address.trim();

    // Validate Ethereum address format (0x + 40 hex characters)
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleaned)) {
      throw new Error(`EventLib: Invalid Ethereum address format: ${address}`);
    }

    // Return lowercase for consistency
    return cleaned.toLowerCase();
  }

  /**
   * Get category from event type for efficient filtering
   * 
   * @param eventType - Event type from EventType enum
   * @returns Category string
   */
  private static getCategoryFromEventType(eventType: string): string {
    if (eventType.startsWith('PROPOSAL_')) {
      return 'GOVERNANCE';
    } else if (eventType.startsWith('VOTE_')) {
      return 'VOTING';
    } else if (eventType.startsWith('TREASURY_') || eventType === 'BUDGET_ALLOCATED') {
      return 'FINANCE';
    } else if (eventType.startsWith('MEMBER_') || eventType.startsWith('ROLE_')) {
      return 'MEMBERSHIP';
    } else if (eventType.startsWith('EXECUTION_')) {
      return 'EXECUTION';
    } else if (eventType.startsWith('EMERGENCY_') || eventType === 'SYSTEM_PARAMETER_CHANGED') {
      return 'SYSTEM';
    }
    return 'OTHER';
  }

  /**
   * Estimate gas cost for event storage
   * Used for gas optimization planning
   * 
   * @param event - Event to estimate cost for
   * @returns Estimated gas cost
   */
  public static estimateGasCost(event: EventStruct): number {
    // Rough estimates per field (in gas units)
    const baseGas = 20000; // Storage allocation
    const perField = 5000;
    const metadataOverhead = Math.ceil(event.metadata.length / 32) * 20000;

    return baseGas + (6 * perField) + metadataOverhead;
  }

  /**
   * Compress event data for archival (string representation)
   * 
   * @param event - Event to compress
   * @returns Compressed string representation
   */
  public static compressEvent(event: EventStruct): string {
    return `${event.id}|${event.eventType}|${event.timestamp}|${event.actor}|${event.target}|${event.metadata}`;
  }

  /**
   * Decompress event from archived format
   * 
   * @param compressed - Compressed event string
   * @returns EventStruct
   * @throws Error if format is invalid
   */
  public static decompressEvent(compressed: string, blockNumber: number = 0): EventStruct {
    const parts = compressed.split('|');
    if (parts.length < 6) {
      throw new Error('EventLib: Invalid compressed event format');
    }

    return {
      id: parseInt(parts[0], 10),
      eventType: parts[1] as EventType,
      timestamp: parseInt(parts[2], 10),
      actor: parts[3],
      target: parts[4],
      metadata: parts[5],
      category: EventLib.getCategoryFromEventType(parts[1]),
      blockNumber,
    };
  }
}
