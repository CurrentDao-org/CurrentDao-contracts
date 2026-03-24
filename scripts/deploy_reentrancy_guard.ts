import { ReentrancyGuard } from "../contracts/security/ReentrancyGuard";

async function main() {
  console.log("Deploying Reentrancy Guard...");

  const config = {
    maxDepth: 10,
    loggingEnabled: true,
    blockOnAttack: true
  };

  const guard = new ReentrancyGuard(config);
  
  console.log("Reentrancy Guard initialized with configuration:");
  console.log(JSON.stringify(config, null, 2));

  // Simulating deployment logic
  console.log("Guard instance created at simulated address: 0x9876...5432");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
