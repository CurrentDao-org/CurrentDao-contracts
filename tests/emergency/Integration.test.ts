import { EmergencyPause } from '../../contracts/emergency/EmergencyPause';
import { 
  PauseLevel, 
  EmergencyConfig, 
  DEFAULT_EMERGENCY_CONFIG 
} from '../../contracts/emergency/structures/PauseStructure';

/**
 * Mock contract for integration testing
 */
class MockContract {
  public address: string;
  public isPaused: boolean = false;
  public pauseLevel: PauseLevel = PauseLevel.NONE;
  public pauseReason: string = '';

  constructor(address: string) {
    this.address = address;
  }

  public async executeOperation(operation: string): Promise<string> {
    if (this.isPaused) {
      throw new Error(`Contract ${this.address} is paused due to emergency`);
    }
    return `Operation ${operation} executed successfully`;
  }

  public onPause(level: PauseLevel, reason: string): void {
    this.isPaused = true;
    this.pauseLevel = level;
    this.pauseReason = reason;
  }

  public onResume(): void {
    this.isPaused = false;
    this.pauseLevel = PauseLevel.NONE;
    this.pauseReason = '';
  }
}

describe('Emergency Pause Integration Tests', () => {
  let emergencyPause: EmergencyPause;
  let mockContracts: Map<string, MockContract>;
  let governanceMembers: string[];
  let testConfig: EmergencyConfig;

  beforeEach(() => {
    governanceMembers = [
      '0x1234567890123456789012345678901234567890',
      '0x2345678901234567890123456789012345678901',
      '0x3456789012345678901234567890123456789012'
    ];

    mockContracts = new Map([
      ['0x1111111111111111111111111111111111111111', new MockContract('0x1111111111111111111111111111111111111111')],
      ['0x2222222222222222222222222222222222222222', new MockContract('0x2222222222222222222222222222222222222222')],
      ['0x3333333333333333333333333333333333333333', new MockContract('0x3333333333333333333333333333333333333333')]
    ]);

    testConfig = {
      ...DEFAULT_EMERGENCY_CONFIG,
      governanceMembers,
      criticalContracts: [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222'
      ],
      requiredSignatures: 2
    };

    // Initialize EmergencyPause with event handlers that update mock contracts
    emergencyPause = new EmergencyPause(governanceMembers, testConfig, {
      EmergencyPauseInitiated: (event) => {
        if (event.level === PauseLevel.FULL) {
          mockContracts.forEach(c => c.onPause(event.level, event.reason));
        } else {
          event.affectedContracts.forEach(addr => {
            mockContracts.get(addr)?.onPause(event.level, event.reason);
          });
        }
      },
      EmergencyPauseResumed: (event) => {
        mockContracts.forEach(c => c.onResume());
      }
    });
  });

  describe('Contract State Integration', () => {
    it('should pause selective contracts', async () => {
      const affected = ['0x1111111111111111111111111111111111111111'];
      await emergencyPause.emergencyPause(
        PauseLevel.SELECTIVE,
        'Security vulnerability in token contract',
        3600,
        affected
      );

      expect(mockContracts.get('0x1111111111111111111111111111111111111111')!.isPaused).toBe(true);
      expect(mockContracts.get('0x2222222222222222222222222222222222222222')!.isPaused).toBe(false);
    });

    it('should pause all critical contracts during PARTIAL pause', async () => {
      // Use empty array to trigger auto-population of critical contracts
      await emergencyPause.emergencyPause(
        PauseLevel.PARTIAL,
        'Critical bug discovered in platform core',
        7200,
        []
      );

      // Verify all critical contracts are paused
      testConfig.criticalContracts.forEach(contractAddress => {
        const contract = mockContracts.get(contractAddress);
        expect(contract!.isPaused).toBe(true);
      });
    });

    it('should pause all contracts during FULL pause', async () => {
      await emergencyPause.emergencyPause(
        PauseLevel.FULL,
        'System-wide security emergency',
        86400,
        []
      );

      // Verify all contracts are paused
      for (const [address, contract] of mockContracts) {
        expect(contract.isPaused).toBe(true);
      }
    });

    it('should resume operations correctly', async () => {
      await emergencyPause.emergencyPause(
        PauseLevel.FULL,
        'Test pause',
        3600,
        []
      );

      const signatures = governanceMembers.slice(0, 2);
      await emergencyPause.resumeOperations(PauseLevel.FULL, signatures, '0xproof');

      for (const [address, contract] of mockContracts) {
        expect(contract.isPaused).toBe(false);
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle contract integration errors gracefully', async () => {
      class FaultyContract extends MockContract {
        public async executeOperation(operation: string): Promise<string> {
          if (this.isPaused) {
            throw new Error(`Faulty contract ${this.address} is paused`);
          }
          return super.executeOperation(operation);
        }
      }

      const faultyAddress = '0x9999999999999999999999999999999999999999';
      const faultyContract = new FaultyContract(faultyAddress);
      mockContracts.set(faultyAddress, faultyContract);

      await emergencyPause.emergencyPause(
        PauseLevel.SELECTIVE,
        'Error handling test',
        3600,
        [faultyAddress]
      );

      await expect(
        faultyContract.executeOperation('normal_operation')
      ).rejects.toThrow(`Faulty contract ${faultyAddress} is paused`);
    });
  });
});
