import { ReentrancyLib } from "../libraries/ReentrancyLib";

export class StateProtection {
  private lockCount: number = 0;
  private stateSnapshot: Map<string, any> = new Map();

  /**
   * @dev Acquires a lock for state protection.
   */
  public lock(): void {
    // We allow nested calls here because ReentrancyDetector handles actual attack detection.
    // This lock is to ensure isProtected() is true during any protected call.
    this.lockCount++;
  }

  /**
   * @dev Releases the lock.
   */
  public unlock(): void {
    if (this.lockCount > 0) {
      this.lockCount--;
    }
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
    return this.lockCount > 0;
  }
}
