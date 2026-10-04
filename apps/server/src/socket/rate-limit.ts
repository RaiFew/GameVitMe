/**
 * A per-socket token bucket for `game:action`.
 *
 * Every accepted move triggers `broadcastPlayerViews()`, so a client that emits
 * moves in a tight loop costs the server and every other client far more than it
 * costs itself — shuttle one piece between two legal cells and each attempt is a
 * valid move and a full re-projection. No human plays at 20 moves a second, so
 * these bounds cost nothing real and cap the amplification.
 */
export interface TokenBucket {
  /** Spends one token. False means the caller is over budget. */
  take(nowMs: number): boolean;
}

export function createTokenBucket(capacity: number, refillPerSec: number): TokenBucket {
  let tokens = capacity;
  let lastMs: number | null = null;

  return {
    take(nowMs) {
      if (lastMs !== null)
        tokens = Math.min(capacity, tokens + ((nowMs - lastMs) / 1000) * refillPerSec);
      lastMs = nowMs;
      if (tokens < 1) return false;
      tokens -= 1;
      return true;
    },
  };
}