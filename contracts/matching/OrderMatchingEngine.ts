import { 
  IMatchingEngine, 
  Order, 
  OrderType, 
  OrderStatus, 
  EnergyQuality, 
  Location, 
  Match, 
  OrderBookEntry,
  OrderBook as IOrderBook,
  MatchingResult,
  MatchingConfig,
  MatchingPriority,
  GeographicPreference,
  QualityPreference,
  MatchingStatistics,
  OrderCreatedEvent,
  OrderUpdatedEvent,
  OrderCancelledEvent,
  MatchExecutedEvent,
  BatchMatchingCompletedEvent,
  MATCHING_ERROR,
  DEFAULT_MATCHING_CONFIG
} from './interfaces/IMatchingEngine';
import { MatchingLib } from './libraries/MatchingLib';
import { DoubleAuction } from './algorithms/DoubleAuction';
import { OrderBook } from './structures/OrderBook';

/**
 * @title OrderMatchingEngine
 * @dev Intelligent on-chain order matching engine for energy trading
 * @dev Implements continuous double auction with geographic and quality preferences
 */
export class OrderMatchingEngine implements IMatchingEngine {
  
  // State variables
  private orderBook: OrderBook;
  private config: MatchingConfig;
  private admin: string;
  private paused: boolean = false;
  private emergencyMode: boolean = false;
  
  // Tracking variables
  private orders: Map<string, Order> = new Map();
  private matches: Match[] = [];
  private geographicPreferences: Map<string, GeographicPreference[]> = new Map();
  private qualityPreferences: Map<string, QualityPreference[]> = new Map();
  private statistics: MatchingStatistics;
  
  // Events
  private events: any[] = [];
  
  constructor(adminAddress: string) {
    this.admin = adminAddress;
    this.orderBook = new OrderBook();
    this.config = { ...DEFAULT_MATCHING_CONFIG };
    this.statistics = this.initializeStatistics();
    
    this.emitEvent('EngineInitialized', { 
      admin: adminAddress, 
      timestamp: Date.now() 
    });
  }

  // --- Order Management ---

  public createOrder(
    trader: string,
    type: OrderType,
    amount: number,
    price: number,
    location: Location,
    quality: EnergyQuality,
    expiresAt: number,
    minFillAmount?: number,
    maxPriceSlippage?: number,
    preferredRegions?: string[],
    qualityPreferences?: EnergyQuality[]
  ): string {
    this.whenNotPaused();
    this.validateTrader(trader);
    
    // Create order object
    const orderId = MatchingLib.generateOrderId(trader, Date.now());
    const order: Order = {
      id: orderId,
      trader,
      type,
      amount,
      price,
      location,
      quality,
      status: OrderStatus.PENDING,
      filledAmount: 0,
      createdAt: Date.now(),
      expiresAt,
      minFillAmount,
      maxPriceSlippage,
      preferredRegions,
      qualityPreferences
    };
    
    // Validate order
    const validation = MatchingLib.validateOrder(order);
    if (!validation.isValid) {
      throw new Error(`Invalid order: ${validation.errors.join(', ')}`);
    }
    
    // Store order
    this.orders.set(orderId, order);
    this.orderBook.addOrder(order);
    
    // Update statistics
    this.updateOrderStatistics(order, 'created');
    
    // Emit event
    this.emitEvent('OrderCreated', {
      orderId,
      trader,
      type,
      amount,
      price,
      location,
      quality,
      timestamp: Date.now()
    } as OrderCreatedEvent);
    
    // Attempt immediate matching if enabled
    if (this.config.enabled) {
      this.attemptImmediateMatching(order);
    }
    
    return orderId;
  }

  public cancelOrder(orderId: string, caller: string): boolean {
    this.whenNotPaused();
    
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(MATCHING_ERROR.ORDER_NOT_FOUND);
    }
    
    if (order.trader !== caller && caller !== this.admin) {
      throw new Error(MATCHING_ERROR.INSUFFICIENT_PERMISSIONS);
    }
    
    if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELLED) {
      throw new Error('Order cannot be cancelled');
    }
    
    // Update order status
    order.status = OrderStatus.CANCELLED;
    
    // Remove from order book
    this.orderBook.removeOrder(orderId);
    
    // Update statistics
    this.updateOrderStatistics(order, 'cancelled');
    
    // Calculate refund amount
    const remainingAmount = MatchingLib.getRemainingAmount(order);
    
    // Emit event
    this.emitEvent('OrderCancelled', {
      orderId,
      trader: order.trader,
      reason: 'User cancellation',
      refundedAmount: remainingAmount,
      timestamp: Date.now()
    } as OrderCancelledEvent);
    
    return true;
  }

  public updateOrder(
    orderId: string,
    newAmount?: number,
    newPrice?: number,
    newExpiresAt?: number,
    caller: string
  ): boolean {
    this.whenNotPaused();
    
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(MATCHING_ERROR.ORDER_NOT_FOUND);
    }
    
    if (order.trader !== caller && caller !== this.admin) {
      throw new Error(MATCHING_ERROR.INSUFFICIENT_PERMISSIONS);
    }
    
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PARTIALLY_FILLED) {
      throw new Error('Order cannot be updated');
    }
    
    // Apply updates
    const updates: Partial<Order> = {};
    if (newAmount !== undefined) updates.amount = newAmount;
    if (newPrice !== undefined) updates.price = newPrice;
    if (newExpiresAt !== undefined) updates.expiresAt = newExpiresAt;
    
    // Validate updated order
    const updatedOrder = { ...order, ...updates };
    const validation = MatchingLib.validateOrder(updatedOrder);
    if (!validation.isValid) {
      throw new Error(`Invalid order update: ${validation.errors.join(', ')}`);
    }
    
    // Update order
    Object.assign(order, updates);
    this.orderBook.updateOrder(orderId, updates);
    
    // Emit event
    this.emitEvent('OrderUpdated', {
      orderId,
      status: order.status,
      filledAmount: order.filledAmount,
      remainingAmount: MatchingLib.getRemainingAmount(order),
      timestamp: Date.now()
    } as OrderUpdatedEvent);
    
    // Attempt matching after update
    if (this.config.enabled) {
      this.attemptImmediateMatching(order);
    }
    
    return true;
  }

  // --- Matching Functions ---

  public matchSingleOrder(orderId: string): Match[] {
    this.whenNotPaused();
    this.whenMatchingEnabled();
    
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(MATCHING_ERROR.ORDER_NOT_FOUND);
    }
    
    const oppositeOrders = Array.from(this.orders.values())
      .filter(o => o.type !== order.type);
    
    const matches = DoubleAuction.matchSingleOrder(order, oppositeOrders, this.config);
    
    // Process matches
    for (const match of matches) {
      this.processMatch(match);
    }
    
    return matches;
  }

  public matchBatch(orderIds: string[]): MatchingResult {
    this.whenNotPaused();
    this.whenMatchingEnabled();
    
    const batchOrders = orderIds
      .map(id => this.orders.get(id))
      .filter(order => order !== undefined) as Order[];
    
    const result = DoubleAuction.runBatchMatching(batchOrders, this.config);
    
    // Process matches
    for (const match of result.matches) {
      this.processMatch(match);
    }
    
    // Update order book with remaining orders
    this.updateOrderBookFromResult(result);
    
    // Emit batch completion event
    this.emitEvent('BatchMatchingCompleted', {
      batchId: `batch_${Date.now()}`,
      matchesCount: result.matches.length,
      totalAmount: result.totalMatchedAmount,
      totalFees: result.totalMatchingFees,
      processingTime: result.processingTime,
      timestamp: Date.now()
    } as BatchMatchingCompletedEvent);
    
    return result;
  }

  public runContinuousMatching(): MatchingResult {
    this.whenNotPaused();
    this.whenMatchingEnabled();
    
    const buyOrders = Array.from(this.orders.values())
      .filter(o => o.type === OrderType.BUY);
    const sellOrders = Array.from(this.orders.values())
      .filter(o => o.type === OrderType.SELL);
    
    const result = DoubleAuction.runContinuousMatching(buyOrders, sellOrders, this.config);
    
    // Process matches
    for (const match of result.matches) {
      this.processMatch(match);
    }
    
    // Update order book
    this.updateOrderBookFromResult(result);
    
    return result;
  }

  // --- Order Book Management ---

  public getOrderBook(): IOrderBook {
    return this.orderBook;
  }

  public getOrdersByType(type: OrderType): Order[] {
    return Array.from(this.orders.values()).filter(order => order.type === type);
  }

  public getOrdersByTrader(trader: string): Order[] {
    return Array.from(this.orders.values()).filter(order => order.trader === trader);
  }

  public getOrdersByLocation(location: Location, radius: number): Order[] {
    return this.orderBook.getOrdersByLocation(location, radius);
  }

  public getOrdersByQuality(quality: EnergyQuality): Order[] {
    return this.orderBook.getOrdersByQuality(quality);
  }

  // --- Configuration Management ---

  public updateConfig(config: Partial<MatchingConfig>, caller: string): boolean {
    this.onlyAdmin(caller);
    
    // Validate configuration
    const newConfig = { ...this.config, ...config };
    this.validateConfig(newConfig);
    
    this.config = newConfig;
    
    this.emitEvent('ConfigUpdated', { 
      config: newConfig, 
      updatedBy: caller, 
      timestamp: Date.now() 
    });
    
    return true;
  }

  public getConfig(): MatchingConfig {
    return { ...this.config };
  }

  // --- Preference Management ---

  public setGeographicPreference(
    trader: string,
    preferences: GeographicPreference[],
    caller: string
  ): boolean {
    this.validateTraderPermission(trader, caller);
    
    this.geographicPreferences.set(trader, preferences);
    
    this.emitEvent('GeographicPreferenceSet', {
      trader,
      preferences,
      timestamp: Date.now()
    });
    
    return true;
  }

  public setQualityPreference(
    trader: string,
    preferences: QualityPreference[],
    caller: string
  ): boolean {
    this.validateTraderPermission(trader, caller);
    
    this.qualityPreferences.set(trader, preferences);
    
    this.emitEvent('QualityPreferenceSet', {
      trader,
      preferences,
      timestamp: Date.now()
    });
    
    return true;
  }

  // --- Statistics and Analytics ---

  public getStatistics(): MatchingStatistics {
    return { ...this.statistics };
  }

  public getMatchingHistory(limit: number): Match[] {
    return this.matches.slice(-limit);
  }

  public getOrderHistory(trader: string, limit: number): Order[] {
    return this.getOrdersByTrader(trader)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  // --- Fee Management ---

  public calculateMatchingFee(amount: number, price: number): number {
    return MatchingLib.calculateMatchingFee(amount, price, this.config.matchingFeeRate);
  }

  public distributeMatchingFees(fees: number): boolean {
    // Simple fee distribution - in production, this would distribute to various stakeholders
    this.statistics.totalMatchingFees += fees;
    
    this.emitEvent('FeesDistributed', {
      amount: fees,
      timestamp: Date.now()
    });
    
    return true;
  }

  // --- Utility Functions ---

  public isValidOrder(order: Order): boolean {
    const validation = MatchingLib.validateOrder(order);
    return validation.isValid;
  }

  public calculateDistance(loc1: Location, loc2: Location): number {
    return MatchingLib.calculateDistance(loc1, loc2);
  }

  public calculateQualityScore(requested: EnergyQuality, offered: EnergyQuality): number {
    return MatchingLib.calculateQualityScore(requested, offered);
  }

  public calculatePriceScore(bidPrice: number, askPrice: number): number {
    return MatchingLib.calculatePriceScore(bidPrice, askPrice);
  }

  // --- Admin Functions ---

  public pause(caller: string): boolean {
    this.onlyAdmin(caller);
    this.paused = true;
    
    this.emitEvent('EnginePaused', { by: caller, timestamp: Date.now() });
    return true;
  }

  public unpause(caller: string): boolean {
    this.onlyAdmin(caller);
    this.paused = false;
    
    this.emitEvent('EngineUnpaused', { by: caller, timestamp: Date.now() });
    return true;
  }

  public emergencyCancelAll(reason: string, caller: string): boolean {
    this.onlyAdmin(caller);
    
    this.emergencyMode = true;
    
    // Cancel all pending orders
    const pendingOrders = Array.from(this.orders.values())
      .filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.PARTIALLY_FILLED);
    
    for (const order of pendingOrders) {
      order.status = OrderStatus.CANCELLED;
      this.orderBook.removeOrder(order.id);
      
      this.emitEvent('OrderCancelled', {
        orderId: order.id,
        trader: order.trader,
        reason: `Emergency cancellation: ${reason}`,
        refundedAmount: MatchingLib.getRemainingAmount(order),
        timestamp: Date.now()
      } as OrderCancelledEvent);
    }
    
    this.emitEvent('EmergencyModeActivated', { 
      reason, 
      activatedBy: caller, 
      timestamp: Date.now() 
    });
    
    return true;
  }

  // --- Event Handlers ---

  public onOrderCreated?: (event: OrderCreatedEvent) => void;
  public onOrderUpdated?: (event: OrderUpdatedEvent) => void;
  public onOrderCancelled?: (event: OrderCancelledEvent) => void;
  public onMatchExecuted?: (event: MatchExecutedEvent) => void;
  public onBatchMatchingCompleted?: (event: BatchMatchingCompletedEvent) => void;

  // --- Private Helper Functions ---

  private whenNotPaused(): void {
    if (this.paused) {
      throw new Error('Matching engine is paused');
    }
  }

  private whenMatchingEnabled(): void {
    if (!this.config.enabled) {
      throw new Error('Matching is disabled');
    }
  }

  private onlyAdmin(caller: string): void {
    if (caller !== this.admin) {
      throw new Error(MATCHING_ERROR.INSUFFICIENT_PERMISSIONS);
    }
  }

  private validateTrader(trader: string): void {
    if (!trader || trader.trim() === '') {
      throw new Error('Invalid trader address');
    }
  }

  private validateTraderPermission(trader: string, caller: string): void {
    if (trader !== caller && caller !== this.admin) {
      throw new Error(MATCHING_ERROR.INSUFFICIENT_PERMISSIONS);
    }
  }

  private validateConfig(config: MatchingConfig): void {
    if (config.matchingFeeRate < 0 || config.matchingFeeRate > 1000) {
      throw new Error('Invalid matching fee rate');
    }
    
    if (config.maxDistance < 0) {
      throw new Error('Invalid max distance');
    }
    
    const totalWeight = config.priceWeight + config.distanceWeight + config.qualityWeight;
    if (totalWeight !== 100) {
      throw new Error('Weight distribution must sum to 100');
    }
  }

  private attemptImmediateMatching(order: Order): void {
    try {
      const matches = this.matchSingleOrder(order.id);
      if (matches.length > 0) {
        this.emitEvent('ImmediateMatch', {
          orderId: order.id,
          matchesCount: matches.length,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // Log error but don't fail order creation
      console.error('Immediate matching failed:', error);
    }
  }

  private processMatch(match: Match): void {
    // Update order statuses
    const buyOrder = this.orders.get(match.buyOrderId);
    const sellOrder = this.orders.get(match.sellOrderId);
    
    if (buyOrder) {
      buyOrder.filledAmount += match.amount;
      if (MatchingLib.isOrderFullyFilled(buyOrder)) {
        buyOrder.status = OrderStatus.FILLED;
      } else {
        buyOrder.status = OrderStatus.PARTIALLY_FILLED;
      }
    }
    
    if (sellOrder) {
      sellOrder.filledAmount += match.amount;
      if (MatchingLib.isOrderFullyFilled(sellOrder)) {
        sellOrder.status = OrderStatus.FILLED;
      } else {
        sellOrder.status = OrderStatus.PARTIALLY_FILLED;
      }
    }
    
    // Store match
    this.matches.push(match);
    
    // Update statistics
    this.updateMatchStatistics(match);
    
    // Emit event
    this.emitEvent('MatchExecuted', {
      matchId: match.id,
      buyOrderId: match.buyOrderId,
      sellOrderId: match.sellOrderId,
      amount: match.amount,
      price: match.price,
      buyer: buyOrder?.trader || '',
      seller: sellOrder?.trader || '',
      matchingFee: match.matchingFee,
      timestamp: match.timestamp
    } as MatchExecutedEvent);
  }

  private updateOrderBookFromResult(result: MatchingResult): void {
    // This would update the order book based on matching results
    // In a real implementation, this would sync the order book state
    this.orderBook.lastUpdated = Date.now();
  }

  private initializeStatistics(): MatchingStatistics {
    return {
      totalOrders: 0,
      totalMatches: 0,
      totalVolume: 0,
      averageMatchSize: 0,
      averageMatchingTime: 0,
      fillRate: 0,
      priceImprovement: 0,
      geographicOptimization: 0,
      qualityOptimization: 0,
      gasUsagePerMatch: 0
    };
  }

  private updateOrderStatistics(order: Order, action: 'created' | 'cancelled'): void {
    if (action === 'created') {
      this.statistics.totalOrders++;
    }
  }

  private updateMatchStatistics(match: Match): void {
    this.statistics.totalMatches++;
    this.statistics.totalVolume += match.amount;
    this.statistics.averageMatchSize = this.statistics.totalVolume / this.statistics.totalMatches;
    
    // Update optimization metrics
    this.statistics.geographicOptimization = 
      (this.statistics.geographicOptimization + match.distanceScore) / 2;
    this.statistics.qualityOptimization = 
      (this.statistics.qualityOptimization + match.qualityScore) / 2;
  }

  private emitEvent(eventName: string, data: any): void {
    const event = {
      event: eventName,
      timestamp: Date.now(),
      data
    };
    
    this.events.push(event);
    
    // Call event handlers if they exist
    switch (eventName) {
      case 'OrderCreated':
        this.onOrderCreated?.(data as OrderCreatedEvent);
        break;
      case 'OrderUpdated':
        this.onOrderUpdated?.(data as OrderUpdatedEvent);
        break;
      case 'OrderCancelled':
        this.onOrderCancelled?.(data as OrderCancelledEvent);
        break;
      case 'MatchExecuted':
        this.onMatchExecuted?.(data as MatchExecutedEvent);
        break;
      case 'BatchMatchingCompleted':
        this.onBatchMatchingCompleted?.(data as BatchMatchingCompletedEvent);
        break;
    }
  }

  public getPastEvents(): any[] {
    return [...this.events];
  }

  // --- Advanced Features ---

  public getMarketDepth(type: OrderType, levels: number = 10): { price: number; amount: number; count: number }[] {
    return this.orderBook.getMarketDepth(type, levels);
  }

  public getMarketStatistics(): {
    bestBid: number | null;
    bestAsk: number | null;
    spread: number | null;
    midPrice: number | null;
    bidVolume: number;
    askVolume: number;
    totalVolume: number;
  } {
    const stats = this.orderBook.getStatistics();
    return {
      bestBid: stats.bestBid,
      bestAsk: stats.bestAsk,
      spread: stats.spread,
      midPrice: this.orderBook.getMidPrice(),
      bidVolume: stats.bidVolume,
      askVolume: stats.askVolume,
      totalVolume: stats.totalVolume
    };
  }

  public detectMarketManipulation(): {
    isSuspicious: boolean;
    reasons: string[];
    confidence: number;
  } {
    const allOrders = Array.from(this.orders.values());
    return DoubleAuction.detectMarketManipulation(allOrders);
  }
}
