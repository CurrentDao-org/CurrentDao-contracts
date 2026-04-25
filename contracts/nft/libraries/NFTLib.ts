/**
 * NFT Library
 * Provides utility functions for NFT energy asset operations
 */

import {
  EnergyAssetNFT,
  MarketplaceListing,
  Bid,
  RoyaltyInfo,
  EnergyProductionRecord,
  TradingMetrics,
  AssetVerification,
  FuturesContract,
  EnergyBundle,
  StakingPosition,
  EnergyMetadata,
  ProvenanceRecord,
  Certification,
  VerificationStatus,
  MarketplaceType
} from '../structures/NFTStructs';

export class NFTLib {
  // Constants
  private static readonly BASIS_POINTS = 10000;
  private static readonly MAX_ROYALTY_PERCENTAGE = 1000; // 10%
  private static readonly MIN_STAKING_PERIOD = 86400; // 1 day in seconds
  private static readonly MARKETPLACE_FEE_PERCENTAGE = 250; // 2.5%
  
  /**
   * Validate energy asset metadata
   */
  static validateMetadata(metadata: EnergyMetadata): boolean {
    if (!metadata.name || metadata.name.trim().length === 0) {
      return false;
    }
    
    if (!metadata.description || metadata.description.trim().length === 0) {
      return false;
    }
    
    if (!metadata.attributes || metadata.attributes.length === 0) {
      return false;
    }
    
    // Validate attributes
    for (const attr of metadata.attributes) {
      if (!attr.trait_type || attr.value === undefined) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Generate unique token ID
   */
  static generateTokenId(creator: string, timestamp: bigint): bigint {
    const combined = creator + timestamp.toString();
    let hash = 0n;
    
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash * 31n) - hash + BigInt(combined.charCodeAt(i))) & 0xffffffffffffffffn;
    }
    
    return hash;
  }
  
  /**
   * Calculate royalty amount
   */
  static calculateRoyaltyAmount(salePrice: bigint, royaltyPercentage: number): bigint {
    if (royaltyPercentage < 0 || royaltyPercentage > NFTLib.MAX_ROYALTY_PERCENTAGE) {
      throw new Error('Invalid royalty percentage');
    }
    
    return (salePrice * BigInt(royaltyPercentage)) / BigInt(NFTLib.BASIS_POINTS);
  }
  
  /**
   * Calculate marketplace fee
   */
  static calculateMarketplaceFee(price: bigint, feePercentage: number = NFTLib.MARKETPLACE_FEE_PERCENTAGE): bigint {
    return (price * BigInt(feePercentage)) / BigInt(NFTLib.BASIS_POINTS);
  }
  
  /**
   * Validate royalty percentage
   */
  static validateRoyaltyPercentage(percentage: number): boolean {
    return percentage >= 0 && percentage <= NFTLib.MAX_ROYALTY_PERCENTAGE;
  }
  
  /**
   * Create provenance record
   */
  static createProvenanceRecord(
    action: string,
    actor: string,
    details: string,
    previousOwner?: string,
    newOwner?: string
  ): ProvenanceRecord {
    return {
      timestamp: BigInt(Date.now()),
      action,
      actor,
      details,
      previousOwner,
      newOwner
    };
  }
  
  /**
   * Add provenance record to asset
   */
  static addProvenanceRecord(asset: EnergyAssetNFT, record: ProvenanceRecord): void {
    asset.provenance.push(record);
  }
  
  /**
   * Verify asset authenticity
   */
  static verifyAssetAuthenticity(asset: EnergyAssetNFT): boolean {
    // Check if asset has required fields
    if (!asset.tokenId || !asset.owner || !asset.creator) {
      return false;
    }
    
    // Check if asset has provenance
    if (!asset.provenance || asset.provenance.length === 0) {
      return false;
    }
    
    // Check if asset has metadata
    if (!asset.metadata || !this.validateMetadata(asset.metadata)) {
      return false;
    }
    
    // Check if asset has certifications
    if (!asset.certifications || asset.certifications.length === 0) {
      return false;
    }
    
    // Verify at least one certification is valid
    const hasValidCertification = asset.certifications.some(cert => 
      cert.verified && 
      cert.issuedAt > 0n && 
      (!cert.expiresAt || cert.expiresAt > BigInt(Date.now()))
    );
    
    return hasValidCertification;
  }
  
  /**
   * Calculate carbon credits
   */
  static calculateCarbonCredits(energyAmount: bigint, energyType: string): bigint {
    // Carbon credit calculation based on energy type
    // This is a simplified calculation - in reality, this would use complex formulas
    const carbonFactors: { [key: string]: number } = {
      'SOLAR': 0.5,      // 0.5 kg CO2 per kWh
      'WIND': 0.4,       // 0.4 kg CO2 per kWh
      'HYDRO': 0.2,      // 0.2 kg CO2 per kWh
      'GEOTHERMAL': 0.1, // 0.1 kg CO2 per kWh
      'BIOMASS': 0.3,    // 0.3 kg CO2 per kWh
      'NUCLEAR': 0.05,   // 0.05 kg CO2 per kWh
      'FOSSIL': 0.9      // 0.9 kg CO2 per kWh (negative credits)
    };
    
    const factor = carbonFactors[energyType] || 0.5;
    const carbonOffset = Number(energyAmount) * factor;
    
    return BigInt(Math.floor(carbonOffset));
  }
  
  /**
   * Validate marketplace listing
   */
  static validateListing(listing: MarketplaceListing): boolean {
    if (!listing.tokenId || listing.tokenId <= 0n) {
      return false;
    }
    
    if (!listing.seller || listing.seller.trim().length === 0) {
      return false;
    }
    
    if (listing.price <= 0n) {
      return false;
    }
    
    if (!listing.currency || listing.currency.trim().length === 0) {
      return false;
    }
    
    if (listing.startTime <= 0n) {
      return false;
    }
    
    if (listing.endTime && listing.endTime <= listing.startTime) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate bid
   */
  static validateBid(bid: Bid): boolean {
    if (!bid.tokenId || bid.tokenId <= 0n) {
      return false;
    }
    
    if (!bid.bidder || bid.bidder.trim().length === 0) {
      return false;
    }
    
    if (bid.amount <= 0n) {
      return false;
    }
    
    if (!bid.currency || bid.currency.trim().length === 0) {
      return false;
    }
    
    if (bid.timestamp <= 0n) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Calculate trading metrics
   */
  static calculateTradingMetrics(
    sales: { price: bigint; timestamp: bigint }[],
    currentPrice?: bigint
  ): TradingMetrics {
    if (sales.length === 0) {
      return {
        totalVolume: 0n,
        totalTrades: 0,
        averagePrice: 0n,
        highestSale: 0n,
        lowestSale: 0n,
        lastSalePrice: currentPrice || 0n,
        lastSaleTime: 0n
      };
    }
    
    const totalVolume = sales.reduce((sum, sale) => sum + sale.price, 0n);
    const totalTrades = sales.length;
    const averagePrice = totalVolume / BigInt(totalTrades);
    const highestSale = Math.max(...sales.map(sale => Number(sale.price)));
    const lowestSale = Math.min(...sales.map(sale => Number(sale.price)));
    const lastSale = sales[sales.length - 1];
    
    return {
      totalVolume,
      totalTrades,
      averagePrice,
      highestSale: BigInt(highestSale),
      lowestSale: BigInt(lowestSale),
      lastSalePrice: lastSale.price,
      lastSaleTime: lastSale.timestamp
    };
  }
  
  /**
   * Validate futures contract
   */
  static validateFuturesContract(contract: FuturesContract): boolean {
    if (!contract.tokenId || contract.tokenId <= 0n) {
      return false;
    }
    
    if (!contract.contractId || contract.contractId.trim().length === 0) {
      return false;
    }
    
    if (!contract.buyer || !contract.seller) {
      return false;
    }
    
    if (contract.deliveryDate <= BigInt(Date.now())) {
      return false;
    }
    
    if (contract.strikePrice <= 0n) {
      return false;
    }
    
    if (contract.quantity <= 0n) {
      return false;
    }
    
    if (contract.collateral <= 0n) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Calculate staking rewards
   */
  static calculateStakingRewards(
    stakedAmount: bigint,
    stakingPeriod: bigint,
    rewardRate: number,
    lastUpdateTime: bigint
  ): bigint {
    const currentTime = BigInt(Date.now());
    const elapsedSeconds = currentTime - lastUpdateTime;
    
    if (elapsedSeconds <= 0n) {
      return 0n;
    }
    
    // Calculate rewards based on annual rate
    const annualRewards = (stakedAmount * BigInt(Math.floor(rewardRate * 10000))) / BigInt(10000);
    const secondsInYear = 365n * 24n * 60n * 60n;
    const rewards = (annualRewards * elapsedSeconds) / secondsInYear;
    
    return rewards;
  }
  
  /**
   * Validate staking position
   */
  static validateStakingPosition(position: StakingPosition): boolean {
    if (!position.tokenId || position.tokenId <= 0n) {
      return false;
    }
    
    if (!position.owner || position.owner.trim().length === 0) {
      return false;
    }
    
    if (position.stakedAmount <= 0n) {
      return false;
    }
    
    if (position.stakingPeriod < NFTLib.MIN_STAKING_PERIOD) {
      return false;
    }
    
    if (position.rewardRate < 0 || position.rewardRate > 100) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Create energy bundle
   */
  static createEnergyBundle(
    tokenIds: bigint[],
    bundlePrice: bigint,
    currency: string,
    creator: string
  ): EnergyBundle {
    return {
      bundleId: this.generateBundleId(tokenIds, creator),
      tokenIds,
      bundlePrice,
      currency,
      creator,
      isActive: true,
      createdAt: BigInt(Date.now())
    };
  }
  
  /**
   * Generate bundle ID
   */
  static generateBundleId(tokenIds: bigint[], creator: string): string {
    const sortedTokens = [...tokenIds].sort();
    const combined = creator + sortedTokens.join('-');
    return '0x' + Buffer.from(combined).toString('hex').slice(0, 64);
  }
  
  /**
   * Validate energy bundle
   */
  static validateEnergyBundle(bundle: EnergyBundle): boolean {
    if (!bundle.bundleId || bundle.bundleId.trim().length === 0) {
      return false;
    }
    
    if (!bundle.tokenIds || bundle.tokenIds.length === 0) {
      return false;
    }
    
    if (bundle.bundlePrice <= 0n) {
      return false;
    }
    
    if (!bundle.currency || bundle.currency.trim().length === 0) {
      return false;
    }
    
    if (!bundle.creator || bundle.creator.trim().length === 0) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Format energy amount for display
   */
  static formatEnergyAmount(amount: bigint, unit: string = 'kWh'): string {
    const numAmount = Number(amount);
    
    if (numAmount >= 1000000) {
      return `${(numAmount / 1000000).toFixed(2)} G${unit}`;
    } else if (numAmount >= 1000) {
      return `${(numAmount / 1000).toFixed(2)} M${unit}`;
    } else {
      return `${numAmount.toFixed(2)} ${unit}`;
    }
  }
  
  /**
   * Parse energy amount from string
   */
  static parseEnergyAmount(amountStr: string): bigint {
    const cleanStr = amountStr.replace(/[^0-9.]/g, '');
    const parts = cleanStr.split('.');
    
    if (parts.length === 1) {
      return BigInt(parts[0]);
    } else {
      const integerPart = parts[0];
      const decimalPart = parts[1].slice(0, 18); // Limit to 18 decimal places
      const paddedDecimal = decimalPart.padEnd(18, '0');
      return BigInt(integerPart + paddedDecimal);
    }
  }
  
  /**
   * Check if listing is expired
   */
  static isListingExpired(listing: MarketplaceListing): boolean {
    if (!listing.endTime) {
      return false;
    }
    
    return listing.endTime < BigInt(Date.now());
  }
  
  /**
   * Check if futures contract is ready for settlement
   */
  static isFuturesContractReadyForSettlement(contract: FuturesContract): boolean {
    return contract.deliveryDate <= BigInt(Date.now()) && !contract.isSettled;
  }
  
  /**
   * Calculate settlement price for futures contract
   */
  static calculateSettlementPrice(
    contract: FuturesContract,
    marketPrice: bigint
  ): { settlementPrice: bigint; pnl: bigint } {
    const settlementPrice = marketPrice;
    let pnl: bigint;
    
    if (contract.isLong) {
      // Long position: profit if market price > strike price
      pnl = settlementPrice > contract.strikePrice 
        ? (settlementPrice - contract.strikePrice) * contract.quantity 
        : -(contract.strikePrice - settlementPrice) * contract.quantity;
    } else {
      // Short position: profit if market price < strike price
      pnl = settlementPrice < contract.strikePrice 
        ? (contract.strikePrice - settlementPrice) * contract.quantity 
        : -(settlementPrice - contract.strikePrice) * contract.quantity;
    }
    
    return { settlementPrice, pnl };
  }
}
