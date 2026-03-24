import { ReentrancyType, ReentrancyEvent, GuardConfig } from "../interfaces/IReentrancyGuard";
import { ReentrancyLib } from "../libraries/ReentrancyLib";

export class ReentrancyDetector {
  private config: GuardConfig;
  private callStack: string[] = [];
  private logs: ReentrancyEvent[] = [];

  constructor(config: GuardConfig) {
    this.config = config;
  }

  /**
   * @dev Tracks a new call in the stack and checks for reentrancy.
   */
  public enterCall(caller: string, target: string, selector: string): ReentrancyType {
    const callHash = ReentrancyLib.generateCallHash(caller, target, selector);
    this.callStack.push(callHash);

    const reentrancyType = ReentrancyLib.inspectStack(this.callStack);

    if (reentrancyType !== ReentrancyType.NONE) {
      this.handleDetection(reentrancyType, caller, target);
    }

    if (this.callStack.length > this.config.maxDepth) {
      throw new Error(`MAX_CALL_DEPTH_EXCEEDED: Depth limit is ${this.config.maxDepth}`);
    }

    return reentrancyType;
  }

  /**
   * @dev Removes a call from the stack.
   */
  public exitCall(): void {
    this.callStack.pop();
  }

  /**
   * @dev Handles a detected reentrancy attempt.
   */
  private handleDetection(type: ReentrancyType, caller: string, target: string): void {
    const event: ReentrancyEvent = {
      type,
      timestamp: Date.now(),
      caller,
      target,
      depth: this.callStack.length,
      stackTrace: [...this.callStack]
    };

    if (this.config.loggingEnabled) {
      this.logs.push(event);
      console.log(ReentrancyLib.formatLog(event));
    }

    if (this.config.blockOnAttack) {
      throw new Error(`REENTRANCY_ATTACK_PREVENTED: Detected type ${ReentrancyType[type]}`);
    }
  }

  public getLogs(): ReentrancyEvent[] {
    return this.logs;
  }

  public clearLogs(): void {
    this.logs = [];
  }
}
