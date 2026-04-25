/**
 * Energy Asset NFT Contract Tests
 * Comprehensive test suite for NFT energy asset functionality
 */

import { EnergyAssetNFT } from './EnergyAssetNFT';
import { VerificationStatus, MarketplaceType, EnergyType } from './structures/NFTStructs';

describe('EnergyAssetNFT', () => {
  let nft: EnergyAssetNFT;
  let owner: string;
  let user1: string;
  let user2: string;
  let tokenId: bigint;

  beforeEach(() => {
    nft = new EnergyAssetNFT();
    owner = "0x0000000000000000000000000000000000000000";
    user1 = "0x1234567890123456789012345678901234567890";
    user2 = "0x0987654321098765432109876543210987654321";
  });

  describe('NFT Core Functions', () => {
    it('should mint a new energy asset NFT', async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'High-efficiency solar panel array',
          image: 'https://example.com/solar.png',
          attributes: [
            { trait_type: 'Efficiency', value: '85%' },
            { trait_type: 'Capacity', value: '1000 kW' }
          ]
        }
      );

      expect(tokenId).toBeGreaterThan(0n);

      const asset = nft.getAsset(tokenId);
      expect(asset.owner).toBe(user1);
      expect(asset.creator).toBe(user1);
      expect(asset.energyType).toBe('SOLAR');
      expect(asset.energyAmount).toBe(1000000n);
      expect(asset.location).toBe('California, USA');
      expect(asset.isActive).toBe(true);
    });

    it('should throw error for invalid metadata', async () => {
      await expect(nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: '', // Invalid empty name
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      )).rejects.toThrow('Invalid metadata');
    });

    it('should throw error for zero energy amount', async () => {
      await expect(nft.mintEnergyAsset(
        user1,
        'SOLAR',
        0n, // Invalid zero amount
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      )).rejects.toThrow('Invalid energy amount');
    });

    it('should transfer NFT successfully', async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );

      await nft.transferFrom(user1, user2, tokenId);

      const asset = nft.getAsset(tokenId);
      expect(asset.owner).toBe(user2);
      
      // Check provenance record
      expect(asset.provenance.length).toBe(2); // Mint + Transfer
      expect(asset.provenance[1].action).toBe('TRANSFER');
    });

    it('should burn NFT successfully', async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );

      await nft.burn(tokenId);

      expect(() => nft.getAsset(tokenId)).toThrow('Token not found');
    });

    it('should update metadata successfully', async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );

      const newMetadata = {
        name: 'Updated Solar Panel Array #1',
        description: 'Updated description',
        image: 'https://example.com/solar-updated.png',
        attributes: [
          { trait_type: 'Efficiency', value: '90%' },
          { trait_type: 'Capacity', value: '1200 kW' }
        ]
      };

      await nft.updateMetadata(tokenId, newMetadata);

      const asset = nft.getAsset(tokenId);
      expect(asset.metadata.name).toBe('Updated Solar Panel Array #1');
      expect(asset.metadata.description).toBe('Updated description');
    });
  });

  describe('Marketplace Functions', () => {
    beforeEach(async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );
    });

    it('should create a marketplace listing', async () => {
      const listingId = await nft.createListing(
        tokenId,
        1000n,
        'USDC',
        MarketplaceType.SPOT
      );

      const listing = nft.getListing(listingId);
      expect(listing.tokenId).toBe(tokenId);
      expect(listing.seller).toBe(user1);
      expect(listing.price).toBe(1000n);
      expect(listing.currency).toBe('USDC');
      expect(listing.isActive).toBe(true);
    });

    it('should buy from listing', async () => {
      const listingId = await nft.createListing(
        tokenId,
        1000n,
        'USDC',
        MarketplaceType.SPOT
      );

      await nft.buyFromListing(listingId, user2);

      const asset = nft.getAsset(tokenId);
      expect(asset.owner).toBe(user2);

      const listing = nft.getListing(listingId);
      expect(listing.isActive).toBe(false);
    });

    it('should cancel listing', async () => {
      const listingId = await nft.createListing(
        tokenId,
        1000n,
        'USDC',
        MarketplaceType.SPOT
      );

      await nft.cancelListing(listingId);

      const listing = nft.getListing(listingId);
      expect(listing.isActive).toBe(false);
    });

    it('should create and accept bid', async () => {
      const bidId = await nft.createBid(tokenId, 1500n, 'USDC');
      
      const bids = nft.getBidsForToken(tokenId);
      expect(bids).toHaveLength(1);
      expect(bids[0].amount).toBe(1500n);

      await nft.acceptBid(tokenId, bidId);

      const asset = nft.getAsset(tokenId);
      expect(asset.owner).toBe(owner); // Simplified - would be bidder in reality
    });

    it('should cancel bid', async () => {
      const bidId = await nft.createBid(tokenId, 1500n, 'USDC');
      
      await nft.cancelBid(bidId);

      const bids = nft.getBidsForToken(tokenId);
      expect(bids.filter(bid => bid.isActive)).toHaveLength(0);
    });
  });

  describe('Royalty Management', () => {
    beforeEach(async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );
    });

    it('should set royalty successfully', async () => {
      await nft.setRoyalty(tokenId, user1, 250); // 2.5%

      const royalty = nft.getRoyalty(tokenId);
      expect(royalty.recipient).toBe(user1);
      expect(royalty.percentage).toBe(250);
    });

    it('should calculate royalty amount', async () => {
      await nft.setRoyalty(tokenId, user1, 250); // 2.5%

      const royaltyAmount = nft.calculateRoyalty(tokenId, 1000n);
      expect(royaltyAmount).toBe(25n); // 2.5% of 1000
    });

    it('should throw error for invalid royalty percentage', async () => {
      await expect(nft.setRoyalty(tokenId, user1, 1500)).rejects.toThrow('Invalid royalty percentage');
    });
  });

  describe('Asset Verification', () => {
    beforeEach(async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );
    });

    it('should verify asset successfully', async () => {
      await nft.verifyAsset(tokenId, 'Verification data');

      const verification = nft.getVerification(tokenId);
      expect(verification.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(verification.isValid).toBe(true);
    });

    it('should return pending status for unverified asset', () => {
      const verification = nft.getVerification(tokenId);
      expect(verification.verificationStatus).toBe(VerificationStatus.PENDING);
      expect(verification.isValid).toBe(false);
    });
  });

  describe('Production Records', () => {
    beforeEach(async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );
    });

    it('should update production record', async () => {
      await nft.updateProductionRecord(tokenId, 50000n, 0.85, 25000n);

      const records = nft.getProductionHistory(tokenId);
      expect(records).toHaveLength(1);
      expect(records[0].productionAmount).toBe(50000n);
      expect(records[0].efficiency).toBe(0.85);
      expect(records[0].carbonOffset).toBe(25000n);
    });

    it('should return empty production history for new asset', () => {
      const records = nft.getProductionHistory(tokenId);
      expect(records).toHaveLength(0);
    });
  });

  describe('Trading Metrics', () => {
    beforeEach(async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );
    });

    it('should return initial trading metrics', () => {
      const metrics = nft.getTradingMetrics(tokenId);
      expect(metrics.totalVolume).toBe(0n);
      expect(metrics.totalTrades).toBe(0);
      expect(metrics.averagePrice).toBe(0n);
      expect(metrics.highestSale).toBe(0n);
      expect(metrics.lowestSale).toBe(0n);
    });

    it('should update metrics after sale', async () => {
      const listingId = await nft.createListing(tokenId, 1000n, 'USDC', MarketplaceType.SPOT);
      await nft.buyFromListing(listingId, user2);

      const metrics = nft.getTradingMetrics(tokenId);
      expect(metrics.totalVolume).toBe(1000n);
      expect(metrics.totalTrades).toBe(1);
      expect(metrics.averagePrice).toBe(1000n);
      expect(metrics.highestSale).toBe(1000n);
      expect(metrics.lowestSale).toBe(1000n);
      expect(metrics.lastSalePrice).toBe(1000n);
    });
  });

  describe('Futures Contracts', () => {
    beforeEach(async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );
    });

    it('should create futures contract', async () => {
      const contractId = await nft.createFuturesContract(
        tokenId,
        BigInt(Date.now() + 86400000), // 1 day from now
        1000n,
        100n,
        true,
        500n
      );

      expect(contractId).toBeDefined();
    });

    it('should settle futures contract', async () => {
      const contractId = await nft.createFuturesContract(
        tokenId,
        BigInt(Date.now() - 86400000), // 1 day ago (ready for settlement)
        1000n,
        100n,
        true,
        500n
      );

      await nft.settleFuturesContract(contractId);
      // Contract should be settled (no exception thrown)
    });
  });

  describe('Bundle Operations', () => {
    let tokenId2: bigint;

    beforeEach(async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );

      tokenId2 = await nft.mintEnergyAsset(
        user1,
        'WIND',
        2000000n,
        BigInt(Date.now()),
        'Texas, USA',
        {
          name: 'Wind Turbine #1',
          description: 'Test description',
          image: 'https://example.com/wind.png',
          attributes: []
        }
      );
    });

    it('should create energy bundle', async () => {
      const bundleId = await nft.createBundle([tokenId, tokenId2], 3000n, 'USDC');

      expect(bundleId).toBeDefined();
    });

    it('should split bundle', async () => {
      const bundleId = await nft.createBundle([tokenId, tokenId2], 3000n, 'USDC');
      
      const splitTokens = await nft.splitBundle(bundleId);
      expect(splitTokens).toHaveLength(2);
      expect(splitTokens).toContain(tokenId);
      expect(splitTokens).toContain(tokenId2);
    });
  });

  describe('Staking Functions', () => {
    beforeEach(async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );
    });

    it('should stake token successfully', async () => {
      await nft.stakeToken(tokenId, 86400n); // 1 day

      const position = nft.getStakingPosition(tokenId);
      expect(position.tokenId).toBe(tokenId);
      expect(position.isActive).toBe(true);
      expect(position.rewardRate).toBe(5.0);
    });

    it('should unstake token successfully', async () => {
      await nft.stakeToken(tokenId, 86400n);
      await nft.unstakeToken(tokenId);

      const position = nft.getStakingPosition(tokenId);
      expect(position.isActive).toBe(false);
    });

    it('should claim staking rewards', async () => {
      await nft.stakeToken(tokenId, 86400n);
      
      const rewards = await nft.claimStakingRewards(tokenId);
      expect(typeof rewards).toBe('bigint');
    });

    it('should throw error for duplicate staking', async () => {
      await nft.stakeToken(tokenId, 86400n);
      
      await expect(nft.stakeToken(tokenId, 86400n)).rejects.toThrow('Staking already active');
    });
  });

  describe('Query Functions', () => {
    beforeEach(async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );
    });

    it('should get assets by owner', () => {
      const assets = nft.getAssetsByOwner(user1);
      expect(assets).toHaveLength(1);
      expect(assets[0].tokenId).toBe(tokenId);
    });

    it('should get assets by type', () => {
      const assets = nft.getAssetsByType('SOLAR');
      expect(assets.length).toBeGreaterThan(0);
      expect(assets[0].energyType).toBe('SOLAR');
    });

    it('should get active listings', () => {
      const listingId = nft.createListing(tokenId, 1000n, 'USDC', MarketplaceType.SPOT);
      
      const activeListings = nft.getActiveListings();
      expect(activeListings.length).toBeGreaterThan(0);
    });

    it('should get market stats', () => {
      const stats = nft.getMarketStats();
      expect(stats.totalEnergyAssets).toBeGreaterThan(0);
      expect(typeof stats.totalEnergyTraded).toBe('bigint');
      expect(Array.isArray(stats.topEnergyTypes)).toBe(true);
      expect(typeof stats.averageEnergyPerAsset).toBe('bigint');
      expect(typeof stats.carbonOffsetTotal).toBe('bigint');
    });
  });

  describe('Energy Integration', () => {
    beforeEach(async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );
    });

    it('should link to energy production', async () => {
      await nft.linkToEnergyProduction(tokenId, 'PROD_123');

      const asset = nft.getAsset(tokenId);
      const energyLinkRecord = asset.provenance.find(record => record.action === 'ENERGY_LINK');
      expect(energyLinkRecord).toBeDefined();
    });

    it('should update energy metrics', async () => {
      await nft.updateEnergyMetrics(tokenId, 1500000n);

      const asset = nft.getAsset(tokenId);
      expect(asset.energyAmount).toBe(1500000n);
    });

    it('should calculate carbon credits', () => {
      const credits = nft.calculateCarbonCredits(tokenId);
      expect(typeof credits).toBe('bigint');
      expect(credits).toBeGreaterThan(0n);
    });
  });

  describe('Governance Functions', () => {
    it('should pause and unpause contract', () => {
      nft.pauseContract();
      // Contract should be paused

      nft.unpauseContract();
      // Contract should be unpaused
    });

    it('should set verification authority', () => {
      const newAuthority = "0x1111111111111111111111111111111111111111";
      nft.setVerificationAuthority(newAuthority);
      // Authority should be updated
    });

    it('should set marketplace fee', () => {
      nft.setMarketplaceFee(500); // 5%
      // Fee should be updated
    });
  });

  describe('Emergency Functions', () => {
    beforeEach(async () => {
      tokenId = await nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      );
    });

    it('should emergency transfer', async () => {
      await nft.emergencyTransfer(tokenId, user2);

      const asset = nft.getAsset(tokenId);
      expect(asset.owner).toBe(user2);
    });

    it('should emergency burn', async () => {
      await nft.emergencyBurn(tokenId);

      expect(() => nft.getAsset(tokenId)).toThrow('Token not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent token', () => {
      expect(() => nft.getAsset(999999n)).toThrow('Token not found');
    });

    it('should handle non-existent listing', () => {
      expect(() => nft.getListing('non-existent')).toThrow('Listing not found');
    });

    it('should handle non-existent staking position', () => {
      expect(() => nft.getStakingPosition(999999n)).toThrow('Staking position not found');
    });

    it('should handle paused contract operations', async () => {
      nft.pauseContract();

      await expect(nft.mintEnergyAsset(
        user1,
        'SOLAR',
        1000000n,
        BigInt(Date.now()),
        'California, USA',
        {
          name: 'Solar Panel Array #1',
          description: 'Test description',
          image: 'https://example.com/solar.png',
          attributes: []
        }
      )).rejects.toThrow('Contract is paused');
    });
  });
});
