const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Carbon Credit Trading Marketplace...");

  // Deploy the contract
  const CarbonCreditTrading = await ethers.getContractFactory("CarbonCreditTrading");
  const carbonMarket = await CarbonCreditTrading.deploy(
    "CurrentDao Carbon Credit",  // Token name
    "CARBON"                     // Token symbol
  );

  await carbonMarket.deployed();

  console.log(`CarbonCreditTrading deployed to: ${carbonMarket.address}`);
  console.log(`Transaction hash: ${carbonMarket.deployTransaction.hash}`);

  // Setup initial verifiers
  const [owner, verifier1, verifier2] = await ethers.getSigners();
  
  console.log("Setting up verifiers...");
  await carbonMarket.addVerifier(verifier1.address);
  await carbonMarket.addVerifier(verifier2.address);
  
  console.log(`Added verifier: ${verifier1.address}`);
  console.log(`Added verifier: ${verifier2.address}`);

  // Set initial trading fee (0.5%)
  console.log("Setting trading fee...");
  await carbonMarket.setTradingFee(50); // 50 basis points = 0.5%
  
  console.log("Trading fee set to 0.5%");

  // Verify setup
  console.log("\nDeployment Summary:");
  console.log(`Contract Address: ${carbonMarket.address}`);
  console.log(`Owner: ${owner.address}`);
  console.log(`Verifiers: ${verifier1.address}, ${verifier2.address}`);
  console.log(`Trading Fee: 0.5%`);
  console.log(`Network: ${network.name}`);

  // Example: Issue a sample carbon credit for testing
  console.log("\nIssuing sample carbon credit...");
  const sampleCredit = await carbonMarket.issueCredit(
    "SAMPLE-001",
    ethers.utils.parseUnits("1000", 0), // 1000 tonnes
    2023,
    "VCS",
    "Forestry",
    "https://api.currentdao.io/metadata/sample-001"
  );
  
  await sampleCredit.wait();
  console.log(`Sample credit issued with transaction hash: ${sampleCredit.hash}`);

  // Verify the sample credit
  console.log("Verifying sample credit...");
  const verification = await carbonMarket.connect(verifier1).verifyCredit(
    1, // First credit ID
    true,
    "https://api.currentdao.io/reports/sample-001",
    95
  );
  
  await verification.wait();
  console.log(`Sample credit verified with transaction hash: ${verification.hash}`);

  // Get contract information
  const totalSupply = await carbonMarket.getTotalSupply();
  const marketplaceStats = await carbonMarket.getMarketplaceStats();
  
  console.log("\nContract State:");
  console.log(`Total Supply: ${totalSupply.toString()} tonnes CO2`);
  console.log(`Total Credits: ${marketplaceStats.totalCredits.toString()}`);
  console.log(`Active Orders: ${marketplaceStats.activeOrders.toString()}`);
  console.log(`Total Trades: ${marketplaceStats.totalTrades.toString()}`);

  console.log("\nDeployment completed successfully!");
  console.log("You can now interact with the contract using the following address:");
  console.log(carbonMarket.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
