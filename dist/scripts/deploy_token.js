"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WattToken_1 = require("../contracts/token/WattToken");
async function main() {
    console.log("Starting $WATT Energy Token Deployment...");
    const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || "0xDeployerAdmin";
    console.log(`Deploying with Admin Address: ${ADMIN_ADDRESS}`);
    const wattToken = new WattToken_1.WattToken(ADMIN_ADDRESS);
    console.log(`WattToken successfully deployed! Name: ${wattToken.name}, Symbol: ${wattToken.symbol}`);
}
main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
//# sourceMappingURL=deploy_token.js.map