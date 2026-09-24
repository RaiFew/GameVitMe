/**
 * Server-authoritative timer manager.
 * Ensures timers are controlled by the server,
 * not the client (prevents manipulation).
 */
export class TimerManager {
  private timers = new Map<string, NodeJS.Timeout>();
  private expirations = new Map<string, number>();

  /**
   * Schedule a timer that calls the callback when expired.
   * Returns the absolute expiration timestamp for client sync.
   */
  schedule(
    id: string,
    durationMs: number,
    onExpired: () => void,
  ): number {
    // Clear any existing timer with same ID
    this.clear(id);

    const expiresAt = Date.now() + durationMs;
    const timeout = setTimeout(() => {
      this.timers.delete(id);
      this.expirations.delete(id);
      onExpired();
    }, durationMs);

    this.timers.set(id, timeout);
    this.expirations.set(id, expiresAt);

    return expiresAt;
  }

  /** Clear a specific timer */
  clear(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
      this.expirations.delete(id);
    }
  }

  /** Clear all timers */
  clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.expirations.clear();
  }

  /** Get expiration timestamp for a timer */
  getExpiration(id: string): number | undefined {
    return this.expirations.get(id);
  }

  /** Check if a timer is active */
  isActive(id: string): boolean {
    return this.timers.has(id);
  }

  /** Get remaining time in ms for a timer */
  getRemaining(id: string): number {
    const expiresAt = this.expirations.get(id);
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt - Date.now());
  }
}
