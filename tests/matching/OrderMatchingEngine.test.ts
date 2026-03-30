import { OrderMatchingEngine } from '../contracts/matching/OrderMatchingEngine';
import { 
  OrderType, 
  OrderStatus, 
  EnergyQuality, 
  Location, 
  MatchingConfig,
  MatchingPriority,
  DEFAULT_MATCHING_CONFIG
} from '../contracts/matching/interfaces/IMatchingEngine';
import { MatchingLib } from '../contracts/matching/libraries/MatchingLib';
import { DoubleAuction } from '../contracts/matching/algorithms/DoubleAuction';
import { OrderBook } from '../contracts/matching/structures/OrderBook';

describe('OrderMatchingEngine', () => {
  let engine: OrderMatchingEngine;
  let admin: string;
  let trader1: string;
  let trader2: string;
  let trader3: string;

  beforeEach(() => {
    admin = '0xAdmin';
    trader1 = '0xTrader1';
    trader2 = '0xTrader2';
    trader3 = '0xTrader3';
    
    engine = new OrderMatchingEngine(admin);
  });

  describe('Initialization', () => {
    it('should initialize with correct default configuration', () => {
      const config = engine.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.priority).toBe(MatchingPriority.HYBRID);
      expect(config.matchingFeeRate).toBe(10); // 0.1%
    });

    it('should start with empty order book', () => {
      const orderBook = engine.getOrderBook();
      expect(orderBook.bids.length).toBe(0);
      expect(orderBook.asks.length).toBe(0);
    });

    it('should initialize statistics correctly', () => {
      const stats = engine.getStatistics();
      expect(stats.totalOrders).toBe(0);
      expect(stats.totalMatches).toBe(0);
      expect(stats.totalVolume).toBe(0);
    });
  });

  describe('Order Creation', () => {
    const location: Location = {
      latitude: 52.5200,
      longitude: 13.4050,
      region: 'Berlin',
      country: 'Germany'
    };

    it('should create a valid buy order', () => {
      const orderId = engine.createOrder(
        trader1,
        OrderType.BUY,
        100,
        50,
        location,
        EnergyQuality.STANDARD,
        Date.now() + 3600000 // 1 hour from now
      );

      expect(orderId).toBeDefined();
      expect(orderId).toContain(trader1);

      const orderBook = engine.getOrderBook();
      expect(orderBook.bids.length).toBe(1);
      expect(orderBook.asks.length).toBe(0);
    });

    it('should create a valid sell order', () => {
      const orderId = engine.createOrder(
        trader2,
        OrderType.SELL,
        100,
        50,
        location,
        EnergyQuality.PREMIUM,
        Date.now() + 3600000
      );

      expect(orderId).toBeDefined();
      expect(orderId).toContain(trader2);

      const orderBook = engine.getOrderBook();
      expect(orderBook.bids.length).toBe(0);
      expect(orderBook.asks.length).toBe(1);
    });

    it('should reject orders with invalid parameters', () => {
      expect(() => {
        engine.createOrder(
          '',
          OrderType.BUY,
          100,
          50,
          location,
          EnergyQuality.STANDARD,
          Date.now() + 3600000
        );
      }).toThrow('Invalid trader address');

      expect(() => {
        engine.createOrder(
          trader1,
          OrderType.BUY,
          -100,
          50,
          location,
          EnergyQuality.STANDARD,
          Date.now() + 3600000
        );
      }).toThrow('Invalid amount');
    });

    it('should emit OrderCreated event', () => {
      const events = [];
      engine.onOrderCreated = (event) => events.push(event);

      engine.createOrder(
        trader1,
        OrderType.BUY,
        100,
        50,
        location,
        EnergyQuality.STANDARD,
        Date.now() + 3600000
      );

      expect(events.length).toBe(1);
      expect(events[0].trader).toBe(trader1);
      expect(events[0].type).toBe(OrderType.BUY);
      expect(events[0].amount).toBe(100);
    });
  });

  describe('Order Cancellation', () => {
    let orderId: string;
    const location: Location = {
      latitude: 52.5200,
      longitude: 13.4050,
      region: 'Berlin',
      country: 'Germany'
    };

    beforeEach(() => {
      orderId = engine.createOrder(
        trader1,
        OrderType.BUY,
        100,
        50,
        location,
        EnergyQuality.STANDARD,
        Date.now() + 3600000
      );
    });

    it('should allow trader to cancel their own order', () => {
      const result = engine.cancelOrder(orderId, trader1);
      expect(result).toBe(true);

      const orders = engine.getOrdersByTrader(trader1);
      expect(orders[0].status).toBe(OrderStatus.CANCELLED);
    });

    it('should allow admin to cancel any order', () => {
      const result = engine.cancelOrder(orderId, admin);
      expect(result).toBe(true);

      const orders = engine.getOrdersByTrader(trader1);
      expect(orders[0].status).toBe(OrderStatus.CANCELLED);
    });

    it('should reject cancellation by unauthorized trader', () => {
      expect(() => {
        engine.cancelOrder(orderId, trader2);
      }).toThrow('INSUFFICIENT_PERMISSIONS');
    });

    it('should emit OrderCancelled event', () => {
      const events = [];
      engine.onOrderCancelled = (event) => events.push(event);

      engine.cancelOrder(orderId, trader1);

      expect(events.length).toBe(1);
      expect(events[0].orderId).toBe(orderId);
      expect(events[0].trader).toBe(trader1);
    });
  });

  describe('Order Matching', () => {
    let buyOrderId: string;
    let sellOrderId: string;
    const location: Location = {
      latitude: 52.5200,
      longitude: 13.4050,
      region: 'Berlin',
      country: 'Germany'
    };

    beforeEach(() => {
      // Create matching buy and sell orders
      buyOrderId = engine.createOrder(
        trader1,
        OrderType.BUY,
        100,
        60, // Higher price
        location,
        EnergyQuality.STANDARD,
        Date.now() + 3600000
      );

      sellOrderId = engine.createOrder(
        trader2,
        OrderType.SELL,
        100,
        50, // Lower price
        location,
        EnergyQuality.STANDARD,
        Date.now() + 3600000
      );
    });

    it('should match compatible orders', () => {
      const matches = engine.matchSingleOrder(buyOrderId);
      expect(matches.length).toBe(1);
      expect(matches[0].amount).toBe(100);
      expect(matches[0].price).toBe(50); // Sell price (maker price)
    });

    it('should update order statuses after matching', () => {
      engine.matchSingleOrder(buyOrderId);

      const buyOrder = engine.getOrdersByTrader(trader1)[0];
      const sellOrder = engine.getOrdersByTrader(trader2)[0];

      expect(buyOrder.status).toBe(OrderStatus.FILLED);
      expect(sellOrder.status).toBe(OrderStatus.FILLED);
      expect(buyOrder.filledAmount).toBe(100);
      expect(sellOrder.filledAmount).toBe(100);
    });

    it('should handle partial fills', () => {
      // Create orders with different amounts
      const partialBuyId = engine.createOrder(
        trader3,
        OrderType.BUY,
        150,
        60,
        location,
        EnergyQuality.STANDARD,
        Date.now() + 3600000
      );

      const matches = engine.matchSingleOrder(partialBuyId);
      expect(matches.length).toBe(1);
      expect(matches[0].amount).toBe(100); // Only 100 available to match

      const buyOrder = engine.getOrdersByTrader(trader3)[0];
      expect(buyOrder.status).toBe(OrderStatus.PARTIALLY_FILLED);
      expect(buyOrder.filledAmount).toBe(100);
    });

    it('should emit MatchExecuted event', () => {
      const events = [];
      engine.onMatchExecuted = (event) => events.push(event);

      engine.matchSingleOrder(buyOrderId);

      expect(events.length).toBe(1);
      expect(events[0].buyOrderId).toBe(buyOrderId);
      expect(events[0].sellOrderId).toBe(sellOrderId);
      expect(events[0].amount).toBe(100);
    });
  });

  describe('Batch Matching', () => {
    const location: Location = {
      latitude: 52.5200,
      longitude: 13.4050,
      region: 'Berlin',
      country: 'Germany'
    };

    it('should match multiple orders in batch', () => {
      const orderIds: string[] = [];

      // Create multiple orders
      orderIds.push(engine.createOrder(trader1, OrderType.BUY, 100, 60, location, EnergyQuality.STANDARD, Date.now() + 3600000));
      orderIds.push(engine.createOrder(trader2, OrderType.SELL, 100, 50, location, EnergyQuality.STANDARD, Date.now() + 3600000));
      orderIds.push(engine.createOrder(trader3, OrderType.BUY, 80, 55, location, EnergyQuality.PREMIUM, Date.now() + 3600000));

      const result = engine.matchBatch(orderIds);

      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.totalMatchedAmount).toBeGreaterThan(0);
    });

    it('should emit BatchMatchingCompleted event', () => {
      const events = [];
      engine.onBatchMatchingCompleted = (event) => events.push(event);

      const orderIds: string[] = [];
      orderIds.push(engine.createOrder(trader1, OrderType.BUY, 100, 60, location, EnergyQuality.STANDARD, Date.now() + 3600000));
      orderIds.push(engine.createOrder(trader2, OrderType.SELL, 100, 50, location, EnergyQuality.STANDARD, Date.now() + 3600000));

      engine.matchBatch(orderIds);

      expect(events.length).toBe(1);
      expect(events[0].matchesCount).toBeGreaterThan(0);
    });
  });

  describe('Continuous Matching', () => {
    const location: Location = {
      latitude: 52.5200,
      longitude: 13.4050,
      region: 'Berlin',
      country: 'Germany'
    };

    it('should run continuous matching on all orders', () => {
      // Create multiple orders
      engine.createOrder(trader1, OrderType.BUY, 100, 60, location, EnergyQuality.STANDARD, Date.now() + 3600000);
      engine.createOrder(trader2, OrderType.SELL, 100, 50, location, EnergyQuality.STANDARD, Date.now() + 3600000);
      engine.createOrder(trader3, OrderType.BUY, 80, 55, location, EnergyQuality.PREMIUM, Date.now() + 3600000);
      engine.createOrder('0xTrader4', OrderType.SELL, 80, 45, location, EnergyQuality.PREMIUM, Date.now() + 3600000);

      const result = engine.runContinuousMatching();

      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.totalMatchedAmount).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    it('should allow admin to update configuration', () => {
      const newConfig: Partial<MatchingConfig> = {
        matchingFeeRate: 20, // 0.2%
        maxDistance: 1000
      };

      const result = engine.updateConfig(newConfig, admin);
      expect(result).toBe(true);

      const config = engine.getConfig();
      expect(config.matchingFeeRate).toBe(20);
      expect(config.maxDistance).toBe(1000);
    });

    it('should reject configuration updates from non-admin', () => {
      expect(() => {
        engine.updateConfig({ matchingFeeRate: 20 }, trader1);
      }).toThrow('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate configuration parameters', () => {
      expect(() => {
        engine.updateConfig({ matchingFeeRate: -10 }, admin);
      }).toThrow('Invalid matching fee rate');

      expect(() => {
        engine.updateConfig({ maxDistance: -100 }, admin);
      }).toThrow('Invalid max distance');
    });
  });

  describe('Geographic and Quality Preferences', () => {
    it('should set geographic preferences for trader', () => {
      const preferences = [
        {
          region: 'Berlin',
          priority: 10,
          maxDistance: 100
        }
      ];

      const result = engine.setGeographicPreference(trader1, preferences, trader1);
      expect(result).toBe(true);
    });

    it('should set quality preferences for trader', () => {
      const preferences = [
        {
          quality: EnergyQuality.GREEN,
          minScore: 80,
          premium: 10
        }
      ];

      const result = engine.setQualityPreference(trader1, preferences, trader1);
      expect(result).toBe(true);
    });

    it('should reject preference updates from unauthorized users', () => {
      const preferences = [{ region: 'Berlin', priority: 10, maxDistance: 100 }];

      expect(() => {
        engine.setGeographicPreference(trader1, preferences, trader2);
      }).toThrow('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Statistics and Analytics', () => {
    const location: Location = {
      latitude: 52.5200,
      longitude: 13.4050,
      region: 'Berlin',
      country: 'Germany'
    };

    it('should track order statistics', () => {
      engine.createOrder(trader1, OrderType.BUY, 100, 60, location, EnergyQuality.STANDARD, Date.now() + 3600000);
      engine.createOrder(trader2, OrderType.SELL, 100, 50, location, EnergyQuality.STANDARD, Date.now() + 3600000);

      const stats = engine.getStatistics();
      expect(stats.totalOrders).toBe(2);
    });

    it('should track match statistics', () => {
      const buyOrderId = engine.createOrder(trader1, OrderType.BUY, 100, 60, location, EnergyQuality.STANDARD, Date.now() + 3600000);
      const sellOrderId = engine.createOrder(trader2, OrderType.SELL, 100, 50, location, EnergyQuality.STANDARD, Date.now() + 3600000);

      engine.matchSingleOrder(buyOrderId);

      const stats = engine.getStatistics();
      expect(stats.totalMatches).toBe(1);
      expect(stats.totalVolume).toBe(100);
    });

    it('should provide market statistics', () => {
      engine.createOrder(trader1, OrderType.BUY, 100, 60, location, EnergyQuality.STANDARD, Date.now() + 3600000);
      engine.createOrder(trader2, OrderType.SELL, 100, 50, location, EnergyQuality.STANDARD, Date.now() + 3600000);

      const marketStats = engine.getMarketStatistics();
      expect(marketStats.bestBid).toBe(60);
      expect(marketStats.bestAsk).toBe(50);
      expect(marketStats.spread).toBe(10);
    });
  });

  describe('Admin Functions', () => {
    it('should allow admin to pause and unpause', () => {
      expect(engine.pause(admin)).toBe(true);
      
      // Should throw when paused
      expect(() => {
        engine.createOrder(trader1, OrderType.BUY, 100, 50, {
          latitude: 52.5200,
          longitude: 13.4050,
          region: 'Berlin',
          country: 'Germany'
        }, EnergyQuality.STANDARD, Date.now() + 3600000);
      }).toThrow('Matching engine is paused');

      expect(engine.unpause(admin)).toBe(true);
    });

    it('should allow emergency cancellation of all orders', () => {
      const location = {
        latitude: 52.5200,
        longitude: 13.4050,
        region: 'Berlin',
        country: 'Germany'
      };

      engine.createOrder(trader1, OrderType.BUY, 100, 60, location, EnergyQuality.STANDARD, Date.now() + 3600000);
      engine.createOrder(trader2, OrderType.SELL, 100, 50, location, EnergyQuality.STANDARD, Date.now() + 3600000);

      const result = engine.emergencyCancelAll('Test emergency', admin);
      expect(result).toBe(true);

      const orderBook = engine.getOrderBook();
      expect(orderBook.bids.length).toBe(0);
      expect(orderBook.asks.length).toBe(0);
    });
  });

  describe('Fee Calculation', () => {
    it('should calculate matching fees correctly', () => {
      const fee = engine.calculateMatchingFee(100, 50); // 100 units at 50 price each
      expect(fee).toBe(5); // 100 * 50 * 10 / 10000 = 5
    });

    it('should distribute fees correctly', () => {
      const result = engine.distributeMatchingFees(100);
      expect(result).toBe(true);

      const stats = engine.getStatistics();
      expect(stats.totalMatchingFees).toBe(100);
    });
  });
});

describe('MatchingLib', () => {
  describe('Distance Calculation', () => {
    it('should calculate distance between two locations', () => {
      const loc1 = { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' };
      const loc2 = { latitude: 48.8566, longitude: 2.3522, region: 'Paris', country: 'France' };

      const distance = MatchingLib.calculateDistance(loc1, loc2);
      expect(distance).toBeGreaterThan(800); // Berlin to Paris is ~878 km
      expect(distance).toBeLessThan(1000);
    });

    it('should return zero distance for same location', () => {
      const location = { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' };
      
      const distance = MatchingLib.calculateDistance(location, location);
      expect(distance).toBe(0);
    });
  });

  describe('Quality Scoring', () => {
    it('should give perfect score for equal or better quality', () => {
      expect(MatchingLib.calculateQualityScore(EnergyQuality.STANDARD, EnergyQuality.STANDARD)).toBe(100);
      expect(MatchingLib.calculateQualityScore(EnergyQuality.STANDARD, EnergyQuality.PREMIUM)).toBe(100);
      expect(MatchingLib.calculateQualityScore(EnergyQuality.STANDARD, EnergyQuality.PREMIUM_GREEN)).toBe(100);
    });

    it('should penalize lower quality offerings', () => {
      expect(MatchingLib.calculateQualityScore(EnergyQuality.PREMIUM, EnergyQuality.STANDARD)).toBe(75);
      expect(MatchingLib.calculateQualityScore(EnergyQuality.PREMIUM_GREEN, EnergyQuality.STANDARD)).toBe(25);
    });
  });

  describe('Price Scoring', () => {
    it('should give high score for tight spreads', () => {
      const score = MatchingLib.calculatePriceScore(51, 50); // 2% spread
      expect(score).toBeGreaterThan(90);
    });

    it('should give zero score for non-matching prices', () => {
      const score = MatchingLib.calculatePriceScore(49, 50); // Below ask price
      expect(score).toBe(0);
    });
  });

  describe('Order Validation', () => {
    it('should validate correct orders', () => {
      const order = {
        trader: '0xTrader',
        type: OrderType.BUY,
        amount: 100,
        price: 50,
        location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
        quality: EnergyQuality.STANDARD,
        expiresAt: Date.now() + 3600000
      };

      const validation = MatchingLib.validateOrder(order);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect invalid orders', () => {
      const order = {
        trader: '',
        type: OrderType.BUY,
        amount: -100,
        price: 50,
        location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
        quality: EnergyQuality.STANDARD,
        expiresAt: Date.now() - 3600000 // Expired
      };

      const validation = MatchingLib.validateOrder(order);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('DoubleAuction', () => {
  describe('Market Statistics', () => {
    it('should calculate market statistics correctly', () => {
      const buyOrders = [
        {
          id: 'buy1',
          trader: 'trader1',
          type: OrderType.BUY,
          amount: 100,
          price: 60,
          location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
          quality: EnergyQuality.STANDARD,
          status: OrderStatus.PENDING,
          filledAmount: 0,
          createdAt: Date.now(),
          expiresAt: Date.now() + 3600000
        }
      ];

      const sellOrders = [
        {
          id: 'sell1',
          trader: 'trader2',
          type: OrderType.SELL,
          amount: 100,
          price: 50,
          location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
          quality: EnergyQuality.STANDARD,
          status: OrderStatus.PENDING,
          filledAmount: 0,
          createdAt: Date.now(),
          expiresAt: Date.now() + 3600000
        }
      ];

      const stats = DoubleAuction.calculateMarketStatistics(buyOrders, sellOrders);
      expect(stats.bestBid).toBe(60);
      expect(stats.bestAsk).toBe(50);
      expect(stats.spread).toBe(10);
      expect(stats.midPrice).toBe(55);
    });
  });

  describe('Price Impact Simulation', () => {
    it('should simulate price impact for large orders', () => {
      const orderBook = [
        {
          id: 'sell1',
          trader: 'trader2',
          type: OrderType.SELL,
          amount: 100,
          price: 50,
          location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
          quality: EnergyQuality.STANDARD,
          status: OrderStatus.PENDING,
          filledAmount: 0,
          createdAt: Date.now(),
          expiresAt: Date.now() + 3600000
        },
        {
          id: 'sell2',
          trader: 'trader3',
          type: OrderType.SELL,
          amount: 100,
          price: 55,
          location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
          quality: EnergyQuality.STANDARD,
          status: OrderStatus.PENDING,
          filledAmount: 0,
          createdAt: Date.now(),
          expiresAt: Date.now() + 3600000
        }
      ];

      const order = {
        id: 'buy1',
        trader: 'trader1',
        type: OrderType.BUY,
        amount: 150,
        price: 60,
        location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
        quality: EnergyQuality.STANDARD,
        status: OrderStatus.PENDING,
        filledAmount: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000
      };

      const impact = DoubleAuction.simulatePriceImpact(order, orderBook, DEFAULT_MATCHING_CONFIG);
      expect(impact.estimatedPrice).toBeGreaterThan(50);
      expect(impact.fillProbability).toBeGreaterThan(0);
    });
  });

  describe('Market Manipulation Detection', () => {
    it('should detect suspicious trading patterns', () => {
      const orders = [
        {
          id: 'large1',
          trader: 'trader1',
          type: OrderType.BUY,
          amount: 100000, // Unusually large
          price: 50,
          location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
          quality: EnergyQuality.STANDARD,
          status: OrderStatus.CANCELLED,
          filledAmount: 0,
          createdAt: Date.now() - 1000, // Cancelled quickly
          expiresAt: Date.now() + 3600000
        }
      ];

      const detection = DoubleAuction.detectMarketManipulation(orders);
      expect(detection.reasons.length).toBeGreaterThan(0);
      expect(detection.confidence).toBeGreaterThan(0);
    });
  });
});

describe('OrderBook', () => {
  let orderBook: OrderBook;

  beforeEach(() => {
    orderBook = new OrderBook();
  });

  describe('Order Management', () => {
    it('should add and remove orders correctly', () => {
      const order = {
        id: 'order1',
        trader: 'trader1',
        type: OrderType.BUY,
        amount: 100,
        price: 50,
        location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
        quality: EnergyQuality.STANDARD,
        status: OrderStatus.PENDING,
        filledAmount: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000
      };

      expect(orderBook.addOrder(order)).toBe(true);
      expect(orderBook.getOrder('order1')).toBeDefined();

      expect(orderBook.removeOrder('order1')).toBe(true);
      expect(orderBook.getOrder('order1')).toBeUndefined();
    });

    it('should maintain sorted order book', () => {
      const order1 = {
        id: 'order1',
        trader: 'trader1',
        type: OrderType.BUY,
        amount: 100,
        price: 60, // Higher price
        location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
        quality: EnergyQuality.STANDARD,
        status: OrderStatus.PENDING,
        filledAmount: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000
      };

      const order2 = {
        id: 'order2',
        trader: 'trader2',
        type: OrderType.BUY,
        amount: 100,
        price: 50, // Lower price
        location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
        quality: EnergyQuality.STANDARD,
        status: OrderStatus.PENDING,
        filledAmount: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000
      };

      orderBook.addOrder(order2);
      orderBook.addOrder(order1);

      // For buy orders, higher price should come first
      expect(orderBook.bids[0].price).toBe(60);
      expect(orderBook.bids[1].price).toBe(50);
    });
  });

  describe('Market Depth', () => {
    it('should calculate market depth correctly', () => {
      const order1 = {
        id: 'order1',
        trader: 'trader1',
        type: OrderType.BUY,
        amount: 100,
        price: 50,
        location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
        quality: EnergyQuality.STANDARD,
        status: OrderStatus.PENDING,
        filledAmount: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000
      };

      const order2 = {
        id: 'order2',
        trader: 'trader2',
        type: OrderType.BUY,
        amount: 50,
        price: 50,
        location: { latitude: 52.5200, longitude: 13.4050, region: 'Berlin', country: 'Germany' },
        quality: EnergyQuality.STANDARD,
        status: OrderStatus.PENDING,
        filledAmount: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000
      };

      orderBook.addOrder(order1);
      orderBook.addOrder(order2);

      const depth = orderBook.getMarketDepth(OrderType.BUY, 5);
      expect(depth[0].price).toBe(50);
      expect(depth[0].amount).toBe(150); // 100 + 50
      expect(depth[0].count).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should calculate order book statistics correctly', () => {
      const stats = orderBook.getStatistics();
      expect(stats.totalOrders).toBe(0);
      expect(stats.buyOrders).toBe(0);
      expect(stats.sellOrders).toBe(0);
      expect(stats.totalVolume).toBe(0);
    });
  });
});
