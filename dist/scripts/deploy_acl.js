#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AccessControlList_1 = require("../contracts/acl/AccessControlList");
class ACLDeployer {
    config;
    constructor(config) {
        this.config = config;
    }
    async deploy() {
        const start = Date.now();
        try {
            this.validateConfig();
            this.logConfig();
            if (this.config.dryRun) {
                console.log('Dry run enabled. Skipping instantiation.');
                return {
                    success: true,
                    deploymentTime: Date.now() - start
                };
            }
            const acl = new AccessControlList_1.AccessControlList({
                config: {
                    governanceMembers: this.config.governanceMembers,
                    emergencyCouncil: this.config.emergencyCouncil,
                    governanceThreshold: this.config.governanceThreshold || this.defaultThreshold(),
                    communityQuorum: this.config.communityQuorum || this.defaultQuorum()
                },
                bootstrapActor: 'DEPLOYER'
            });
            const roleCount = acl.getRoles().length;
            const permissionCount = acl.getPermissions().length;
            console.log(`ACL deployed for ${this.config.network}`);
            console.log(`Predefined roles: ${roleCount}`);
            console.log(`Registered permissions: ${permissionCount}`);
            return {
                success: true,
                deploymentTime: Date.now() - start,
                roleCount,
                permissionCount
            };
        }
        catch (error) {
            return {
                success: false,
                deploymentTime: Date.now() - start,
                error: error instanceof Error ? error.message : 'Unknown deployment error'
            };
        }
    }
    validateConfig() {
        if (this.config.governanceMembers.length < this.defaultThreshold()) {
            throw new Error('Governance member count is below the required threshold for this network');
        }
        if (this.config.emergencyCouncil.length === 0) {
            throw new Error('At least one emergency council member is required');
        }
    }
    logConfig() {
        console.log('ACL deployment configuration');
        console.log(`Network: ${this.config.network}`);
        console.log(`Governance members: ${this.config.governanceMembers.length}`);
        console.log(`Emergency council members: ${this.config.emergencyCouncil.length}`);
    }
    defaultThreshold() {
        switch (this.config.network) {
            case 'mainnet':
                return 4;
            case 'testnet':
                return 3;
            default:
                return 2;
        }
    }
    defaultQuorum() {
        switch (this.config.network) {
            case 'mainnet':
                return 3;
            case 'testnet':
                return 2;
            default:
                return 1;
        }
    }
}
async function main() {
    const deployer = new ACLDeployer({
        network: 'development',
        governanceMembers: ['0xgov1', '0xgov2', '0xgov3'],
        emergencyCouncil: ['0xemergency1', '0xemergency2'],
        dryRun: false
    });
    const result = await deployer.deploy();
    if (!result.success) {
        throw new Error(result.error || 'ACL deployment failed');
    }
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=deploy_acl.js.map