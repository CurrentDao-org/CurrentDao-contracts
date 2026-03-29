import { ethers } from 'hardhat';
import { OrderMatchingEngine } from '../contracts/matching/OrderMatchingEngine';
import { 
  MatchingConfig, 
  MatchingPriority, 
  EnergyQuality, 
  Location,
  DEFAULT_MATCHING_CONFIG 
} from '../contracts/matching/interfaces/IMatchingEngine';

/**
 * @title Deploy Matching Engine
 * @dev Deployment script for the Order Matching Engine
 */
async function main() {
  console.log('🚀 Starting Order Matching Engine deployment...\n');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);

  try {
    // Deploy OrderMatchingEngine
    console.log('🔧 Deploying OrderMatchingEngine...');
    const OrderMatchingEngineFactory = await ethers.getContractFactory('OrderMatchingEngine');
    const matchingEngine = await OrderMatchingEngineFactory.deploy(deployer.address);
    await matchingEngine.deployed();
    
    console.log(`✅ OrderMatchingEngine deployed to: ${matchingEngine.address}\n`);

    // Configure the matching engine
    console.log('⚙️  Configuring matching engine...');
    
    const config: MatchingConfig = {
      ...DEFAULT_MATCHING_CONFIG,
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

    const configTx = await matchingEngine.updateConfig(config, deployer.address);
    await configTx.wait();
    console.log('✅ Matching engine configured\n');

    // Verify configuration
    const deployedConfig = await matchingEngine.getConfig();
    console.log('📊 Current Configuration:');
    console.log(`   Enabled: ${deployedConfig.enabled}`);
    console.log(`   Priority: ${deployedConfig.priority}`);
    console.log(`   Max Distance: ${deployedConfig.maxDistance} km`);
    console.log(`   Matching Fee Rate: ${deployedConfig.matchingFeeRate} basis points`);
    console.log(`   Batch Processing Size: ${deployedConfig.batchProcessingSize}\n`);

    // Create sample orders for testing
    console.log('🧪 Creating sample orders for testing...');
    
    const sampleLocation: Location = {
      latitude: 52.5200,
      longitude: 13.4050,
      region: 'Berlin',
      country: 'Germany'
    };

    // Create sample buy order
    const buyOrderTx = await matchingEngine.createOrder(
      deployer.address,
      0, // OrderType.BUY
      100, // amount
      ethers.utils.parseUnits('50', 18), // price
      sampleLocation,
      0, // EnergyQuality.STANDARD
      Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
      10, // minFillAmount
      5, // maxPriceSlippage
      ['Berlin', 'Hamburg'], // preferredRegions
      [0, 1] // qualityPreferences
    );
    await buyOrderTx.wait();
    console.log('✅ Sample buy order created');

    // Create sample sell order
    const sellOrderTx = await matchingEngine.createOrder(
      deployer.address,
      1, // OrderType.SELL
      100, // amount
      ethers.utils.parseUnits('48', 18), // price
      sampleLocation,
      0, // EnergyQuality.STANDARD
      Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
      10, // minFillAmount
      5, // maxPriceSlippage
      ['Berlin', 'Munich'], // preferredRegions
      [0, 1] // qualityPreferences
    );
    await sellOrderTx.wait();
    console.log('✅ Sample sell order created\n');

    // Test matching
    console.log('🔄 Testing order matching...');
    const orderBook = await matchingEngine.getOrderBook();
    console.log(`📈 Order Book Status:`);
    console.log(`   Bids: ${orderBook.bids.length}`);
    console.log(`   Asks: ${orderBook.asks.length}`);
    console.log(`   Spread: ${ethers.utils.formatUnits(orderBook.spread, 18)}`);
    console.log(`   Total Volume: ${ethers.utils.formatUnits(orderBook.totalVolume, 18)}\n`);

    // Get statistics
    const stats = await matchingEngine.getStatistics();
    console.log('📊 Initial Statistics:');
    console.log(`   Total Orders: ${stats.totalOrders}`);
    console.log(`   Total Matches: ${stats.totalMatches}`);
    console.log(`   Total Volume: ${ethers.utils.formatUnits(stats.totalVolume, 18)}`);
    console.log(`   Average Match Size: ${ethers.utils.formatUnits(stats.averageMatchSize, 18)}\n`);

    // Set up geographic preferences
    console.log('🌍 Setting up geographic preferences...');
    const geoPrefs = [
      {
        region: 'Berlin',
        priority: 10,
        maxDistance: 100
      },
      {
        region: 'Hamburg',
        priority: 8,
        maxDistance: 300
      }
    ];

    const geoPrefTx = await matchingEngine.setGeographicPreference(
      deployer.address,
      geoPrefs,
      deployer.address
    );
    await geoPrefTx.wait();
    console.log('✅ Geographic preferences set\n');

    // Set up quality preferences
    console.log('⭐ Setting up quality preferences...');
    const qualityPrefs = [
      {
        quality: 2, // EnergyQuality.GREEN
        minScore: 80,
        premium: 10
      },
      {
        quality: 3, // EnergyQuality.PREMIUM_GREEN
        minScore: 90,
        premium: 15
      }
    ];

    const qualityPrefTx = await matchingEngine.setQualityPreference(
      deployer.address,
      qualityPrefs,
      deployer.address
    );
    await qualityPrefTx.wait();
    console.log('✅ Quality preferences set\n');

    // Get deployment summary
    console.log('📋 Deployment Summary:');
    console.log('========================');
    console.log(`📍 Contract Address: ${matchingEngine.address}`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`⛽ Gas Used: ${(await matchingEngine.deployTransaction.wait()).gasUsed.toString()}`);
    console.log(`🔗 Network: ${network.name}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}\n`);

    // Save deployment info to file
    const deploymentInfo = {
      network: network.name,
      deployer: deployer.address,
      contractAddress: matchingEngine.address,
      config: deployedConfig,
      timestamp: new Date().toISOString(),
      transactionHash: matchingEngine.deployTransaction.hash
    };

    const fs = require('fs');
    fs.writeFileSync(
      `deployments/matching-engine-${network.name}-${Date.now()}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log('💾 Deployment info saved to deployments/ directory\n');

    console.log('🎉 Order Matching Engine deployed successfully!');
    console.log('🔍 You can now interact with the contract at:', matchingEngine.address);
    console.log('📖 Check the documentation for usage examples.\n');

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

/**
 * @title Verify Deployment
 * @dev Script to verify the deployed contract
 */
async function verifyDeployment(contractAddress: string) {
  console.log(`🔍 Verifying contract at ${contractAddress}...`);
  
  try {
    await hre.run('verify:verify', {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log('✅ Contract verified successfully!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

/**
 * @title Upgrade Matching Engine
 * @dev Script to upgrade the matching engine to a new version
 */
async function upgradeMatchingEngine(newImplementationAddress: string) {
  console.log('🔄 Upgrading Order Matching Engine...');
  
  const [deployer] = await ethers.getSigners();
  const matchingEngine = await ethers.getContractAt('OrderMatchingEngine', process.env.MATCHING_ENGINE_ADDRESS!);
  
  try {
    const tx = await matchingEngine.upgradeTo(newImplementationAddress);
    await tx.wait();
    console.log('✅ Matching Engine upgraded successfully!');
  } catch (error) {
    console.error('❌ Upgrade failed:', error);
  }
}

/**
 * @title Emergency Functions
 * @dev Script to handle emergency situations
 */
async function emergencyCancelAll(reason: string) {
  console.log('🚨 Emergency cancellation of all orders...');
  
  const [deployer] = await ethers.getSigners();
  const matchingEngine = await ethers.getContractAt('OrderMatchingEngine', process.env.MATCHING_ENGINE_ADDRESS!);
  
  try {
    const tx = await matchingEngine.emergencyCancelAll(reason, deployer.address);
    await tx.wait();
    console.log('✅ All orders cancelled successfully!');
  } catch (error) {
    console.error('❌ Emergency cancellation failed:', error);
  }
}

/**
 * @title Performance Testing
 * @dev Script to test matching engine performance
 */
async function performanceTest() {
  console.log('⚡ Running performance tests...');
  
  const [deployer] = await ethers.getSigners();
  const matchingEngine = await ethers.getContractAt('OrderMatchingEngine', process.env.MATCHING_ENGINE_ADDRESS!);
  
  const sampleLocation: Location = {
    latitude: 52.5200,
    longitude: 13.4050,
    region: 'Berlin',
    country: 'Germany'
  };

  const startTime = Date.now();
  const orderCount = 1000;
  
  try {
    // Create multiple orders
    const orderIds: string[] = [];
    
    for (let i = 0; i < orderCount; i++) {
      const isBuy = i % 2 === 0;
      const price = ethers.utils.parseUnits((45 + Math.random() * 20).toString(), 18);
      
      const tx = await matchingEngine.createOrder(
        deployer.address,
        isBuy ? 0 : 1, // OrderType
        100 + Math.floor(Math.random() * 900), // amount
        price,
        sampleLocation,
        Math.floor(Math.random() * 4), // quality
        Math.floor(Date.now() / 1000) + 3600, // expires
        10, // minFillAmount
        5, // maxPriceSlippage
        ['Berlin'], // preferredRegions
        [0, 1] // qualityPreferences
      );
      
      const receipt = await tx.wait();
      orderIds.push(receipt.events?.[0].args?.orderId);
      
      if (i % 100 === 0) {
        console.log(`Created ${i} orders...`);
      }
    }
    
    const creationTime = Date.now() - startTime;
    console.log(`✅ Created ${orderCount} orders in ${creationTime}ms`);
    console.log(`⚡ Average: ${creationTime / orderCount}ms per order`);
    
    // Run batch matching
    const matchStartTime = Date.now();
    const result = await matchingEngine.matchBatch(orderIds.slice(0, 100)); // Match first 100
    const matchTime = Date.now() - matchStartTime;
    
    console.log(`✅ Batch matched 100 orders in ${matchTime}ms`);
    console.log(`🎯 Matches found: ${result.matches.length}`);
    console.log(`💰 Total matched amount: ${ethers.utils.formatUnits(result.totalMatchedAmount, 18)}`);
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      main()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error(error);
          process.exit(1);
        });
      break;
      
    case 'verify':
      const contractAddress = process.argv[3];
      if (!contractAddress) {
        console.error('Please provide contract address: npm run deploy verify <address>');
        process.exit(1);
      }
      verifyDeployment(contractAddress)
        .then(() => process.exit(0))
        .catch((error) => {
          console.error(error);
          process.exit(1);
        });
      break;
      
    case 'upgrade':
      const newAddress = process.argv[3];
      if (!newAddress) {
        console.error('Please provide new implementation address: npm run deploy upgrade <address>');
        process.exit(1);
      }
      upgradeMatchingEngine(newAddress)
        .then(() => process.exit(0))
        .catch((error) => {
          console.error(error);
          process.exit(1);
        });
      break;
      
    case 'emergency':
      const reason = process.argv[3] || 'Emergency maintenance';
      emergencyCancelAll(reason)
        .then(() => process.exit(0))
        .catch((error) => {
          console.error(error);
          process.exit(1);
        });
      break;
      
    case 'test':
      performanceTest()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error(error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Available commands:');
      console.log('  deploy                    - Deploy the matching engine');
      console.log('  verify <address>          - Verify contract on Etherscan');
      console.log('  upgrade <address>         - Upgrade to new implementation');
      console.log('  emergency [reason]        - Emergency cancel all orders');
      console.log('  test                      - Run performance tests');
      process.exit(1);
  }
}

export {
  main,
  verifyDeployment,
  upgradeMatchingEngine,
  emergencyCancelAll,
  performanceTest
};
