import { ReentrancyType, ReentrancyEvent } from "../interfaces/IReentrancyGuard";

export class ReentrancyLib {
  private static readonly GUARD_KEY = "REENTRANCY_GUARD_SLOT";
  private static readonly LOGS_KEY = "REENTRANCY_LOGS_SLOT";

  /**
   * @dev Validates the reentrancy state.
   */
  public static validateState(locked: boolean): void {
    if (locked) {
      throw new Error("REENTRANCY_ATTEMPT_DETECTED: Contract is already entered");
    }
  }

  /**
   * @dev Generates a unique hash for the call stack.
   */
  public static generateCallHash(caller: string, target: string, selector: string): string {
    return `${caller}:${target}:${selector}`;
  }

  /**
   * @dev Logs a reentrancy attempt.
   */
  public static formatLog(event: ReentrancyEvent): string {
    return `[REENTRANCY_LOG] [${new Date(event.timestamp).toISOString()}] 
            Type: ${ReentrancyType[event.type]} 
            Caller: ${event.caller} 
            Target: ${event.target} 
            Depth: ${event.depth} 
            Stack: ${event.stackTrace.join(" -> ")}`;
  }

  /**
   * @dev Performs deep stack inspection for potential reentrancy.
   */
  public static inspectStack(stack: string[]): ReentrancyType {
    if (stack.length === 0) return ReentrancyType.NONE;

    const currentCall = stack[stack.length - 1];
    const previousCalls = stack.slice(0, stack.length - 1);

    if (previousCalls.includes(currentCall)) {
      return ReentrancyType.SAME_FUNCTION;
    }

    const currentContract = currentCall.split(":")[0];
    const previousContracts = previousCalls.map(call => call.split(":")[0]);

    if (previousContracts.includes(currentContract)) {
      return ReentrancyType.CROSS_FUNCTION;
    }

    return ReentrancyType.NONE;
  }
}
