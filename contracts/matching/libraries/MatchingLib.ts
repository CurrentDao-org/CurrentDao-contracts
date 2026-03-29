import { 
  Order, 
  OrderType, 
  OrderStatus, 
  EnergyQuality, 
  Location, 
  Match, 
  OrderBookEntry,
  MatchingConfig,
  GeographicPreference,
  QualityPreference,
  MatchingPriority
} from '../interfaces/IMatchingEngine';

/**
 * @title MatchingLib
 * @dev Library containing core matching logic and utility functions
 */
export class MatchingLib {
  
  /**
   * @dev Calculate distance between two locations using Haversine formula
   */
  static calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.latitude)) * Math.cos(this.toRadians(loc2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * @dev Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * @dev Calculate quality compatibility score between requested and offered quality
   */
  static calculateQualityScore(requested: EnergyQuality, offered: EnergyQuality): number {
    const qualityHierarchy = {
      [EnergyQuality.STANDARD]: 1,
      [EnergyQuality.PREMIUM]: 2,
      [EnergyQuality.GREEN]: 3,
      [EnergyQuality.PREMIUM_GREEN]: 4
    };

    const requestedLevel = qualityHierarchy[requested];
    const offeredLevel = qualityHierarchy[offered];

    if (offeredLevel >= requestedLevel) {
      // Perfect match or better quality offered
      return 100;
    } else {
      // Lower quality offered - calculate penalty
      const qualityGap = requestedLevel - offeredLevel;
      return Math.max(0, 100 - (qualityGap * 25));
    }
  }

  /**
   * @dev Calculate price score based on how favorable the price is
   */
  static calculatePriceScore(bidPrice: number, askPrice: number): number {
    if (bidPrice >= askPrice) {
      // Price is acceptable, calculate score based on spread
      const spread = bidPrice - askPrice;
      const spreadPercentage = (spread / askPrice) * 100;
      
      // Higher score for tighter spreads
      return Math.max(0, 100 - spreadPercentage);
    } else {
      // Price doesn't match
      return 0;
    }
  }

  /**
   * @dev Calculate distance score based on geographic proximity
   */
  static calculateDistanceScore(distance: number, maxDistance: number): number {
    if (distance <= maxDistance) {
      // Linear decay from 100 to 0 based on distance
      return Math.max(0, 100 - (distance / maxDistance * 100));
    } else {
      return 0;
    }
  }

  /**
   * @dev Calculate overall matching score using weighted approach
   */
  static calculateOverallScore(
    priceScore: number,
    distanceScore: number,
    qualityScore: number,
    config: MatchingConfig
  ): number {
    const totalWeight = config.priceWeight + config.distanceWeight + config.qualityWeight;
    
    return (
      (priceScore * config.priceWeight / totalWeight) +
      (distanceScore * config.distanceWeight / totalWeight) +
      (qualityScore * config.qualityWeight / totalWeight)
    );
  }

  /**
   * @dev Check if two orders are compatible for matching
   */
  static areOrdersCompatible(
    buyOrder: Order,
    sellOrder: Order,
    config: MatchingConfig
  ): boolean {
    // Basic compatibility checks
    if (buyOrder.type !== OrderType.BUY || sellOrder.type !== OrderType.SELL) {
      return false;
    }

    if (buyOrder.status !== OrderStatus.PENDING && buyOrder.status !== OrderStatus.PARTIALLY_FILLED) {
      return false;
    }

    if (sellOrder.status !== OrderStatus.PENDING && sellOrder.status !== OrderStatus.PARTIALLY_FILLED) {
      return false;
    }

    // Price compatibility
    if (buyOrder.price < sellOrder.price) {
      return false;
    }

    // Quality compatibility
    const qualityScore = this.calculateQualityScore(buyOrder.quality, sellOrder.quality);
    if (qualityScore === 0) {
      return false;
    }

    // Geographic compatibility
    const distance = this.calculateDistance(buyOrder.location, sellOrder.location);
    if (distance > config.maxDistance) {
      return false;
    }

    // Amount compatibility
    const buyRemaining = buyOrder.amount - buyOrder.filledAmount;
    const sellRemaining = sellOrder.amount - sellOrder.filledAmount;
    
    if (buyRemaining < (buyOrder.minFillAmount || 1) || sellRemaining < (buyOrder.minFillAmount || 1)) {
      return false;
    }

    return true;
  }

  /**
   * @dev Calculate optimal match amount between two orders
   */
  static calculateMatchAmount(buyOrder: Order, sellOrder: Order): number {
    const buyRemaining = buyOrder.amount - buyOrder.filledAmount;
    const sellRemaining = sellOrder.amount - sellOrder.filledAmount;
    
    // Match the minimum of remaining amounts
    let matchAmount = Math.min(buyRemaining, sellRemaining);
    
    // Respect minimum fill amount
    const minFillAmount = buyOrder.minFillAmount || 1;
    if (matchAmount < minFillAmount) {
      return 0;
    }

    return matchAmount;
  }

  /**
   * @dev Calculate execution price for a match
   */
  static calculateExecutionPrice(buyOrder: Order, sellOrder: Order): number {
    // Use the sell order price (maker price) for execution
    // This follows the typical maker-taker model
    return sellOrder.price;
  }

  /**
   * @dev Calculate matching fee for a transaction
   */
  static calculateMatchingFee(amount: number, price: number, feeRate: number): number {
    const totalValue = amount * price;
    return (totalValue * feeRate) / 10000; // feeRate is in basis points
  }

  /**
   * @dev Sort orders by price-time priority
   */
  static sortOrdersByPriceTime(orders: Order[], type: OrderType): Order[] {
    return orders.sort((a, b) => {
      if (type === OrderType.BUY) {
        // Buy orders: higher price first, then earlier time
        if (b.price !== a.price) {
          return b.price - a.price;
        }
        return a.createdAt - b.createdAt;
      } else {
        // Sell orders: lower price first, then earlier time
        if (b.price !== a.price) {
          return a.price - b.price;
        }
        return a.createdAt - b.createdAt;
      }
    });
  }

  /**
   * @dev Sort orders by geographic proximity to a reference location
   */
  static sortOrdersByGeography(orders: Order[], referenceLocation: Location): Order[] {
    return orders.sort((a, b) => {
      const distanceA = this.calculateDistance(referenceLocation, a.location);
      const distanceB = this.calculateDistance(referenceLocation, b.location);
      return distanceA - distanceB;
    });
  }

  /**
   * @dev Sort orders by quality preference
   */
  static sortOrdersByQuality(orders: Order[], preferredQuality: EnergyQuality): Order[] {
    return orders.sort((a, b) => {
      const scoreA = this.calculateQualityScore(preferredQuality, a.quality);
      const scoreB = this.calculateQualityScore(preferredQuality, b.quality);
      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * @dev Apply hybrid sorting based on configuration
   */
  static sortOrdersHybrid(
    orders: Order[], 
    type: OrderType, 
    config: MatchingConfig,
    referenceLocation?: Location,
    preferredQuality?: EnergyQuality
  ): Order[] {
    // Create a copy to avoid mutating the original
    const sortedOrders = [...orders];

    // Calculate composite scores for each order
    const scoredOrders = sortedOrders.map(order => {
      let score = 0;
      let totalWeight = 0;

      // Price score
      if (config.priceWeight > 0) {
        let priceScore = 0;
        if (type === OrderType.BUY) {
          // For buy orders, higher price is better
          priceScore = Math.min(100, (order.price / 1000) * 100); // Normalize to 0-100
        } else {
          // For sell orders, lower price is better
          priceScore = Math.max(0, 100 - (order.price / 1000) * 100);
        }
        score += priceScore * config.priceWeight;
        totalWeight += config.priceWeight;
      }

      // Geographic score
      if (config.distanceWeight > 0 && referenceLocation) {
        const distance = this.calculateDistance(referenceLocation, order.location);
        const distanceScore = this.calculateDistanceScore(distance, config.maxDistance);
        score += distanceScore * config.distanceWeight;
        totalWeight += config.distanceWeight;
      }

      // Quality score
      if (config.qualityWeight > 0 && preferredQuality) {
        const qualityScore = this.calculateQualityScore(preferredQuality, order.quality);
        score += qualityScore * config.qualityWeight;
        totalWeight += config.qualityWeight;
      }

      // Time bonus (earlier orders get slight bonus)
      const timeBonus = Math.max(0, 100 - (Date.now() - order.createdAt) / (1000 * 60 * 60 * 24)); // Decay over days
      score += timeBonus * 10; // Small weight for time
      totalWeight += 10;

      return {
        order,
        score: totalWeight > 0 ? score / totalWeight : 0
      };
    });

    // Sort by composite score (descending)
    scoredOrders.sort((a, b) => b.score - a.score);

    return scoredOrders.map(item => item.order);
  }

  /**
   * @dev Validate order parameters
   */
  static validateOrder(order: Partial<Order>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!order.trader || order.trader.trim() === '') {
      errors.push('Invalid trader address');
    }

    if (!order.type || !Object.values(OrderType).includes(order.type)) {
      errors.push('Invalid order type');
    }

    if (!order.amount || order.amount <= 0) {
      errors.push('Invalid amount');
    }

    if (!order.price || order.price <= 0) {
      errors.push('Invalid price');
    }

    if (!order.location || !this.isValidLocation(order.location)) {
      errors.push('Invalid location');
    }

    if (!order.quality || !Object.values(EnergyQuality).includes(order.quality)) {
      errors.push('Invalid energy quality');
    }

    if (!order.expiresAt || order.expiresAt <= Date.now()) {
      errors.push('Invalid expiration time');
    }

    if (order.minFillAmount && order.minFillAmount > order.amount) {
      errors.push('Minimum fill amount exceeds order amount');
    }

    if (order.maxPriceSlippage && (order.maxPriceSlippage < 0 || order.maxPriceSlippage > 100)) {
      errors.push('Invalid price slippage percentage');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * @dev Validate location coordinates
   */
  private static isValidLocation(location: Location): boolean {
    return (
      location &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number' &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180 &&
      location.region &&
      location.country
    );
  }

  /**
   * @dev Check if order has expired
   */
  static isOrderExpired(order: Order): boolean {
    return Date.now() > order.expiresAt;
  }

  /**
   * @dev Check if order is fully filled
   */
  static isOrderFullyFilled(order: Order): boolean {
    return order.filledAmount >= order.amount;
  }

  /**
   * @dev Get remaining amount for an order
   */
  static getRemainingAmount(order: Order): number {
    return Math.max(0, order.amount - order.filledAmount);
  }

  /**
   * @dev Calculate fill percentage for an order
   */
  static calculateFillPercentage(order: Order): number {
    return (order.filledAmount / order.amount) * 100;
  }

  /**
   * @dev Generate unique order ID
   */
  static generateOrderId(trader: string, timestamp: number): string {
    return `${trader}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * @dev Generate unique match ID
   */
  static generateMatchId(buyOrderId: string, sellOrderId: string, timestamp: number): string {
    return `match_${buyOrderId}_${sellOrderId}_${timestamp}`;
  }

  /**
   * @dev Optimize order matching for gas efficiency
   */
  static optimizeMatchingBatch(orders: Order[], maxBatchSize: number): Order[][] {
    const batches: Order[][] = [];
    
    // Separate buy and sell orders
    const buyOrders = orders.filter(o => o.type === OrderType.BUY);
    const sellOrders = orders.filter(o => o.type === OrderType.SELL);
    
    // Sort by price-time priority
    const sortedBuys = this.sortOrdersByPriceTime(buyOrders, OrderType.BUY);
    const sortedSells = this.sortOrdersByPriceTime(sellOrders, OrderType.SELL);
    
    // Create batches of optimal size
    for (let i = 0; i < sortedBuys.length; i += maxBatchSize) {
      const buyBatch = sortedBuys.slice(i, i + maxBatchSize);
      const matchingSells = this.findBestMatchingSells(buyBatch, sortedSells);
      
      if (matchingSells.length > 0) {
        batches.push([...buyBatch, ...matchingSells]);
      }
    }
    
    return batches;
  }

  /**
   * @dev Find best matching sell orders for a batch of buy orders
   */
  private static findBestMatchingSells(buyOrders: Order[], sellOrders: Order[]): Order[] {
    const matchingSells: Order[] = [];
    const usedSellOrders = new Set<string>();
    
    for (const buyOrder of buyOrders) {
      for (const sellOrder of sellOrders) {
        if (usedSellOrders.has(sellOrder.id)) continue;
        
        if (buyOrder.price >= sellOrder.price) {
          matchingSells.push(sellOrder);
          usedSellOrders.add(sellOrder.id);
          break;
        }
      }
    }
    
    return matchingSells;
  }

  /**
   * @dev Calculate gas estimate for matching operation
   */
  static estimateGasForMatching(orderCount: number): number {
    // Base gas cost + per-order cost
    const baseGas = 21000;
    const perOrderGas = 15000;
    const matchingLogicGas = 25000;
    
    return baseGas + (orderCount * perOrderGas) + matchingLogicGas;
  }

  /**
   * @dev Check if matching operation is within gas limits
   */
  static isWithinGasLimits(orderCount: number, gasLimit: number): boolean {
    const estimatedGas = this.estimateGasForMatching(orderCount);
    return estimatedGas <= gasLimit;
  }
}
