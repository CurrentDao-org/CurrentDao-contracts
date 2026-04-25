/**
 * NFT Energy Asset Structures
 * Defines data structures for NFT energy asset operations
 */

export interface EnergyAssetNFT {
  tokenId: bigint;
  owner: string;
  creator: string;
  energyType: string;
  energyAmount: bigint; // Amount of energy in kWh or MWh
  productionDate: bigint;
  location: string;
  metadata: EnergyMetadata;
  provenance: ProvenanceRecord[];
  certifications: Certification[];
  isActive: boolean;
  mintedAt: bigint;
}

export interface EnergyMetadata {
  name: string;
  description: string;
  image: string;
  attributes: EnergyAttribute[];
  externalUrl?: string;
  animationUrl?: string;
}

export interface EnergyAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface ProvenanceRecord {
  timestamp: bigint;
  action: string;
  actor: string;
  details: string;
  previousOwner?: string;
  newOwner?: string;
}

export interface Certification {
  certifier: string;
  certificationType: string;
  certificateId: string;
  issuedAt: bigint;
  expiresAt?: bigint;
  verified: boolean;
}

export interface MarketplaceListing {
  tokenId: bigint;
  seller: string;
  price: bigint;
  currency: string;
  startTime: bigint;
  endTime?: bigint;
  isActive: boolean;
  bidAmount?: bigint;
  highestBidder?: string;
}

export interface Bid {
  tokenId: bigint;
  bidder: string;
  amount: bigint;
  currency: string;
  timestamp: bigint;
  isActive: boolean;
}

export interface RoyaltyInfo {
  recipient: string;
  percentage: number; // Percentage in basis points (100 = 1%)
}

export interface EnergyProductionRecord {
  tokenId: bigint;
  productionAmount: bigint;
  timestamp: bigint;
  efficiency: number;
  carbonOffset: bigint;
}

export interface TradingMetrics {
  totalVolume: bigint;
  totalTrades: number;
  averagePrice: bigint;
  highestSale: bigint;
  lowestSale: bigint;
  lastSalePrice: bigint;
  lastSaleTime: bigint;
}

export interface AssetVerification {
  tokenId: bigint;
  verificationStatus: VerificationStatus;
  verifiedBy: string;
  verificationTimestamp: bigint;
  verificationData: string;
  isValid: boolean;
}

export enum VerificationStatus {
  PENDING = 0,
  VERIFIED = 1,
  REJECTED = 2,
  SUSPENDED = 3
}

export enum EnergyType {
  SOLAR = 0,
  WIND = 1,
  HYDRO = 2,
  GEOTHERMAL = 3,
  BIOMASS = 4,
  NUCLEAR = 5,
  FOSSIL = 6
}

export enum MarketplaceType {
  SPOT = 0,
  AUCTION = 1,
  DUTCH_AUCTION = 2,
  FUTURES = 3
}

export interface FuturesContract {
  tokenId: bigint;
  contractId: string;
  buyer: string;
  seller: string;
  deliveryDate: bigint;
  strikePrice: bigint;
  quantity: bigint;
  isLong: boolean;
  isSettled: boolean;
  collateral: bigint;
}

export interface EnergyBundle {
  bundleId: string;
  tokenIds: bigint[];
  bundlePrice: bigint;
  currency: string;
  creator: string;
  isActive: boolean;
  createdAt: bigint;
}

export interface StakingPosition {
  tokenId: bigint;
  owner: string;
  stakedAmount: bigint;
  stakingPeriod: bigint;
  rewardRate: number;
  rewardsEarned: bigint;
  lastUpdateTime: bigint;
  isActive: boolean;
}

export interface EnergyMarketStats {
  totalEnergyAssets: number;
  totalEnergyTraded: bigint;
  marketCap: bigint;
  topEnergyTypes: { type: string; count: number }[];
  averageEnergyPerAsset: bigint;
  carbonOffsetTotal: bigint;
}
