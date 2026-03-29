/**
 * EventStructure.ts
 * 
 * Defines the core EventStruct for storing DAO events in a gas-efficient manner.
 * Uses compact storage with indexed fields for fast retrieval and filtering.
 */

/**
 * Enum defining all supported DAO event types.
 * These correspond to different DAO activities that need to be tracked.
 */
export enum EventType {
  // Governance events
  PROPOSAL_CREATED = 'PROPOSAL_CREATED',
  PROPOSAL_CANCELLED = 'PROPOSAL_CANCELLED',
  PROPOSAL_QUEUED = 'PROPOSAL_QUEUED',
  PROPOSAL_EXECUTED = 'PROPOSAL_EXECUTED',
  
  // Voting events
  VOTE_CAST = 'VOTE_CAST',
  VOTE_CHANGED = 'VOTE_CHANGED',
  VOTE_WITHDRAWN = 'VOTE_WITHDRAWN',
  
  // Treasury/Finance events
  TREASURY_WITHDRAWAL = 'TREASURY_WITHDRAWAL',
  TREASURY_DEPOSIT = 'TREASURY_DEPOSIT',
  TREASURY_TRANSFER = 'TREASURY_TRANSFER',
  BUDGET_ALLOCATED = 'BUDGET_ALLOCATED',
  
  // Member events
  MEMBER_JOINED = 'MEMBER_JOINED',
  MEMBER_LEFT = 'MEMBER_LEFT',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REVOKED = 'ROLE_REVOKED',
  
  // Execution events
  EXECUTION_STARTED = 'EXECUTION_STARTED',
  EXECUTION_COMPLETED = 'EXECUTION_COMPLETED',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  
  // System events
  SYSTEM_INITIALIZED = 'SYSTEM_INITIALIZED',
  SYSTEM_PARAMETER_CHANGED = 'SYSTEM_PARAMETER_CHANGED',
  EMERGENCY_PAUSE = 'EMERGENCY_PAUSE',
  EMERGENCY_RESUME = 'EMERGENCY_RESUME',
}

/**
 * Core EventStruct - gas-optimized storage structure for DAO events.
 * 
 * This struct is designed to minimize storage costs while providing
 * all necessary information for event tracking and filtering.
 * 
 * @interface EventStruct
 */
export interface EventStruct {
  /**
   * Unique identifier for the event (incremental counter).
   * Used for ordering and indexing events.
   */
  id: number;

  /**
   * Type of event (from EventType enum).
   * Enables filtering by event category.
   * Stored as EventType for type safety.
   */
  eventType: EventType;

  /**
   * Unix timestamp when the event occurred.
   * Enables time-based filtering and historical analysis.
   * Stored as number (seconds since epoch).
   */
  timestamp: number;

  /**
   * Address of the actor who triggered the event.
   * Could be a proposal creator, voter, member, etc.
   * Enables filtering by actor and tracking user activity.
   */
  actor: string;

  /**
   * Optional target address related to the event.
   * Examples: proposal target, token recipient, treasury address.
   * Used for enhanced filtering and relationship tracking.
   * Can be empty string if not applicable.
   */
  target: string;

  /**
   * Compact metadata as JSON string.
   * Contains event-specific data like vote choice, amount, reason, etc.
   * Compact string format minimizes storage while maintaining flexibility.
   * 
   * Example: '{"proposalId":"123","choice":"yes","reason":"Good proposal"}'
   */
  metadata: string;

  /**
   * Optional category for ultra-fast filtering.
   * Used for primary categorization before metadata parsing.
   */
  category: string;

  /**
   * Block number when event was recorded.
   * Used for blockchain context and verification.
   */
  blockNumber: number;
}

/**
 * Extended event structure for filtering and retrieval.
 * Used in queries to specify which events to return.
 */
export interface EventFilter {
  /**
   * Filter by event type(s)
   */
  eventTypes?: string[];

  /**
   * Filter events starting from this Unix timestamp (inclusive)
   */
  startDate?: number;

  /**
   * Filter events up to this Unix timestamp (inclusive)
   */
  endDate?: number;

  /**
   * Filter events by actor address
   */
  actor?: string;

  /**
   * Filter events by target address
   */
  target?: string;

  /**
   * Filter by category
   */
  category?: string;

  /**
   * Maximum number of events to return
   */
  limit?: number;

  /**
   * Offset for pagination
   */
  offset?: number;
}

/**
 * Subscription structure for user event preferences.
 */
export interface Subscription {
  /**
   * User address subscribed
   */
  user: string;

  /**
   * Event types user is subscribed to
   */
  eventTypes: Set<string>;

  /**
   * Whether subscription is active
   */
  isActive: boolean;

  /**
   * When subscription was created (Unix timestamp)
   */
  createdAt: number;

  /**
   * Last notification sent timestamp
   */
  lastNotificationTime: number;
}

/**
 * Event emission payload for frontend listeners
 * Standardized format for Web3 event listening
 */
export interface EventEmissionPayload {
  /**
   * Event name for frontend listeners
   */
  eventName: string;

  /**
   * Event data
   */
  data: {
    id: number;
    eventType: string;
    timestamp: number;
    actor: string;
    target: string;
    metadata: any;
    blockNumber: number;
  };

  /**
   * Indexed fields for efficient event filtering on frontend
   */
  indexed: {
    eventType: string;
    actor: string;
    target: string;
  };
}
