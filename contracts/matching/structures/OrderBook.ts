import { 
  Order, 
  OrderType, 
  OrderStatus, 
  EnergyQuality, 
  Location, 
  OrderBookEntry,
  OrderBook as IOrderBook,
  MatchingConfig,
  GeographicPreference,
  QualityPreference
} from '../interfaces/IMatchingEngine';
import { MatchingLib } from '../libraries/MatchingLib';

/**
 * @title OrderBook
 * @dev Data structure for managing buy and sell orders
 * @dev Provides efficient order insertion, removal, and querying
 */
export class OrderBook implements IOrderBook {
  public bids: OrderBookEntry[] = [];
  public asks: OrderBookEntry[] = [];
  public lastUpdated: number = Date.now();
  public totalVolume: number = 0;
  public spread: number = 0;

  private orders: Map<string, Order> = new Map();
  private priceLevels: Map<string, OrderBookEntry[]> = new Map();
  private geographicIndex: Map<string, Set<string>> = new Map();
  private qualityIndex: Map<EnergyQuality, Set<string>> = new Map();

  constructor() {
    this.updateSpread();
  }

  /**
   * @dev Add a new order to the order book
   */
  addOrder(order: Order): boolean {
    if (!this.isValidOrderToAdd(order)) {
      return false;
    }

    // Store the full order
    this.orders.set(order.id, order);

    // Create order book entry
    const entry: OrderBookEntry = {
      orderId: order.id,
      price: order.price,
      amount: MatchingLib.getRemainingAmount(order),
      timestamp: order.createdAt,
      trader: order.trader,
      location: order.location,
      quality: order.quality
    };

    // Add to appropriate side
    if (order.type === OrderType.BUY) {
      this.insertBid(entry);
    } else {
      this.insertAsk(entry);
    }

    // Update indexes
    this.updateIndexes(order);

    // Update statistics
    this.updateStatistics();

    return true;
  }

  /**
   * @dev Remove an order from the order book
   */
  removeOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    // Remove from appropriate side
    if (order.type === OrderType.BUY) {
      this.removeBid(orderId);
    } else {
      this.removeAsk(orderId);
    }

    // Remove from storage
    this.orders.delete(orderId);

    // Remove from indexes
    this.removeFromIndexes(order);

    // Update statistics
    this.updateStatistics();

    return true;
  }

  /**
   * @dev Update an existing order
   */
  updateOrder(orderId: string, updates: Partial<Order>): boolean {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    // Remove old order
    this.removeOrder(orderId);

    // Apply updates
    const updatedOrder = { ...order, ...updates };

    // Add updated order
    return this.addOrder(updatedOrder);
  }

  /**
   * @dev Get order by ID
   */
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * @dev Get all orders
   */
  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  /**
   * @dev Get orders by type
   */
  getOrdersByType(type: OrderType): Order[] {
    return Array.from(this.orders.values()).filter(order => order.type === type);
  }

  /**
   * @dev Get orders by trader
   */
  getOrdersByTrader(trader: string): Order[] {
    return Array.from(this.orders.values()).filter(order => order.trader === trader);
  }

  /**
   * @dev Get orders by location within radius
   */
  getOrdersByLocation(location: Location, radius: number): Order[] {
    const results: Order[] = [];
    
    for (const order of this.orders.values()) {
      const distance = MatchingLib.calculateDistance(location, order.location);
      if (distance <= radius) {
        results.push(order);
      }
    }
    
    return results;
  }

  /**
   * @dev Get orders by quality
   */
  getOrdersByQuality(quality: EnergyQuality): Order[] {
    const orderIds = this.qualityIndex.get(quality) || new Set();
    return Array.from(orderIds)
      .map(id => this.orders.get(id))
      .filter(order => order !== undefined) as Order[];
  }

  /**
   * @dev Get best bid (highest buy order)
   */
  getBestBid(): OrderBookEntry | null {
    return this.bids.length > 0 ? this.bids[0] : null;
  }

  /**
   * @dev Get best ask (lowest sell order)
   */
  getBestAsk(): OrderBookEntry | null {
    return this.asks.length > 0 ? this.asks[0] : null;
  }

  /**
   * @dev Get market depth at different price levels
   */
  getMarketDepth(type: OrderType, levels: number = 10): { price: number; amount: number; count: number }[] {
    const entries = type === OrderType.BUY ? this.bids : this.asks;
    const depth: { price: number; amount: number; count: number }[] = [];
    
    const priceMap = new Map<number, { amount: number; count: number }>();
    
    for (const entry of entries) {
      const current = priceMap.get(entry.price) || { amount: 0, count: 0 };
      priceMap.set(entry.price, {
        amount: current.amount + entry.amount,
        count: current.count + 1
      });
    }
    
    return Array.from(priceMap.entries())
      .map(([price, data]) => ({ price, ...data }))
      .slice(0, levels);
  }

  /**
   * @dev Get spread between best bid and ask
   */
  getSpread(): number {
    return this.spread;
  }

  /**
   * @dev Get mid price
   */
  getMidPrice(): number | null {
    const bestBid = this.getBestBid();
    const bestAsk = this.getBestAsk();
    
    if (bestBid && bestAsk) {
      return (bestBid.price + bestAsk.price) / 2;
    }
    
    return null;
  }

  /**
   * @dev Get total volume
   */
  getTotalVolume(): number {
    return this.totalVolume;
  }

  /**
   * @dev Get order book statistics
   */
  getStatistics(): {
    totalOrders: number;
    buyOrders: number;
    sellOrders: number;
    totalVolume: number;
    bidVolume: number;
    askVolume: number;
    spread: number;
    bestBid: number | null;
    bestAsk: number | null;
    averagePrice: number;
    priceRange: { min: number; max: number };
  } {
    const buyOrders = this.bids.length;
    const sellOrders = this.asks.length;
    const totalOrders = buyOrders + sellOrders;
    
    const bidVolume = this.bids.reduce((sum, bid) => sum + bid.amount, 0);
    const askVolume = this.asks.reduce((sum, ask) => sum + ask.amount, 0);
    
    const allPrices = [...this.bids.map(b => b.price), ...this.asks.map(a => a.price)];
    const averagePrice = allPrices.length > 0 
      ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length 
      : 0;
    
    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
    
    return {
      totalOrders,
      buyOrders,
      sellOrders,
      totalVolume: this.totalVolume,
      bidVolume,
      askVolume,
      spread: this.spread,
      bestBid: this.getBestBid()?.price || null,
      bestAsk: this.getBestAsk()?.price || null,
      averagePrice,
      priceRange: { min: minPrice, max: maxPrice }
    };
  }

  /**
   * @dev Find matching orders for a given order
   */
  findMatchingOrders(
    order: Order,
    config: MatchingConfig,
    maxMatches: number = 10
  ): OrderBookEntry[] {
    const oppositeSide = order.type === OrderType.BUY ? this.asks : this.bids;
    const matches: OrderBookEntry[] = [];
    
    for (const entry of oppositeSide) {
      if (matches.length >= maxMatches) break;
      
      // Basic price check
      if (order.type === OrderType.BUY && order.price < entry.price) continue;
      if (order.type === OrderType.SELL && order.price > entry.price) continue;
      
      // Geographic check
      const distance = MatchingLib.calculateDistance(order.location, entry.location);
      if (distance > config.maxDistance) continue;
      
      // Quality check
      const qualityScore = MatchingLib.calculateQualityScore(order.quality, entry.quality);
      if (qualityScore === 0) continue;
      
      matches.push(entry);
    }
    
    return matches;
  }

  /**
   * @dev Get order book snapshot for a specific time
   */
  getSnapshot(timestamp: number): IOrderBook {
    // Filter orders that existed at the given timestamp
    const historicalOrders = Array.from(this.orders.values())
      .filter(order => order.createdAt <= timestamp);
    
    const snapshot = new OrderBook();
    
    for (const order of historicalOrders) {
      snapshot.addOrder(order);
    }
    
    return snapshot;
  }

  /**
   * @dev Clear all orders
   */
  clear(): void {
    this.bids = [];
    this.asks = [];
    this.orders.clear();
    this.priceLevels.clear();
    this.geographicIndex.clear();
    this.qualityIndex.clear();
    this.totalVolume = 0;
    this.spread = 0;
    this.lastUpdated = Date.now();
  }

  /**
   * @dev Validate order before adding
   */
  private isValidOrderToAdd(order: Order): boolean {
    if (this.orders.has(order.id)) {
      return false; // Order already exists
    }
    
    if (MatchingLib.isOrderExpired(order)) {
      return false; // Order expired
    }
    
    if (MatchingLib.isOrderFullyFilled(order)) {
      return false; // Order already filled
    }
    
    const validation = MatchingLib.validateOrder(order);
    return validation.isValid;
  }

  /**
   * @dev Insert bid maintaining sorted order
   */
  private insertBid(entry: OrderBookEntry): void {
    // Find insertion point (highest price first, then earliest time)
    let insertIndex = this.bids.length;
    
    for (let i = 0; i < this.bids.length; i++) {
      if (entry.price > this.bids[i].price || 
          (entry.price === this.bids[i].price && entry.timestamp < this.bids[i].timestamp)) {
        insertIndex = i;
        break;
      }
    }
    
    this.bids.splice(insertIndex, 0, entry);
    
    // Update price level index
    const priceKey = `bid_${entry.price}`;
    const priceLevel = this.priceLevels.get(priceKey) || [];
    priceLevel.push(entry);
    this.priceLevels.set(priceKey, priceLevel);
  }

  /**
   * @dev Insert ask maintaining sorted order
   */
  private insertAsk(entry: OrderBookEntry): void {
    // Find insertion point (lowest price first, then earliest time)
    let insertIndex = this.asks.length;
    
    for (let i = 0; i < this.asks.length; i++) {
      if (entry.price < this.asks[i].price || 
          (entry.price === this.asks[i].price && entry.timestamp < this.asks[i].timestamp)) {
        insertIndex = i;
        break;
      }
    }
    
    this.asks.splice(insertIndex, 0, entry);
    
    // Update price level index
    const priceKey = `ask_${entry.price}`;
    const priceLevel = this.priceLevels.get(priceKey) || [];
    priceLevel.push(entry);
    this.priceLevels.set(priceKey, priceLevel);
  }

  /**
   * @dev Remove bid from order book
   */
  private removeBid(orderId: string): void {
    const index = this.bids.findIndex(entry => entry.orderId === orderId);
    if (index !== -1) {
      const entry = this.bids[index];
      this.bids.splice(index, 1);
      
      // Remove from price level index
      const priceKey = `bid_${entry.price}`;
      const priceLevel = this.priceLevels.get(priceKey) || [];
      const priceIndex = priceLevel.findIndex(e => e.orderId === orderId);
      if (priceIndex !== -1) {
        priceLevel.splice(priceIndex, 1);
        if (priceLevel.length === 0) {
          this.priceLevels.delete(priceKey);
        }
      }
    }
  }

  /**
   * @dev Remove ask from order book
   */
  private removeAsk(orderId: string): void {
    const index = this.asks.findIndex(entry => entry.orderId === orderId);
    if (index !== -1) {
      const entry = this.asks[index];
      this.asks.splice(index, 1);
      
      // Remove from price level index
      const priceKey = `ask_${entry.price}`;
      const priceLevel = this.priceLevels.get(priceKey) || [];
      const priceIndex = priceLevel.findIndex(e => e.orderId === orderId);
      if (priceIndex !== -1) {
        priceLevel.splice(priceIndex, 1);
        if (priceLevel.length === 0) {
          this.priceLevels.delete(priceKey);
        }
      }
    }
  }

  /**
   * @dev Update indexes for efficient querying
   */
  private updateIndexes(order: Order): void {
    // Geographic index
    const geoKey = `${order.location.region}_${order.location.country}`;
    const geoOrders = this.geographicIndex.get(geoKey) || new Set();
    geoOrders.add(order.id);
    this.geographicIndex.set(geoKey, geoOrders);
    
    // Quality index
    const qualityOrders = this.qualityIndex.get(order.quality) || new Set();
    qualityOrders.add(order.id);
    this.qualityIndex.set(order.quality, qualityOrders);
  }

  /**
   * @dev Remove order from indexes
   */
  private removeFromIndexes(order: Order): void {
    // Remove from geographic index
    const geoKey = `${order.location.region}_${order.location.country}`;
    const geoOrders = this.geographicIndex.get(geoKey);
    if (geoOrders) {
      geoOrders.delete(order.id);
      if (geoOrders.size === 0) {
        this.geographicIndex.delete(geoKey);
      }
    }
    
    // Remove from quality index
    const qualityOrders = this.qualityIndex.get(order.quality);
    if (qualityOrders) {
      qualityOrders.delete(order.id);
      if (qualityOrders.size === 0) {
        this.qualityIndex.delete(order.quality);
      }
    }
  }

  /**
   * @dev Update order book statistics
   */
  private updateStatistics(): void {
    this.lastUpdated = Date.now();
    
    // Update total volume
    this.totalVolume = this.bids.reduce((sum, bid) => sum + bid.amount, 0) +
                      this.asks.reduce((sum, ask) => sum + ask.amount, 0);
    
    // Update spread
    this.updateSpread();
  }

  /**
   * @dev Update spread calculation
   */
  private updateSpread(): void {
    const bestBid = this.getBestBid();
    const bestAsk = this.getBestAsk();
    
    if (bestBid && bestAsk) {
      this.spread = bestAsk.price - bestBid.price;
    } else {
      this.spread = 0;
    }
  }

  /**
   * @dev Export order book data
   */
  export(): {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    lastUpdated: number;
    totalVolume: number;
    spread: number;
    orders: Order[];
  } {
    return {
      bids: [...this.bids],
      asks: [...this.asks],
      lastUpdated: this.lastUpdated,
      totalVolume: this.totalVolume,
      spread: this.spread,
      orders: this.getAllOrders()
    };
  }

  /**
   * @dev Import order book data
   */
  import(data: {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    lastUpdated: number;
    totalVolume: number;
    spread: number;
    orders: Order[];
  }): void {
    this.clear();
    
    this.bids = data.bids;
    this.asks = data.asks;
    this.lastUpdated = data.lastUpdated;
    this.totalVolume = data.totalVolume;
    this.spread = data.spread;
    
    // Rebuild indexes
    for (const order of data.orders) {
      this.orders.set(order.id, order);
      this.updateIndexes(order);
    }
  }
}
