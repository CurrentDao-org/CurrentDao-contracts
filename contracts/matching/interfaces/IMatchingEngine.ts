/**
 * @title IMatchingEngine
 * @dev Interface for the intelligent on-chain order matching engine
 * @dev Handles energy buy and sell orders with advanced matching algorithms
 */

export enum OrderType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export enum EnergyQuality {
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  GREEN = 'GREEN',
  PREMIUM_GREEN = 'PREMIUM_GREEN'
}

export enum MatchingPriority {
  PRICE_TIME = 'PRICE_TIME',
  GEOGRAPHIC = 'GEOGRAPHIC',
  QUALITY = 'QUALITY',
  HYBRID = 'HYBRID'
}

export interface Location {
  latitude: number;
  longitude: number;
  region: string;
  country: string;
}

export interface Order {
  id: string;
  trader: string;
  type: OrderType;
  amount: number;
  price: number;
  location: Location;
  quality: EnergyQuality;
  status: OrderStatus;
  filledAmount: number;
  createdAt: number;
  expiresAt: number;
  minFillAmount?: number;
  maxPriceSlippage?: number;
  preferredRegions?: string[];
  qualityPreferences?: EnergyQuality[];
}

export interface Match {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  amount: number;
  price: number;
  timestamp: number;
  matchingFee: number;
  qualityScore: number;
  distanceScore: number;
  priceScore: number;
}

export interface OrderBookEntry {
  orderId: string;
  price: number;
  amount: number;
  timestamp: number;
  trader: string;
  location: Location;
  quality: EnergyQuality;
}

export interface OrderBook {
  bids: OrderBookEntry[]; // Buy orders sorted by price descending
  asks: OrderBookEntry[]; // Sell orders sorted by price ascending
  lastUpdated: number;
  totalVolume: number;
  spread: number;
}

export interface MatchingResult {
  matches: Match[];
  remainingBids: OrderBookEntry[];
  remainingAsks: OrderBookEntry[];
  totalMatchedAmount: number;
  totalMatchingFees: number;
  averagePrice: number;
  processingTime: number;
}

export interface MatchingConfig {
  enabled: boolean;
  priority: MatchingPriority;
  maxDistance: number; // in kilometers
  qualityWeight: number; // 0-100
  distanceWeight: number; // 0-100
  priceWeight: number; // 0-100
  matchingFeeRate: number; // basis points
  minOrderAmount: number;
  maxOrderAmount: number;
  batchProcessingSize: number;
  priceTolerance: number; // percentage
}

export interface GeographicPreference {
  region: string;
  priority: number; // 1-10
  maxDistance: number;
}

export interface QualityPreference {
  quality: EnergyQuality;
  minScore: number; // 0-100
  premium: number; // percentage premium willing to pay
}

export interface MatchingStatistics {
  totalOrders: number;
  totalMatches: number;
  totalVolume: number;
  averageMatchSize: number;
  averageMatchingTime: number;
  fillRate: number;
  priceImprovement: number;
  geographicOptimization: number;
  qualityOptimization: number;
  gasUsagePerMatch: number;
}

// Events
export interface OrderCreatedEvent {
  orderId: string;
  trader: string;
  type: OrderType;
  amount: number;
  price: number;
  location: Location;
  quality: EnergyQuality;
  timestamp: number;
}

export interface OrderUpdatedEvent {
  orderId: string;
  status: OrderStatus;
  filledAmount: number;
  remainingAmount: number;
  timestamp: number;
}

export interface OrderCancelledEvent {
  orderId: string;
  trader: string;
  reason: string;
  refundedAmount: number;
  timestamp: number;
}

export interface MatchExecutedEvent {
  matchId: string;
  buyOrderId: string;
  sellOrderId: string;
  amount: number;
  price: number;
  buyer: string;
  seller: string;
  matchingFee: number;
  timestamp: number;
}

export interface BatchMatchingCompletedEvent {
  batchId: string;
  matchesCount: number;
  totalAmount: number;
  totalFees: number;
  processingTime: number;
  timestamp: number;
}

// Main interface
export interface IMatchingEngine {
  // Order management
  createOrder(
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
  ): string;

  cancelOrder(orderId: string, caller: string): boolean;

  updateOrder(
    orderId: string,
    newAmount?: number,
    newPrice?: number,
    newExpiresAt?: number,
    caller: string
  ): boolean;

  // Matching functions
  matchSingleOrder(orderId: string): Match[];

  matchBatch(orderIds: string[]): MatchingResult;

  runContinuousMatching(): MatchingResult;

  // Order book management
  getOrderBook(): OrderBook;

  getOrdersByType(type: OrderType): Order[];

  getOrdersByTrader(trader: string): Order[];

  getOrdersByLocation(location: Location, radius: number): Order[];

  getOrdersByQuality(quality: EnergyQuality): Order[];

  // Matching configuration
  updateConfig(config: Partial<MatchingConfig>, caller: string): boolean;

  getConfig(): MatchingConfig;

  // Geographic and quality preferences
  setGeographicPreference(
    trader: string,
    preferences: GeographicPreference[],
    caller: string
  ): boolean;

  setQualityPreference(
    trader: string,
    preferences: QualityPreference[],
    caller: string
  ): boolean;

  // Statistics and analytics
  getStatistics(): MatchingStatistics;

  getMatchingHistory(limit: number): Match[];

  getOrderHistory(trader: string, limit: number): Order[];

  // Fee management
  calculateMatchingFee(amount: number, price: number): number;

  distributeMatchingFees(fees: number): boolean;

  // Utility functions
  isValidOrder(order: Order): boolean;

  calculateDistance(loc1: Location, loc2: Location): number;

  calculateQualityScore(requested: EnergyQuality, offered: EnergyQuality): number;

  calculatePriceScore(bidPrice: number, askPrice: number): number;

  // Admin functions
  pause(caller: string): boolean;

  unpause(caller: string): boolean;

  emergencyCancelAll(reason: string, caller: string): boolean;

  // Events
  onOrderCreated?: (event: OrderCreatedEvent) => void;
  onOrderUpdated?: (event: OrderUpdatedEvent) => void;
  onOrderCancelled?: (event: OrderCancelledEvent) => void;
  onMatchExecuted?: (event: MatchExecutedEvent) => void;
  onBatchMatchingCompleted?: (event: BatchMatchingCompletedEvent) => void;
}

export const MATCHING_ERROR = {
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_FILLED: 'ORDER_ALREADY_FILLED',
  ORDER_EXPIRED: 'ORDER_EXPIRED',
  INSUFFICIENT_AMOUNT: 'INSUFFICIENT_AMOUNT',
  INVALID_PRICE: 'INVALID_PRICE',
  INVALID_LOCATION: 'INVALID_LOCATION',
  INVALID_QUALITY: 'INVALID_QUALITY',
  NO_MATCHES_FOUND: 'NO_MATCHES_FOUND',
  MATCHING_PAUSED: 'MATCHING_PAUSED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  GAS_LIMIT_EXCEEDED: 'GAS_LIMIT_EXCEEDED'
} as const;

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  enabled: true,
  priority: MatchingPriority.HYBRID,
  maxDistance: 500, // 500 km
  qualityWeight: 30,
  distanceWeight: 30,
  priceWeight: 40,
  matchingFeeRate: 10, // 0.1%
  minOrderAmount: 1,
  maxOrderAmount: 1000000,
  batchProcessingSize: 100,
  priceTolerance: 5 // 5%
};

export const LOCATION_PRESETS = {
  EUROPE: { latitude: 50.0, longitude: 10.0, region: 'EU', country: 'DE' },
  NORTH_AMERICA: { latitude: 40.0, longitude: -100.0, region: 'NA', country: 'US' },
  ASIA_PACIFIC: { latitude: 0.0, longitude: 120.0, region: 'APAC', country: 'SG' },
  GLOBAL: { latitude: 0.0, longitude: 0.0, region: 'GLOBAL', country: 'GLOBAL' }
} as const;
