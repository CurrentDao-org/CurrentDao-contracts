import { ReentrancyLib } from "../libraries/ReentrancyLib";

export class StateProtection {
  private isLocked: boolean = false;
  private stateSnapshot: Map<string, any> = new Map();

  /**
   * @dev Acquires a lock for state protection.
   */
  public lock(): void {
    ReentrancyLib.validateState(this.isLocked);
    this.isLocked = true;
  }

  /**
   * @dev Releases the lock.
   */
  public unlock(): void {
    this.isLocked = false;
  }

  /**
   * @dev Creates a snapshot of critical state variables.
   */
  public snapshot(key: string, value: any): void {
    this.stateSnapshot.set(key, JSON.parse(JSON.stringify(value)));
  }

  /**
   * @dev Restores state from snapshot in case of attack detection.
   */
  public rollback(key: string): any {
    return this.stateSnapshot.get(key);
  }

  /**
   * @dev Returns true if the state is currently protected (locked).
   */
  public isProtected(): boolean {
    return this.isLocked;
  }
}
