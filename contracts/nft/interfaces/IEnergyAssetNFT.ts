/**
 * NFT Energy Asset Interface
 * Defines the contract interface for NFT energy asset operations
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
  EnergyMarketStats,
  VerificationStatus,
  EnergyType,
  MarketplaceType
} from '../structures/NFTStructs';

export interface IEnergyAssetNFT {
  // NFT Core Functions
  mintEnergyAsset(
    to: string,
    energyType: string,
    energyAmount: bigint,
    productionDate: bigint,
    location: string,
    metadata: any
  ): Promise<bigint>;
  
  burn(tokenId: bigint): Promise<void>;
  transferFrom(from: string, to: string, tokenId: bigint): Promise<void>;
  approve(to: string, tokenId: bigint): Promise<void>;
  
  // Asset Management
  updateMetadata(tokenId: bigint, metadata: any): Promise<void>;
  updateProductionRecord(tokenId: bigint, productionAmount: bigint, efficiency: number, carbonOffset: bigint): Promise<void>;
  verifyAsset(tokenId: bigint, verificationData: string): Promise<void>;
  
  // Marketplace Functions
  createListing(
    tokenId: bigint,
    price: bigint,
    currency: string,
    marketplaceType: MarketplaceType,
    endTime?: bigint
  ): Promise<string>;
  
  buyFromListing(listingId: string, buyer: string): Promise<void>;
  cancelListing(listingId: string): Promise<void>;
  createBid(tokenId: bigint, amount: bigint, currency: string): Promise<string>;
  acceptBid(tokenId: bigint, bidId: string): Promise<void>;
  cancelBid(bidId: string): Promise<void>;
  
  // Royalty Management
  setRoyalty(tokenId: bigint, recipient: string, percentage: number): Promise<void>;
  getRoyalty(tokenId: bigint): RoyaltyInfo;
  calculateRoyalty(tokenId: bigint, salePrice: bigint): bigint;
  
  // Futures Trading
  createFuturesContract(
    tokenId: bigint,
    deliveryDate: bigint,
    strikePrice: bigint,
    quantity: bigint,
    isLong: boolean,
    collateral: bigint
  ): Promise<string>;
  
  settleFuturesContract(contractId: string): Promise<void>;
  exerciseFuturesOption(contractId: string): Promise<void>;
  
  // Bundle Operations
  createBundle(tokenIds: bigint[], bundlePrice: bigint, currency: string): Promise<string>;
  buyBundle(bundleId: string, buyer: string): Promise<void>;
  splitBundle(bundleId: string): Promise<bigint[]>;
  
  // Staking Functions
  stakeToken(tokenId: bigint, stakingPeriod: bigint): Promise<void>;
  unstakeToken(tokenId: bigint): Promise<void>;
  claimStakingRewards(tokenId: bigint): Promise<bigint>;
  
  // Query Functions
  getAsset(tokenId: bigint): EnergyAssetNFT;
  getAssetsByOwner(owner: string): EnergyAssetNFT[];
  getAssetsByType(energyType: string): EnergyAssetNFT[];
  getListing(listingId: string): MarketplaceListing;
  getActiveListings(): MarketplaceListing[];
  getBidsForToken(tokenId: bigint): Bid[];
  getVerification(tokenId: bigint): AssetVerification;
  getProductionHistory(tokenId: bigint): EnergyProductionRecord[];
  getTradingMetrics(tokenId: bigint): TradingMetrics;
  getStakingPosition(tokenId: bigint): StakingPosition;
  getMarketStats(): EnergyMarketStats;
  
  // Energy Integration
  linkToEnergyProduction(tokenId: bigint, productionId: string): Promise<void>;
  updateEnergyMetrics(tokenId: bigint, actualProduction: bigint): Promise<void>;
  calculateCarbonCredits(tokenId: bigint): bigint;
  
  // Governance
  pauseContract(): void;
  unpauseContract(): void;
  setVerificationAuthority(authority: string): void;
  setMarketplaceFee(feePercentage: number): void;
  
  // Emergency Functions
  emergencyTransfer(tokenId: bigint, to: string): Promise<void>;
  emergencyBurn(tokenId: bigint): Promise<void>;
}

export interface IEnergyAssetNFTEvents {
  EnergyAssetMinted(tokenId: bigint, creator: string, energyType: string, energyAmount: bigint);
  EnergyAssetTransferred(tokenId: bigint, from: string, to: string);
  EnergyAssetBurned(tokenId: bigint, owner: string);
  MetadataUpdated(tokenId: bigint, updatedBy: string);
  ProductionRecordUpdated(tokenId: bigint, productionAmount: bigint, efficiency: number);
  AssetVerified(tokenId: bigint, verifiedBy: string, verificationStatus: VerificationStatus);
  ListingCreated(listingId: string, tokenId: bigint, seller: string, price: bigint);
  ListingSold(listingId: string, buyer: string, salePrice: bigint);
  ListingCancelled(listingId: string);
  BidCreated(bidId: string, tokenId: bigint, bidder: string, amount: bigint);
  BidAccepted(bidId: string, tokenId: bigint, acceptor: string);
  BidCancelled(bidId: string);
  RoyaltySet(tokenId: bigint, recipient: string, percentage: number);
  RoyaltyPaid(tokenId: bigint, recipient: string, amount: bigint);
  FuturesContractCreated(contractId: string, tokenId: bigint, deliveryDate: bigint);
  FuturesContractSettled(contractId: string, settlementPrice: bigint);
  BundleCreated(bundleId: string, tokenIds: bigint[], creator: string);
  BundleSold(bundleId: string, buyer: string);
  TokenStaked(tokenId: bigint, staker: string, stakingPeriod: bigint);
  TokenUnstaked(tokenId: bigint, staker: string, rewards: bigint);
  StakingRewardsClaimed(tokenId: bigint, staker: string, rewardAmount: bigint);
  EnergyProductionLinked(tokenId: bigint, productionId: string);
  CarbonCreditsCalculated(tokenId: bigint, creditAmount: bigint);
  ContractPaused();
  ContractUnpaused();
  VerificationAuthorityChanged(newAuthority: string);
  MarketplaceFeeUpdated(oldFee: number, newFee: number);
  EmergencyTransfer(tokenId: bigint, to: string);
  EmergencyBurn(tokenId: bigint);
}

export interface IEnergyAssetNFTErrors {
  TokenNotFound(tokenId: bigint);
  NotTokenOwner(tokenId: bigint, caller: string);
  InvalidTokenId();
  ZeroAddress();
  InsufficientApproval(tokenId: bigint, operator: string);
  TokenAlreadyMinted(tokenId: bigint);
  InvalidEnergyType();
  InvalidEnergyAmount();
  InvalidMetadata();
  AssetNotVerified(tokenId: bigint);
  ListingNotFound(listingId: string);
  ListingNotActive(listingId: string);
  InsufficientPayment(expected: bigint, received: bigint);
  BidNotFound(bidId: string);
  BidNotActive(bidId: string);
  InvalidRoyaltyPercentage();
  FuturesContractNotFound(contractId: string);
  ContractNotSettled(contractId: string);
  BundleNotFound(bundleId: string);
  BundleNotActive(bundleId: string);
  StakingPositionNotFound(tokenId: bigint);
  StakingPeriodNotEnded(tokenId: bigint);
  ContractPaused();
  Unauthorized();
  TransferFailed();
  ApprovalFailed();
  VerificationFailed(tokenId: bigint);
  InvalidProductionData();
  InvalidMarketplaceType();
  InsufficientCollateral();
  CollateralLocked();
  BundleSplitFailed();
  DuplicateVerification(tokenId: bigint);
  ExpiredListing(listingId: string);
  InsufficientBalance();
  InvalidCurrency();
  PriceOutOfRange();
  InvalidDeliveryDate();
  InvalidStrikePrice();
  ContractAlreadySettled(contractId: string);
  StakingAlreadyActive(tokenId: bigint);
  RewardsCalculationError(tokenId: bigint);
}
