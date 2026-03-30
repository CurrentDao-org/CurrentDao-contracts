import { 
  Order, 
  OrderType, 
  OrderStatus, 
  EnergyQuality, 
  Location, 
  Match, 
  OrderBookEntry,
  MatchingResult,
  MatchingConfig,
  MatchingPriority
} from '../interfaces/IMatchingEngine';
import { MatchingLib } from '../libraries/MatchingLib';

/**
 * @title DoubleAuction
 * @dev Continuous double auction matching algorithm implementation
 * @dev Implements price-time priority with geographic and quality preferences
 */
export class DoubleAuction {
  
  /**
   * @dev Run continuous double auction matching
   */
  static runContinuousMatching(
    buyOrders: Order[],
    sellOrders: Order[],
    config: MatchingConfig
  ): MatchingResult {
    const startTime = Date.now();
    const matches: Match[] = [];
    
    // Filter and sort orders
    const validBuyOrders = this.filterValidOrders(buyOrders);
    const validSellOrders = this.filterValidOrders(sellOrders);
    
    const sortedBuys = MatchingLib.sortOrdersByPriceTime(validBuyOrders, OrderType.BUY);
    const sortedSells = MatchingLib.sortOrdersByPriceTime(validSellOrders, OrderType.SELL);
    
    // Convert to order book entries for easier processing
    const buyEntries = this.convertToOrderBookEntries(sortedBuys);
    const sellEntries = this.convertToOrderBookEntries(sortedSells);
    
    // Perform matching
    const { matches: newMatches, remainingBids, remainingAsks } = 
      this.performMatching(buyEntries, sellEntries, config);
    
    matches.push(...newMatches);
    
    // Calculate statistics
    const totalMatchedAmount = matches.reduce((sum, match) => sum + match.amount, 0);
    const totalMatchingFees = matches.reduce((sum, match) => sum + match.matchingFee, 0);
    const averagePrice = matches.length > 0 
      ? matches.reduce((sum, match) => sum + match.price, 0) / matches.length 
      : 0;
    
    const processingTime = Date.now() - startTime;
    
    return {
      matches,
      remainingBids,
      remainingAsks,
      totalMatchedAmount,
      totalMatchingFees,
      averagePrice,
      processingTime
    };
  }

  /**
   * @dev Run batch matching for multiple orders
   */
  static runBatchMatching(
    orders: Order[],
    config: MatchingConfig
  ): MatchingResult {
    // Separate buy and sell orders
    const buyOrders = orders.filter(o => o.type === OrderType.BUY);
    const sellOrders = orders.filter(o => o.type === OrderType.SELL);
    
    return this.runContinuousMatching(buyOrders, sellOrders, config);
  }

  /**
   * @dev Match a single order against the order book
   */
  static matchSingleOrder(
    order: Order,
    oppositeOrders: Order[],
    config: MatchingConfig
  ): Match[] {
    const matches: Match[] = [];
    
    if (!MatchingLib.isOrderExpired(order) && 
        order.status === OrderStatus.PENDING || order.status === OrderStatus.PARTIALLY_FILLED) {
      
      const validOppositeOrders = this.filterValidOrders(oppositeOrders);
      const sortedOpposite = MatchingLib.sortOrdersByPriceTime(
        validOppositeOrders, 
        order.type === OrderType.BUY ? OrderType.SELL : OrderType.BUY
      );
      
      const orderEntries = this.convertToOrderBookEntries([order]);
      const oppositeEntries = this.convertToOrderBookEntries(sortedOpposite);
      
      const { matches: newMatches } = this.performMatching(
        order.type === OrderType.BUY ? orderEntries : oppositeEntries,
        order.type === OrderType.BUY ? oppositeEntries : orderEntries,
        config
      );
      
      matches.push(...newMatches);
    }
    
    return matches;
  }

  /**
   * @dev Perform the core matching algorithm
   */
  private static performMatching(
    bids: OrderBookEntry[],
    asks: OrderBookEntry[],
    config: MatchingConfig
  ): { matches: Match[]; remainingBids: OrderBookEntry[]; remainingAsks: OrderBookEntry[] } {
    const matches: Match[] = [];
    const remainingBids = [...bids];
    const remainingAsks = [...asks];
    
    let bidIndex = 0;
    let askIndex = 0;
    
    while (bidIndex < remainingBids.length && askIndex < remainingAsks.length) {
      const bid = remainingBids[bidIndex];
      const ask = remainingAsks[askIndex];
      
      // Check if orders can match
      if (bid.price < ask.price) {
        // No more matches possible at current price levels
        break;
      }
      
      // Calculate compatibility scores
      const compatibility = this.calculateCompatibility(bid, ask, config);
      
      if (compatibility.overallScore > 0) {
        // Calculate match amount
        const matchAmount = Math.min(bid.amount, ask.amount);
        
        // Create match
        const match: Match = {
          id: MatchingLib.generateMatchId(bid.orderId, ask.orderId, Date.now()),
          buyOrderId: bid.orderId,
          sellOrderId: ask.orderId,
          amount: matchAmount,
          price: ask.price, // Use ask price (maker price)
          timestamp: Date.now(),
          matchingFee: MatchingLib.calculateMatchingFee(matchAmount, ask.price, config.matchingFeeRate),
          qualityScore: compatibility.qualityScore,
          distanceScore: compatibility.distanceScore,
          priceScore: compatibility.priceScore
        };
        
        matches.push(match);
        
        // Update remaining amounts
        bid.amount -= matchAmount;
        ask.amount -= matchAmount;
        
        // Remove fully filled orders
        if (bid.amount <= 0) {
          bidIndex++;
        }
        
        if (ask.amount <= 0) {
          askIndex++;
        }
      } else {
        // Orders are not compatible, move to next order
        if (config.priority === MatchingPriority.PRICE_TIME) {
          // In price-time priority, move the less competitive order
          askIndex++;
        } else {
          // In other priorities, try next combination
          askIndex++;
        }
      }
    }
    
    return {
      matches,
      remainingBids: remainingBids.slice(bidIndex).filter(entry => entry.amount > 0),
      remainingAsks: remainingAsks.slice(askIndex).filter(entry => entry.amount > 0)
    };
  }

  /**
   * @dev Calculate compatibility score between bid and ask
   */
  private static calculateCompatibility(
    bid: OrderBookEntry,
    ask: OrderBookEntry,
    config: MatchingConfig
  ): { overallScore: number; qualityScore: number; distanceScore: number; priceScore: number } {
    // Quality compatibility
    const qualityScore = MatchingLib.calculateQualityScore(
      bid.quality, 
      ask.quality
    );
    
    // Geographic compatibility
    const distance = MatchingLib.calculateDistance(bid.location, ask.location);
    const distanceScore = MatchingLib.calculateDistanceScore(distance, config.maxDistance);
    
    // Price compatibility
    const priceScore = MatchingLib.calculatePriceScore(bid.price, ask.price);
    
    // Overall score
    const overallScore = MatchingLib.calculateOverallScore(
      priceScore,
      distanceScore,
      qualityScore,
      config
    );
    
    return {
      overallScore,
      qualityScore,
      distanceScore,
      priceScore
    };
  }

  /**
   * @dev Filter out invalid or expired orders
   */
  private static filterValidOrders(orders: Order[]): Order[] {
    return orders.filter(order => 
      !MatchingLib.isOrderExpired(order) &&
      (order.status === OrderStatus.PENDING || order.status === OrderStatus.PARTIALLY_FILLED) &&
      MatchingLib.getRemainingAmount(order) > 0
    );
  }

  /**
   * @dev Convert orders to order book entries
   */
  private static convertToOrderBookEntries(orders: Order[]): OrderBookEntry[] {
    return orders.map(order => ({
      orderId: order.id,
      price: order.price,
      amount: MatchingLib.getRemainingAmount(order),
      timestamp: order.createdAt,
      trader: order.trader,
      location: order.location,
      quality: order.quality
    }));
  }

  /**
   * @dev Calculate market depth for price levels
   */
  static calculateMarketDepth(
    orders: Order[],
    type: OrderType,
    priceLevels: number = 10
  ): { price: number; amount: number; count: number }[] {
    const validOrders = this.filterValidOrders(orders);
    const sortedOrders = MatchingLib.sortOrdersByPriceTime(validOrders, type);
    
    const depth: { price: number; amount: number; count: number }[] = [];
    const priceMap = new Map<number, { amount: number; count: number }>();
    
    // Aggregate by price levels
    for (const order of sortedOrders) {
      const remaining = MatchingLib.getRemainingAmount(order);
      const current = priceMap.get(order.price) || { amount: 0, count: 0 };
      
      priceMap.set(order.price, {
        amount: current.amount + remaining,
        count: current.count + 1
      });
    }
    
    // Convert to array and sort
    const sortedDepths = Array.from(priceMap.entries())
      .map(([price, data]) => ({ price, ...data }))
      .sort((a, b) => {
        if (type === OrderType.BUY) {
          return b.price - a.price; // Descending for bids
        } else {
          return a.price - b.price; // Ascending for asks
        }
      })
      .slice(0, priceLevels);
    
    return sortedDepths;
  }

  /**
   * @dev Calculate spread and market statistics
   */
  static calculateMarketStatistics(
    buyOrders: Order[],
    sellOrders: Order[]
  ): { 
    bestBid: number | null; 
    bestAsk: number | null; 
    spread: number | null; 
    midPrice: number | null;
    bidVolume: number;
    askVolume: number;
    totalVolume: number;
  } {
    const validBuys = this.filterValidOrders(buyOrders);
    const validSells = this.filterValidOrders(sellOrders);
    
    const sortedBuys = MatchingLib.sortOrdersByPriceTime(validBuys, OrderType.BUY);
    const sortedSells = MatchingLib.sortOrdersByPriceTime(validSells, OrderType.SELL);
    
    const bestBid = sortedBuys.length > 0 ? sortedBuys[0].price : null;
    const bestAsk = sortedSells.length > 0 ? sortedSells[0].price : null;
    
    const spread = bestBid && bestAsk ? bestAsk - bestBid : null;
    const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : null;
    
    const bidVolume = sortedBuys.reduce((sum, order) => 
      sum + MatchingLib.getRemainingAmount(order), 0);
    const askVolume = sortedSells.reduce((sum, order) => 
      sum + MatchingLib.getRemainingAmount(order), 0);
    const totalVolume = bidVolume + askVolume;
    
    return {
      bestBid,
      bestAsk,
      spread,
      midPrice,
      bidVolume,
      askVolume,
      totalVolume
    };
  }

  /**
   * @dev Simulate matching for price impact analysis
   */
  static simulatePriceImpact(
    order: Order,
    orderBook: Order[],
    config: MatchingConfig
  ): { 
    estimatedPrice: number; 
    priceImpact: number; 
    fillProbability: number; 
    estimatedSlippage: number;
  } {
    const oppositeOrders = orderBook.filter(o => o.type !== order.type);
    const validOpposite = this.filterValidOrders(oppositeOrders);
    const sortedOpposite = MatchingLib.sortOrdersByPriceTime(
      validOpposite, 
      order.type === OrderType.BUY ? OrderType.SELL : OrderType.BUY
    );
    
    let totalFillable = 0;
    let weightedPrice = 0;
    let totalWeight = 0;
    
    for (const oppOrder of sortedOpposite) {
      const remaining = MatchingLib.getRemainingAmount(oppOrder);
      const canFill = Math.min(remaining, order.amount - totalFillable);
      
      if (canFill > 0) {
        totalFillable += canFill;
        weightedPrice += oppOrder.price * canFill;
        totalWeight += canFill;
        
        if (totalFillable >= order.amount) break;
      }
    }
    
    const estimatedPrice = totalWeight > 0 ? weightedPrice / totalWeight : order.price;
    const priceImpact = order.type === OrderType.BUY 
      ? ((estimatedPrice - order.price) / order.price) * 100
      : ((order.price - estimatedPrice) / order.price) * 100;
    
    const fillProbability = totalWeight > 0 ? Math.min(100, (totalWeight / order.amount) * 100) : 0;
    const estimatedSlippage = Math.abs(estimatedPrice - order.price);
    
    return {
      estimatedPrice,
      priceImpact,
      fillProbability,
      estimatedSlippage
    };
  }

  /**
   * @dev Optimize order placement strategy
   */
  static optimizeOrderPlacement(
    desiredAmount: number,
    orderBook: Order[],
    config: MatchingConfig
  ): { 
    recommendedPrice: number; 
    splitOrders: { amount: number; price: number }[]; 
    expectedFillTime: number;
  } {
    const marketStats = this.calculateMarketStatistics(
      orderBook.filter(o => o.type === OrderType.BUY),
      orderBook.filter(o => o.type === OrderType.SELL)
    );
    
    const recommendedPrice = marketStats.midPrice || 0;
    
    // Simple order splitting strategy
    const maxOrderSize = config.maxOrderAmount / 10; // Split into 10ths
    const splitOrders: { amount: number; price: number }[] = [];
    
    let remainingAmount = desiredAmount;
    while (remainingAmount > 0) {
      const orderSize = Math.min(remainingAmount, maxOrderSize);
      splitOrders.push({
        amount: orderSize,
        price: recommendedPrice
      });
      remainingAmount -= orderSize;
    }
    
    // Estimate fill time based on market activity
    const expectedFillTime = Math.max(1, Math.ceil(desiredAmount / (marketStats.totalVolume / 24))); // Hours
    
    return {
      recommendedPrice,
      splitOrders,
      expectedFillTime
    };
  }

  /**
   * @dev Detect and prevent market manipulation
   */
  static detectMarketManipulation(
    orders: Order[],
    timeWindow: number = 3600000 // 1 hour
  ): { 
    isSuspicious: boolean; 
    reasons: string[]; 
    confidence: number;
  } {
    const now = Date.now();
    const recentOrders = orders.filter(o => now - o.createdAt <= timeWindow);
    
    const reasons: string[] = [];
    let confidence = 0;
    
    // Check for unusually large orders
    const avgOrderSize = recentOrders.reduce((sum, o) => sum + o.amount, 0) / recentOrders.length;
    const largeOrders = recentOrders.filter(o => o.amount > avgOrderSize * 10);
    
    if (largeOrders.length > 0) {
      reasons.push('Unusually large orders detected');
      confidence += 30;
    }
    
    // Check for rapid order placement/cancellation
    const cancellations = recentOrders.filter(o => o.status === OrderStatus.CANCELLED);
    if (cancellations.length > recentOrders.length * 0.5) {
      reasons.push('High order cancellation rate');
      confidence += 25;
    }
    
    // Check for spoofing (large orders with immediate cancellation)
    const spoofingOrders = recentOrders.filter(o => 
      o.amount > avgOrderSize * 5 && 
      o.status === OrderStatus.CANCELLED &&
      (now - o.createdAt) < 60000 // Cancelled within 1 minute
    );
    
    if (spoofingOrders.length > 0) {
      reasons.push('Potential spoofing activity');
      confidence += 35;
    }
    
    // Check for wash trading (self-trading)
    const traderGroups = new Map<string, number>();
    recentOrders.forEach(o => {
      const count = traderGroups.get(o.trader) || 0;
      traderGroups.set(o.trader, count + 1);
    });
    
    const activeTraders = Array.from(traderGroups.values());
    const avgOrdersPerTrader = activeTraders.reduce((sum, count) => sum + count, 0) / activeTraders.length;
    
    const dominantTraders = Array.from(traderGroups.entries())
      .filter(([_, count]) => count > avgOrdersPerTrader * 5);
    
    if (dominantTraders.length > 0) {
      reasons.push('Concentrated trading activity');
      confidence += 20;
    }
    
    return {
      isSuspicious: confidence > 50,
      reasons,
      confidence: Math.min(100, confidence)
    };
  }
}
