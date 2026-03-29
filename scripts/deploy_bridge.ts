import { CrossChainBridge } from '../contracts/bridge/CrossChainBridge';
import { MultiChainValidator } from '../contracts/bridge/MultiChainValidator';
import { IERC20 } from '../scripts/IERC20';

declare var process: any;

async function main() {
    console.log("Starting Cross-Chain Bridge Deployment...");
    
    const admin = "admin_wallet_signature"; // In a real script, this would be the deployer's address
    
    // 1. Deploy MultiChain Validator
    const validator = new MultiChainValidator();
    console.log("MultiChainValidator deployed.");

    // 2. Configure Supported Chains
    validator.registerChain(admin, admin, { 
        chainId: 'Stellar', 
        isActive: true, 
        requiredSignatures: 3 
    });
    validator.registerChain(admin, admin, { 
        chainId: 'Ethereum', 
        isActive: true, 
        requiredSignatures: 2 
    });
    validator.registerChain(admin, admin, { 
        chainId: 'Polygon', 
        isActive: true, 
        requiredSignatures: 2 
    });
    console.log("Supported chains registered (Stellar, Ethereum, Polygon).");

    // 3. Mock tokens map for TS bridge instantiation
    const tokensMap = new Map<string, IERC20>();

    // 4. Deploy Bridge
    const bridge = new CrossChainBridge(admin, validator, tokensMap);
    console.log("CrossChainBridge deployed.");
    
    // 5. Initial configuration
    const defaultEnergyToken = "0xEnergyWattTokenAddress";
    bridge.whitelistAsset(admin, defaultEnergyToken, 100000); // 100k initial liquidity
    console.log(`Asset ${defaultEnergyToken} whitelisted with 100000 initial liquidity.`);

    console.log("Deployment complete.");
}

main().catch((error) => {
    console.error("Error during bridge deployment:", error);
    process.exit(1);
});
