# Order Matching Engine Documentation

## Overview

The Order Matching Engine is an intelligent on-chain system designed to facilitate efficient energy trading by automatically matching buy and sell orders based on multiple criteria including price, quantity, geographic location, and energy quality preferences.

## Architecture

### Core Components

1. **IMatchingEngine Interface** - Defines the contract interface and data structures
2. **OrderMatchingEngine** - Main contract implementing the matching logic
3. **MatchingLib** - Library containing core matching algorithms and utility functions
4. **DoubleAuction** - Continuous double auction matching algorithm implementation
5. **OrderBook** - Data structure for managing orders and market depth

### Key Features

- **Continuous Double Auction**: Real-time order matching with price-time priority
- **Geographic Matching**: Prioritizes local energy trades based on distance
- **Quality-Based Matching**: Matches orders based on energy quality preferences
- **Partial Order Fulfillment**: Handles quantity mismatches efficiently
- **Batch Processing**: Optimized for high-frequency trading (1000+ orders per block)
- **Gas Optimization**: Efficient algorithms to minimize transaction costs
- **Market Manipulation Detection**: Built-in safeguards against unfair trading practices

## Installation and Deployment

### Prerequisites

- Node.js >= 16.0.0
- Hardhat framework
- TypeScript

### Deployment

1. **Deploy the matching engine**:
```bash
npm run deploy deploy
```

2. **Verify on Etherscan**:
```bash
npm run deploy verify <contract-address>
```

3. **Run performance tests**:
```bash
npm run deploy test
```

### Configuration

The matching engine can be configured with the following parameters:

```typescript
interface MatchingConfig {
  enabled: boolean;           // Enable/disable matching
  priority: MatchingPriority; // Matching priority strategy
  maxDistance: number;        // Maximum distance for geographic matching (km)
  qualityWeight: number;      // Weight for quality scoring (0-100)
  distanceWeight: number;     // Weight for distance scoring (0-100)
  priceWeight: number;        // Weight for price scoring (0-100)
  matchingFeeRate: number;    // Matching fee rate in basis points
  minOrderAmount: number;     // Minimum order amount
  maxOrderAmount: number;     // Maximum order amount
  batchProcessingSize: number; // Batch size for processing
  priceTolerance: number;     // Price tolerance percentage
}
```

## Usage Guide

### Creating Orders

#### Buy Order
```typescript
const buyOrderId = await matchingEngine.createOrder(
  traderAddress,              // Trader's wallet address
  OrderType.BUY,              // Order type
  1000,                       // Amount of energy (kWh)
  ethers.utils.parseUnits('50', 18), // Price per unit
  {
    latitude: 52.5200,
    longitude: 13.4050,
    region: 'Berlin',
    country: 'Germany'
  },                          // Location
  EnergyQuality.STANDARD,     // Energy quality
  Math.floor(Date.now() / 1000) + 3600, // Expiration time
  100,                        // Minimum fill amount
  5,                          // Maximum price slippage (%)
  ['Berlin', 'Hamburg'],      // Preferred regions
  [EnergyQuality.STANDARD, EnergyQuality.GREEN] // Quality preferences
);
```

#### Sell Order
```typescript
const sellOrderId = await matchingEngine.createOrder(
  traderAddress,
  OrderType.SELL,
  1000,
  ethers.utils.parseUnits('48', 18),
  location,
  EnergyQuality.PREMIUM,
  expirationTime,
  100,
  5,
  ['Berlin', 'Munich'],
  [EnergyQuality.PREMIUM, EnergyQuality.PREMIUM_GREEN]
);
```

### Order Management

#### Cancel Order
```typescript
await matchingEngine.cancelOrder(orderId, traderAddress);
```

#### Update Order
```typescript
await matchingEngine.updateOrder(
  orderId,
  undefined,                  // New amount (optional)
  ethers.utils.parseUnits('52', 18), // New price (optional)
  newExpirationTime,          // New expiration (optional)
  traderAddress
);
```

### Matching Operations

#### Single Order Matching
```typescript
const matches = await matchingEngine.matchSingleOrder(orderId);
```

#### Batch Matching
```typescript
const result = await matchingEngine.matchBatch([orderId1, orderId2, orderId3]);
```

#### Continuous Matching
```typescript
const result = await matchingEngine.runContinuousMatching();
```

### Setting Preferences

#### Geographic Preferences
```typescript
await matchingEngine.setGeographicPreference(
  traderAddress,
  [
    {
      region: 'Berlin',
      priority: 10,
      maxDistance: 100
    },
    {
      region: 'Hamburg',
      priority: 8,
      maxDistance: 300
    }
  ],
  traderAddress
);
```

#### Quality Preferences
```typescript
await matchingEngine.setQualityPreference(
  traderAddress,
  [
    {
      quality: EnergyQuality.GREEN,
      minScore: 80,
      premium: 10
    },
    {
      quality: EnergyQuality.PREMIUM_GREEN,
      minScore: 90,
      premium: 15
    }
  ],
  traderAddress
);
```

## Matching Algorithm

### Double Auction Mechanism

The matching engine uses a continuous double auction algorithm with the following priority:

1. **Price-Time Priority**: Higher bids and lower asks are matched first
2. **Geographic Proximity**: Closer locations get priority based on configuration
3. **Quality Preferences**: Higher quality energy gets preference
4. **Time Priority**: Earlier orders get preference when other factors are equal

### Scoring System

Each potential match is scored based on:

- **Price Score**: Based on spread between bid and ask prices
- **Distance Score**: Based on geographic proximity
- **Quality Score**: Based on energy quality compatibility
- **Overall Score**: Weighted combination of all factors

### Matching Process

1. **Order Validation**: Verify order parameters and expiration
2. **Compatibility Check**: Ensure orders can match based on basic criteria
3. **Score Calculation**: Calculate compatibility scores for all potential matches
4. **Ranking**: Rank matches by overall score
5. **Execution**: Execute matches in order of priority
6. **Settlement**: Update order statuses and process fees

## Data Structures

### Order Structure

```typescript
interface Order {
  id: string;                    // Unique order identifier
  trader: string;                // Trader's wallet address
  type: OrderType;              // BUY or SELL
  amount: number;               // Order amount
  price: number;                // Price per unit
  location: Location;          // Geographic location
  quality: EnergyQuality;      // Energy quality
  status: OrderStatus;          // Current order status
  filledAmount: number;         // Amount already filled
  createdAt: number;            // Creation timestamp
  expiresAt: number;            // Expiration timestamp
  minFillAmount?: number;       // Minimum fill amount
  maxPriceSlippage?: number;    // Maximum price slippage percentage
  preferredRegions?: string[];  // Preferred trading regions
  qualityPreferences?: EnergyQuality[]; // Quality preferences
}
```

### Match Structure

```typescript
interface Match {
  id: string;                   // Unique match identifier
  buyOrderId: string;          // Buy order ID
  sellOrderId: string;         // Sell order ID
  amount: number;               // Matched amount
  price: number;                // Execution price
  timestamp: number;            // Match timestamp
  matchingFee: number;          // Matching fee amount
  qualityScore: number;         // Quality compatibility score
  distanceScore: number;        // Geographic compatibility score
  priceScore: number;           // Price compatibility score
}
```

## Events

The matching engine emits the following events:

### Order Events

- **OrderCreated**: New order created
- **OrderUpdated**: Order parameters updated
- **OrderCancelled**: Order cancelled

### Matching Events

- **MatchExecuted**: Order match executed
- **BatchMatchingCompleted**: Batch matching completed

### System Events

- **EnginePaused**: Matching engine paused
- **EngineUnpaused**: Matching engine unpaused
- **EmergencyModeActivated**: Emergency mode activated

## Performance Optimization

### Gas Efficiency

The matching engine is optimized for gas efficiency through:

- **Batch Processing**: Multiple orders processed in single transactions
- **Efficient Data Structures**: Optimized order book implementation
- **Lazy Evaluation**: Calculations performed only when needed
- **Event Batching**: Multiple events emitted together

### Performance Metrics

The system is designed to handle:

- **1000+ orders per block**: High-frequency trading capability
- **Sub-second matching**: Fast order execution
- **Low gas costs**: Optimized for minimal transaction fees
- **Scalable architecture**: Handles increasing order volumes

## Security Features

### Access Control

- **Role-based permissions**: Different access levels for different functions
- **Admin controls**: Administrative functions protected by special permissions
- **Trader validation**: Only traders can manage their own orders

### Market Integrity

- **Manipulation detection**: Algorithms detect suspicious trading patterns
- **Price limits**: Built-in safeguards against extreme price movements
- **Order validation**: Comprehensive validation of all order parameters

### Emergency Functions

- **Emergency pause**: Ability to pause matching in emergency situations
- **Mass cancellation**: Emergency cancellation of all orders
- **Configuration overrides**: Admin can override settings in emergencies

## Integration Examples

### Frontend Integration

```typescript
// React component example
const EnergyTrading = () => {
  const [matchingEngine, setMatchingEngine] = useState(null);
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    const initEngine = async () => {
      const engine = new OrderMatchingEngine(adminAddress);
      setMatchingEngine(engine);
    };
    initEngine();
  }, []);
  
  const createBuyOrder = async (amount, price, location) => {
    if (!matchingEngine) return;
    
    const orderId = await matchingEngine.createOrder(
      userAddress,
      OrderType.BUY,
      amount,
      price,
      location,
      EnergyQuality.STANDARD,
      Date.now() + 3600000
    );
    
    setOrders(prev => [...prev, orderId]);
  };
  
  return (
    <div>
      {/* Trading interface */}
    </div>
  );
};
```

### Backend Integration

```typescript
// Node.js backend example
app.post('/api/orders', async (req, res) => {
  try {
    const { trader, type, amount, price, location, quality } = req.body;
    
    const orderId = await matchingEngine.createOrder(
      trader,
      type,
      amount,
      price,
      location,
      quality,
      Date.now() + 3600000
    );
    
    res.json({ orderId, success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/orderbook', async (req, res) => {
  const orderBook = await matchingEngine.getOrderBook();
  res.json(orderBook);
});
```

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
npm test
```

### Performance Tests

Test system performance under load:

```bash
npm run deploy test
```

### Integration Tests

Test full integration with other contracts:

```bash
npm run test:integration
```

## Troubleshooting

### Common Issues

1. **Order Not Matching**: Check price compatibility and geographic constraints
2. **High Gas Costs**: Consider using batch processing for multiple orders
3. **Slow Performance**: Verify configuration parameters and network conditions

### Debug Mode

Enable debug logging:

```typescript
const engine = new OrderMatchingEngine(adminAddress);
engine.setDebugMode(true);
```

### Monitoring

Monitor system health:

```typescript
const stats = await matchingEngine.getStatistics();
console.log('Total Orders:', stats.totalOrders);
console.log('Total Matches:', stats.totalMatches);
console.log('Average Match Time:', stats.averageMatchingTime);
```

## API Reference

### Core Methods

- `createOrder()`: Create a new order
- `cancelOrder()`: Cancel an existing order
- `updateOrder()`: Update order parameters
- `matchSingleOrder()`: Match a single order
- `matchBatch()`: Match multiple orders
- `runContinuousMatching()`: Run continuous matching

### Query Methods

- `getOrderBook()`: Get current order book
- `getOrdersByTrader()`: Get orders by trader
- `getOrdersByLocation()`: Get orders by location
- `getStatistics()`: Get matching statistics
- `getMarketStatistics()`: Get market statistics

### Admin Methods

- `updateConfig()`: Update matching configuration
- `pause()`: Pause matching engine
- `unpause()`: Unpause matching engine
- `emergencyCancelAll()`: Emergency cancel all orders

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build contracts: `npm run build`

### Code Style

- Follow TypeScript best practices
- Use comprehensive error handling
- Include unit tests for new features
- Document all public methods

### Pull Requests

1. Fork the repository
2. Create feature branch
3. Add tests and documentation
4. Submit pull request with description

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For support and questions:

- Create an issue in the GitHub repository
- Join the community Discord
- Check the documentation for common solutions

## Version History

### v1.0.0 (Current)
- Initial release
- Core matching functionality
- Geographic and quality preferences
- Performance optimizations
- Security features

### Future Releases
- Advanced matching algorithms
- Cross-chain compatibility
- Enhanced analytics
- Mobile app integration
