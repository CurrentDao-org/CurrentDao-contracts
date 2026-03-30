import { IReentrancyGuard, GuardConfig } from "./interfaces/IReentrancyGuard";
import { ReentrancyDetector } from "./detection/ReentrancyDetector";
import { StateProtection } from "./protection/StateProtection";
import { CallStackMonitor } from "./monitoring/CallStackMonitor";

export class ReentrancyGuard implements IReentrancyGuard {
  private config: GuardConfig;
  private detector: ReentrancyDetector;
  private stateProtection: StateProtection;
  private callStackMonitor: CallStackMonitor;
  private paused: boolean = false;

  constructor(config?: Partial<GuardConfig>) {
    this.config = {
      maxDepth: config?.maxDepth || 10,
      detectionThreshold: config?.detectionThreshold || 1,
      loggingEnabled: config?.loggingEnabled ?? true,
      blockOnAttack: config?.blockOnAttack ?? true,
    };

    this.detector = new ReentrancyDetector(this.config);
    this.stateProtection = new StateProtection();
    this.callStackMonitor = new CallStackMonitor();
  }

  /**
   * @dev Returns true if the guard is locked.
   */
  public locked(): boolean {
    return this.stateProtection.isProtected();
  }

  /**
   * @dev Modifier-like function to protect execution.
   * Usage: guard.nonReentrant(() => { ... logic ... }, "caller", "target", "selector");
   */
  public async protect<T>(
    fn: () => Promise<T> | T,
    caller: string,
    target: string,
    selector: string
  ): Promise<T> {
    if (this.paused) {
      throw new Error("REENTRANCY_GUARD_PAUSED: Emergency control active");
    }

    this.callStackMonitor.push(`${caller}:${target}:${selector}`);
    this.detector.enterCall(caller, target, selector);
    this.stateProtection.lock();

    try {
      const result = await fn();
      return result;
    } finally {
      this.stateProtection.unlock();
      this.detector.exitCall();
      this.callStackMonitor.pop();
    }
  }

  /**
   * @dev Compat with requested interface.
   */
  public nonReentrant(): void {
    if (this.locked()) {
      throw new Error("REENTRANCY_ATTEMPT_DETECTED");
    }
  }

  /**
   * @dev Resets the guard.
   */
  public resetGuard(): void {
    this.stateProtection.unlock();
    this.callStackMonitor.reset();
    this.detector.clearLogs();
  }

  /**
   * @dev Reconfigures the guard.
   */
  public configure(config: GuardConfig): void {
    this.config = config;
    this.detector = new ReentrancyDetector(config);
  }

  /**
   * @dev Emergency controls.
   */
  public emergencyPause(): void {
    this.paused = true;
  }

  public emergencyUnpause(): void {
    this.paused = false;
  }

  /**
   * @dev Access to monitoring data.
   */
  public getMonitorData() {
    return {
      depth: this.callStackMonitor.getDepth(),
      stackTrace: this.callStackMonitor.getStackTrace(),
      logs: this.detector.getLogs()
    };
  }
}
