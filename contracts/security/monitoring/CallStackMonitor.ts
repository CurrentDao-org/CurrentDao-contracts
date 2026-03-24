export class CallStackMonitor {
  private depth: number = 0;
  private stackTrace: string[] = [];

  /**
   * @dev Increases call depth and records call information.
   */
  public push(call: string): void {
    this.depth++;
    this.stackTrace.push(call);
  }

  /**
   * @dev Decreases call depth.
   */
  public pop(): void {
    if (this.depth > 0) {
      this.depth--;
      this.stackTrace.pop();
    }
  }

  /**
   * @dev Returns current execution depth.
   */
  public getDepth(): number {
    return this.depth;
  }

  /**
   * @dev Returns the full stack trace of current execution.
   */
  public getStackTrace(): string[] {
    return [...this.stackTrace];
  }

  /**
   * @dev Resets the monitor state.
   */
  public reset(): void {
    this.depth = 0;
    this.stackTrace = [];
  }
}
