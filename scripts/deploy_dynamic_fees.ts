import { DynamicFeeSwitch } from '../contracts/fees/DynamicFeeSwitch';

async function main() {
    console.log("Deploying Dynamic Fee Switch...");
    const feeSwitch = new DynamicFeeSwitch();
    console.log("Deployment complete.");
    
    // Simulate initial setup
    feeSwitch.updateNetworkConditions(0.1);
    console.log("Initial network conditions set.");
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
});
