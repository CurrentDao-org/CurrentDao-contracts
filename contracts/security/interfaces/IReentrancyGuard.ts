export interface IReentrancyGuard {
  /**
   * @dev Returns true if the guard is locked.
   */
  locked(): boolean;

  /**
   * @dev Prevents a contract from calling itself, directly or indirectly.
   */
  nonReentrant(): void;

  /**
   * @dev Resets the guard to an unlocked state.
   */
  resetGuard(): void;

  /**
   * @dev Sets the configuration for the reentrancy guard.
   */
  configure(config: GuardConfig): void;

  /**
   * @dev Emergency pause for all guarded functions.
   */
  emergencyPause(): void;

  /**
   * @dev Emergency unpause for all guarded functions.
   */
  emergencyUnpause(): void;
}

export interface GuardConfig {
  maxDepth: number;
  detectionThreshold: number;
  loggingEnabled: boolean;
  blockOnAttack: boolean;
}

export enum ReentrancyType {
  NONE,
  SAME_FUNCTION,
  CROSS_FUNCTION,
  CROSS_CONTRACT
}

export interface ReentrancyEvent {
  type: ReentrancyType;
  timestamp: number;
  caller: string;
  target: string;
  depth: number;
  stackTrace: string[];
}
