#!/usr/bin/env node

import { ProposalManager } from '../contracts/proposals/ProposalManager';
import { MockWattToken } from './MockToken'; // Mock for dev; replace with real deployer

interface DeployConfig {
  network: 'development' | 'testnet' | 'mainnet';
  owner: string;
  tokenAddr: string; // WattToken contract address
  governanceAddr?: string; // Optional IGovernance addr
}

class ProposalDeployer {
  config: DeployConfig;

  constructor(config: DeployConfig) {
    this.config = config;
    console.log(`Deploying ProposalManager to ${config.network}...`);
  }

  async deploy(): Promise<string> {
    // Mock deployment - in real Soroban: soroban contract deploy
    const token = new MockWattToken(this.config.tokenAddr);
    const manager = new ProposalManager(token, this.config.owner);
    
    if (this.config.governanceAddr) {
      manager.setGovernance(this.config.governanceAddr);
    }

    // Simulate deployment hash
    const deploymentHash = `proposal_manager_${Date.now()}_${this.config.network}`;
    
    console.log('✅ ProposalManager deployed!');
    console.log('Deployment hash:', deploymentHash);
    console.log('Contract address (mock):', `0x${deploymentHash.slice(0,40)}`);
    console.log('Config:', {
      owner: this.config.owner,
      token: this.config.tokenAddr,
      governance: this.config.governanceAddr || 'not set'
    });

    return deploymentHash;
  }
}

// CLI
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: ts-node scripts/deploy_proposals.ts <network> <owner> <tokenAddr> [governanceAddr]');
  process.exit(1);
}

const [network, owner, tokenAddr, governanceAddr] = args;
const deployer = new ProposalDeployer({ network: network as any, owner, tokenAddr, governanceAddr });
deployer.deploy().catch(console.error);

