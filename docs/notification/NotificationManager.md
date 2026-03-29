# NotificationManager - DAO Event & Notification System

## Overview

The **NotificationManager** is a comprehensive event management and notification system for DAO smart contracts. It provides real-time event tracking, subscription management, and frontend integration capabilities for DAO activities.

### Key Features

- ✅ **Gas-Optimized Event Storage**: Struct-based storage design minimizes on-chain storage costs
- ✅ **Real-Time Event Emission**: Emit and listen to DAO events in real-time
- ✅ **Subscription System**: Users can subscribe/unsubscribe to specific event types
- ✅ **Advanced Filtering**: Filter events by type, date, actor, target, and category
- ✅ **Historical Event Retention**: Maintains 1 year of event history
- ✅ **Frontend-Ready**: Standardized event emission for easy frontend integration
- ✅ **Batch Operations**: Emit multiple events efficiently
- ✅ **Comprehensive Indexing**: Fast lookups by type, actor, target, and date

---

## Architecture

### Core Components

#### 1. **EventStructure.ts**
Defines the core data structures:
- `EventStruct`: Gas-optimized event storage format
- `EventType`: Enum of all supported DAO event types
- `EventFilter`: Filter criteria for event queries
- `EventEmissionPayload`: Standardized frontend event format

#### 2. **EventLib.ts**
Helper library with static functions:
- Event creation and validation
- Filtering and indexing operations
- Metadata parsing and compression
- Gas cost estimation
- Event expiry checks

#### 3. **INotificationManager.ts**
Interface defining all public contract functions:
- Event emission functions
- Subscription management
- Event retrieval and filtering
- Notification operations
- Utility and maintenance functions

#### 4. **NotificationManager.ts**
Main implementation contract with:
- Event storage and indexing
- Subscription management
- Real-time notifications
- Pause/unpause controls
- Emitter authorization

---

## Event Types

The system supports the following DAO event categories:

### Governance Events
```typescript
PROPOSAL_CREATED       // New proposal submitted
PROPOSAL_CANCELLED     // Proposal cancelled
PROPOSAL_QUEUED        // Proposal queued for execution
PROPOSAL_EXECUTED      // Proposal executed
```

### Voting Events
```typescript
VOTE_CAST              // User cast a vote
VOTE_CHANGED           // User changed their vote
VOTE_WITHDRAWN         // User withdrew their vote
```

### Treasury/Finance Events
```typescript
TREASURY_WITHDRAWAL    // Funds withdrawn from treasury
TREASURY_DEPOSIT       // Funds deposited to treasury
TREASURY_TRANSFER      // Funds transferred
BUDGET_ALLOCATED       // Budget allocated
```

### Membership Events
```typescript
MEMBER_JOINED          // New member joined DAO
MEMBER_LEFT            // Member left DAO
ROLE_ASSIGNED          // Role assigned to member
ROLE_REVOKED           // Role revoked from member
```

### Execution Events
```typescript
EXECUTION_STARTED      // Contract execution started
EXECUTION_COMPLETED    // Execution completed successfully
EXECUTION_FAILED       // Execution failed
```

### System Events
```typescript
SYSTEM_PARAMETER_CHANGED  // System parameter changed
EMERGENCY_PAUSE           // Emergency pause triggered
EMERGENCY_RESUME          // Emergency pause resumed
```

---

## Core Data Structures

### EventStruct

```typescript
interface EventStruct {
  id: number;              // Unique event ID (incrementing)
  eventType: string;       // Type from EventType enum
  timestamp: number;       // Unix timestamp (seconds)
  actor: string;           // Address triggering event
  target: string;          // Target address (optional)
  metadata: string;        // JSON metadata
  category: string;        // Fast filtering category
  blockNumber: number;     // Block when event recorded
}
```

### EventFilter

```typescript
interface EventFilter {
  eventTypes?: string[];   // Filter by event types
  startDate?: number;      // Start date (Unix timestamp)
  endDate?: number;        // End date (Unix timestamp)
  actor?: string;          // Filter by actor
  target?: string;         // Filter by target
  category?: string;       // Filter by category
  limit?: number;          // Max results (default 100, max 1000)
  offset?: number;         // Pagination offset
}
```

---

## API Reference

### Event Emission

#### `emitEvent(eventType, actor, target?, metadata?)`
Emit a new DAO event and store it.

**Parameters**:
- `eventType` (string): Type of event from EventType enum
- `actor` (string): Address triggering the event
- `target` (string, optional): Target address
- `metadata` (string, optional): JSON metadata

**Example**:
```typescript
await manager.emitEvent(
  'PROPOSAL_CREATED',
  '0xUserAddress',
  '0xProposalAddress',
  JSON.stringify({
    proposalId: '123',
    title: 'Add new feature',
    description: 'Implement voting improvements'
  })
);
```

#### `emitBatchEvents(events)`
Emit multiple events efficiently (max 50 per batch).

**Example**:
```typescript
await manager.emitBatchEvents([
  {
    eventType: 'VOTE_CAST',
    actor: userAddr,
    target: proposalAddr,
    metadata: JSON.stringify({ choice: 'yes', weight: '1000' })
  },
  {
    eventType: 'TREASURY_WITHDRAWAL',
    actor: treasuryAddr,
    target: recipientAddr,
    metadata: JSON.stringify({ amount: '500000000000000000' })
  }
]);
```

---

### Subscription Management

#### `subscribe(user, eventType)`
Subscribe user to specific event type.

```typescript
await manager.subscribe('0xUserAddress', 'PROPOSAL_CREATED');
```

#### `subscribeToMultiple(user, eventTypes)`
Subscribe to multiple event types.

```typescript
await manager.subscribeToMultiple('0xUserAddress', [
  'PROPOSAL_CREATED',
  'VOTE_CAST',
  'TREASURY_WITHDRAWAL'
]);
```

#### `subscribeToAll(user)`
Subscribe to all DAO events.

```typescript
await manager.subscribeToAll('0xUserAddress');
```

#### `unsubscribe(user, eventType)`
Unsubscribe from specific event type.

```typescript
await manager.unsubscribe('0xUserAddress', 'PROPOSAL_CREATED');
```

#### `unsubscribeFromAll(user)`
Unsubscribe from all events.

```typescript
await manager.unsubscribeFromAll('0xUserAddress');
```

#### `getUserSubscriptions(user)`
Get all event types user is subscribed to.

```typescript
const subscriptions = await manager.getUserSubscriptions('0xUserAddress');
// Returns: ['PROPOSAL_CREATED', 'VOTE_CAST', 'TREASURY_WITHDRAWAL']
```

---

### Event Retrieval

#### `getEvents(filter?)`
Get events with optional filtering.

**Example**:
```typescript
// Get recent proposal events
const events = await manager.getEvents({
  eventTypes: ['PROPOSAL_CREATED', 'PROPOSAL_EXECUTED'],
  limit: 50
});

// Get all events from last 30 days
const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 86400);
const recentEvents = await manager.getEvents({
  startDate: thirtyDaysAgo,
  limit: 100
});

// Get all votes by specific user
const userVotes = await manager.getEvents({
  eventTypes: ['VOTE_CAST'],
  actor: '0xUserAddress',
  limit: 50
});
```

#### `getRecentEvents(count)`
Get the most recent N events.

```typescript
const recent = await manager.getRecentEvents(10);
```

#### `getEventById(eventId)`
Get specific event by ID.

```typescript
const event = await manager.getEventById(42);
```

#### `getEventsByType(eventType, limit?)`
Get all events of a specific type.

```typescript
const proposals = await manager.getEventsByType('PROPOSAL_CREATED', 100);
```

#### `getEventsByActor(actor, limit?)`
Get all events triggered by specific address.

```typescript
const userEvents = await manager.getEventsByActor('0xUserAddress', 100);
```

#### `getEventsByTarget(target, limit?)`
Get all events for specific target address.

```typescript
const targetEvents = await manager.getEventsByTarget('0xTargetAddress', 100);
```

#### `getEventsByDateRange(startDate, endDate, limit?)`
Get events within date range.

```typescript
const rangeEvents = await manager.getEventsByDateRange(
  startTimestamp,
  endTimestamp,
  100
);
```

---

### Notifications

#### `getNotifiableEvents(user, sinceTimestamp?)`
Get new events for a user (filtered by subscriptions).

```typescript
// Get new events since last notification
const newEvents = await manager.getNotifiableEvents('0xUserAddress');

// Get events since specific time
const since = Math.floor(Date.now() / 1000) - 3600; // Last hour
const recentEvents = await manager.getNotifiableEvents('0xUserAddress', since);
```

#### `getNotificationSummary(user)`
Get count of new events by type for a user.

```typescript
const summary = await manager.getNotificationSummary('0xUserAddress');
// Returns: {
//   'PROPOSAL_CREATED': 2,
//   'VOTE_CAST': 5,
//   'TREASURY_WITHDRAWAL': 1
// }
```

#### `markEventsAsNotified(user)`
Mark all events as notified for a user.

```typescript
await manager.markEventsAsNotified('0xUserAddress');
```

---

### Statistics & Maintenance

#### `getEventCount(eventType?)`
Get total count of events (optionally filtered by type).

```typescript
const totalEvents = await manager.getEventCount();
const proposalCount = await manager.getEventCount('PROPOSAL_CREATED');
```

#### `getEventCountByDate(eventType?, startDate?, endDate?)`
Get event count for date range.

```typescript
const countLastMonth = await manager.getEventCountByDate(
  'PROPOSAL_CREATED',
  thirtyDaysAgo,
  now
);
```

#### `getTotalEventCount()`
Get total events stored.

```typescript
const total = await manager.getTotalEventCount();
```

#### `getEventTypes()`
Get all unique event types stored.

```typescript
const types = await manager.getEventTypes();
```

#### `getStorageStats()`
Get storage statistics.

```typescript
const stats = await manager.getStorageStats();
// Returns: {
//   totalEvents: 1250,
//   oldestEventDate: 1704067200,
//   newestEventDate: 1704153600,
//   estimatedGasUsed: 45000000,
//   averageEventSize: 36000
// }
```

#### `cleanupExpiredEvents(daysToRetain?)`
Remove events older than retention period (default 365 days).

```typescript
const removed = await manager.cleanupExpiredEvents(365);
```

---

## Frontend Integration

### Event Listener Registration

```typescript
// Listen for all new events
manager.on('EventEmitted', (event) => {
  console.log('New event:', event);
  // Update UI with new event
});

// Listen for subscription changes
manager.on('SubscriptionChanged', (user, eventType, subscribed) => {
  console.log(`${user} ${subscribed ? 'subscribed to' : 'unsubscribed from'} ${eventType}`);
});

// Listen for contract pause
manager.on('PauseToggled', (isPaused) => {
  console.log(isPaused ? 'Contract paused' : 'Contract resumed');
});

// Listen for user-specific notifications
manager.on(`Notification:${userAddress}`, (payload) => {
  console.log('User notification:', payload);
  // Send notification to user
});
```

### Event Payload Format

All events are emitted in standardized format:

```typescript
{
  eventName: "Event:PROPOSAL_CREATED",  // Event type prefixed
  data: {
    id: 42,
    eventType: "PROPOSAL_CREATED",
    timestamp: 1704153600,
    actor: "0x...",
    target: "0x...",
    metadata: { proposalId: "123", title: "..." },
    blockNumber: 15000000
  },
  indexed: {
    eventType: "PROPOSAL_CREATED",
    actor: "0x...",
    target: "0x..."
  }
}
```

### Frontend Dashboard Integration

```typescript
// Setup notification system
class DAONotificationCenter {
  constructor(manager: NotificationManager, userAddress: string) {
    this.manager = manager;
    this.userAddress = userAddress;
    this.setupListeners();
  }

  private setupListeners() {
    // Listen for events this user is subscribed to
    this.manager.on(`Notification:${this.userAddress}`, (payload) => {
      this.handleNotification(payload);
    });
  }

  private handleNotification(payload: EventEmissionPayload) {
    const { eventType, data } = payload;
    
    switch (eventType) {
      case 'PROPOSAL_CREATED':
        this.showProposalNotification(data);
        break;
      case 'VOTE_CAST':
        this.showVoteNotification(data);
        break;
      case 'TREASURY_WITHDRAWAL':
        this.showTreasuryNotification(data);
        break;
      // ... handle other event types
    }
  }

  async getUnreadNotifications() {
    return await this.manager.getNotifiableEvents(this.userAddress);
  }

  async markAsRead() {
    await this.manager.markEventsAsNotified(this.userAddress);
  }

  async getNotificationCount() {
    const summary = await this.manager.getNotificationSummary(this.userAddress);
    return Object.values(summary).reduce((a, b) => a + b, 0);
  }
}

// Usage
const notificationCenter = new DAONotificationCenter(manager, userAddress);
const unread = await notificationCenter.getUnreadNotifications();
const count = await notificationCenter.getNotificationCount();
```

---

## Deployment

### Basic Deployment

```typescript
import { deployNotificationManager } from './scripts/notification/deploy_events';

async function deployDAO() {
  // Deploy notification manager
  const manager = await deployNotificationManager();
  
  // Authorize DAO contracts as emitters
  await manager.authorizeEmitter(ownerAddress, governanceContractAddr);
  await manager.authorizeEmitter(ownerAddress, treasuryContractAddr);
  await manager.authorizeEmitter(ownerAddress, votingContractAddr);
  
  console.log('✅ Notification system deployed and configured');
}
```

### Configuration

```typescript
interface DeploymentConfig {
  ownerAddress: string;                    // DAO owner/admin address
  authorizedEmitters: string[];            // Contracts allowed to emit events
  initializeEventTypes: boolean;           // Initialize all event types
  testMode: boolean;                       // Enable test mode
}
```

---

## Gas Optimization

### Storage Efficiency

The EventStruct is optimized for minimal storage:

- **Event ID**: Single uint256
- **Event Type**: String (32 bytes fixed)
- **Timestamp**: Unix seconds (uint256)
- **Addresses**: Two address fields (40 bytes)
- **Metadata**: Variable-length, compressed JSON

### Indexing Efficiency

Four reverse indexes enable fast queries:
- By event type
- By actor address
- By target address
- By timestamp (day buckets)

### Batch Operations

Emit multiple events in one transaction:

```typescript
// Use batch instead of individual calls
await manager.emitBatchEvents([
  { eventType: 'VOTE_CAST', actor: userAddr, ... },
  { eventType: 'TREASURY_WITHDRAWAL', actor: treasuryAddr, ... }
  // up to 50 events
]);
```

---

## Best Practices

### 1. Event Metadata
Always include relevant metadata as JSON:

```typescript
// Good:
{
  proposalId: "123",
  title: "Add feature",
  description: "Implementation details",
  votingPeriod: 86400
}

// Avoid large unstructured data
```

### 2. Subscription Management
Optimize subscriptions for user performance:

```typescript
// Subscribe to specific types instead of all
await manager.subscribeToMultiple(user, [
  'PROPOSAL_CREATED',
  'PROPOSAL_EXECUTED'
]);

// Not:
await manager.subscribeToAll(user);  // Less efficient
```

### 3. Event Querying
Use filters to minimize result sets:

```typescript
// Good: Filtered query
const recentVotes = await manager.getEvents({
  eventTypes: ['VOTE_CAST'],
  actor: userAddr,
  startDate: oneMonthAgo,
  limit: 50
});

// Avoid: Large unfiltered queries
const allEvents = await manager.getEvents();
```

### 4. Regular Cleanup
Periodically cleanup expired events:

```typescript
// Schedule regular cleanup (e.g., monthly)
async function scheduledCleanup() {
  const removed = await manager.cleanupExpiredEvents(365);
  console.log(`Cleaned up ${removed} expired events`);
}
```

---

## Error Handling

The system throws descriptive errors:

```typescript
try {
  await manager.emitEvent('INVALID_TYPE', userAddr);
} catch (error) {
  if (error.message.includes('Unsupported event type')) {
    // Handle invalid event type
  }
}

try {
  await manager.emitEvent(validType, userAddr);
} catch (error) {
  if (error.message.includes('not authorized')) {
    // User not authorized to emit
  }
}

try {
  await manager.emitEvent(validType, userAddr);
} catch (error) {
  if (error.message.includes('paused')) {
    // Contract is temporarily paused
  }
}
```

---

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test tests/notification/NotificationManager.test.ts

# Run specific test suite
npm test -- --testNamePattern="Event Emission"

# Run with coverage
npm test -- --coverage
```

Test coverage includes:
- ✅ Event emission and storage
- ✅ Subscription management
- ✅ Event filtering and retrieval
- ✅ Notifications
- ✅ Pause/unpause
- ✅ Authorization
- ✅ Edge cases and error handling

---

## Performance Considerations

### Query Performance
- **By Type**: O(1) with index lookup
- **By Actor**: O(1) with index lookup  
- **By Date Range**: O(n) bucket scan, typically fast
- **Combined Filters**: O(n) iteration through index results

### Storage Efficiency
- Average event size: ~500 bytes (with metadata)
- 1 year retention: ~180KB for 365 daily events
- Scales efficiently with batch operations

### Gas Costs
- Event emission: ~50,000-80,000 gas per event
- Batch operations: ~30,000-40,000 gas per event in batch
- Subscription changes: ~20,000-30,000 gas

---

## Troubleshooting

### Events not appearing
1. Check if event type is valid: `await manager.getEventTypes()`
2. Verify emitter is authorized: `manager.getAuthorizedEmitters()`
3. Check if contract is paused: `await manager.isPaused()`

### Notifications not received
1. Verify subscription: `await manager.isSubscribed(user, eventType)`
2. Check listener registration: `manager.on('event', callback)`
3. Verify user address format (must be lowercase)

### Query timeout
1. Reduce query limit
2. Add more specific filters
3. Check if cleanup is needed: `await manager.getStorageStats()`

---

## Support & Updates

For issues, questions, or suggestions:
- Review test cases in `NotificationManager.test.ts`
- Check event type definitions in `EventStructure.ts`
- Refer to library functions in `EventLib.ts`

---

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Status**: Production Ready ✅

