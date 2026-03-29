"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DynamicFeeSwitch_1 = require("../contracts/fees/DynamicFeeSwitch");
async function main() {
    console.log("Deploying Dynamic Fee Switch...");
    const feeSwitch = new DynamicFeeSwitch_1.DynamicFeeSwitch();
    console.log("Deployment complete.");
    // Simulate initial setup
    feeSwitch.updateNetworkConditions(0.1);
    console.log("Initial network conditions set.");
}
main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
});
//# sourceMappingURL=deploy_dynamic_fees.js.map