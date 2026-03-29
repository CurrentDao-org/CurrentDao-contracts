/**
 * index.ts
 * 
 * Central export file for the NotificationManager system.
 * Provides easy access to all notification system components.
 */

// Core Contract
export { NotificationManager } from './NotificationManager';

// Structures & Types
import {
  EventStruct,
  EventType,
  EventFilter,
  Subscription,
  EventEmissionPayload,
} from './structures/EventStructure';

export {
  EventStruct,
  EventType,
  EventFilter,
  Subscription,
  EventEmissionPayload,
};

// Library
export { EventLib } from './libraries/EventLib';

// Interface
export { INotificationManager } from './interfaces/INotificationManager';

// Deployment
export {
  NotificationManagerDeployer,
  deployNotificationManager,
  deployForTesting,
} from '../../scripts/notification/deploy_events';

/**
 * Convenience type aliases for common usage
 */
export type DaoEvent = EventStruct;
export type DaoEventType = EventType;
export type DaoEventFilter = EventFilter;
export type DaoNotificationFilter = EventFilter;

/**
 * Pre-configured event type constants for easy access
 */
export const EVENT_TYPES = {
  // Governance
  PROPOSAL_CREATED: EventType.PROPOSAL_CREATED,
  PROPOSAL_CANCELLED: EventType.PROPOSAL_CANCELLED,
  PROPOSAL_QUEUED: EventType.PROPOSAL_QUEUED,
  PROPOSAL_EXECUTED: EventType.PROPOSAL_EXECUTED,

  // Voting
  VOTE_CAST: EventType.VOTE_CAST,
  VOTE_CHANGED: EventType.VOTE_CHANGED,
  VOTE_WITHDRAWN: EventType.VOTE_WITHDRAWN,

  // Treasury
  TREASURY_WITHDRAWAL: EventType.TREASURY_WITHDRAWAL,
  TREASURY_DEPOSIT: EventType.TREASURY_DEPOSIT,
  TREASURY_TRANSFER: EventType.TREASURY_TRANSFER,
  BUDGET_ALLOCATED: EventType.BUDGET_ALLOCATED,

  // Membership
  MEMBER_JOINED: EventType.MEMBER_JOINED,
  MEMBER_LEFT: EventType.MEMBER_LEFT,
  ROLE_ASSIGNED: EventType.ROLE_ASSIGNED,
  ROLE_REVOKED: EventType.ROLE_REVOKED,

  // Execution
  EXECUTION_STARTED: EventType.EXECUTION_STARTED,
  EXECUTION_COMPLETED: EventType.EXECUTION_COMPLETED,
  EXECUTION_FAILED: EventType.EXECUTION_FAILED,

  // System
  SYSTEM_PARAMETER_CHANGED: EventType.SYSTEM_PARAMETER_CHANGED,
  EMERGENCY_PAUSE: EventType.EMERGENCY_PAUSE,
  EMERGENCY_RESUME: EventType.EMERGENCY_RESUME,
};

/**
 * Event categories for filtering
 */
export const EVENT_CATEGORIES = {
  GOVERNANCE: 'GOVERNANCE',
  VOTING: 'VOTING',
  FINANCE: 'FINANCE',
  MEMBERSHIP: 'MEMBERSHIP',
  EXECUTION: 'EXECUTION',
  SYSTEM: 'SYSTEM',
  OTHER: 'OTHER',
};

/**
 * Common filter presets
 */
export const FILTER_PRESETS = {
  /**
   * All governance-related events
   */
  governance: {
    eventTypes: [
      EventType.PROPOSAL_CREATED,
      EventType.PROPOSAL_CANCELLED,
      EventType.PROPOSAL_QUEUED,
      EventType.PROPOSAL_EXECUTED,
    ],
  },

  /**
   * All voting events
   */
  voting: {
    eventTypes: [EventType.VOTE_CAST, EventType.VOTE_CHANGED, EventType.VOTE_WITHDRAWN],
  },

  /**
   * All treasury/finance events
   */
  finance: {
    eventTypes: [
      EventType.TREASURY_WITHDRAWAL,
      EventType.TREASURY_DEPOSIT,
      EventType.TREASURY_TRANSFER,
      EventType.BUDGET_ALLOCATED,
    ],
  },

  /**
   * All membership events
   */
  membership: {
    eventTypes: [
      EventType.MEMBER_JOINED,
      EventType.MEMBER_LEFT,
      EventType.ROLE_ASSIGNED,
      EventType.ROLE_REVOKED,
    ],
  },

  /**
   * All execution events
   */
  execution: {
    eventTypes: [
      EventType.EXECUTION_STARTED,
      EventType.EXECUTION_COMPLETED,
      EventType.EXECUTION_FAILED,
    ],
  },

  /**
   * All system events
   */
  system: {
    eventTypes: [
      EventType.SYSTEM_PARAMETER_CHANGED,
      EventType.EMERGENCY_PAUSE,
      EventType.EMERGENCY_RESUME,
    ],
  },

  /**
   * Last 24 hours
   */
  today: {
    startDate: Math.floor(Date.now() / 1000) - 86400,
  },

  /**
   * Last 7 days
   */
  thisWeek: {
    startDate: Math.floor(Date.now() / 1000) - 604800,
  },

  /**
   * Last 30 days
   */
  thisMonth: {
    startDate: Math.floor(Date.now() / 1000) - 2592000,
  },
};

/**
 * Utility function to create filters easily
 */
export function createFilter(options: {
  types?: EventType[];
  actor?: string;
  target?: string;
  days?: number;
  limit?: number;
}): EventFilter {
  const filter: EventFilter = {};

  if (options.types && options.types.length > 0) {
    filter.eventTypes = options.types;
  }

  if (options.actor) {
    filter.actor = options.actor;
  }

  if (options.target) {
    filter.target = options.target;
  }

  if (options.days && options.days > 0) {
    const now = Math.floor(Date.now() / 1000);
    filter.startDate = now - options.days * 86400;
  }

  if (options.limit) {
    filter.limit = options.limit;
  }

  return filter;
}

/**
 * Version information
 */
export const VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  prerelease: null,
  toString: () => '1.0.0',
};
