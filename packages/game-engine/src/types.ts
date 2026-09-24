/**
 * Core game engine types for the plugin system.
 *
 * Every game must implement the GameDefinition interface.
 * The server uses these to manage game lifecycle, validate moves,
 * and project per-player views (state masking for anti-cheat).
 */

// ─── Game Context ──────────────────────────────────────────────

/** Context provided to game logic by the engine runtime */
export interface GameContext {
  roomId: string;
  gameSessionId: string;
  players: GamePlayer[];
  /** Seeded deterministic PRNG for reproducible randomness */
  random: () => number;
  /** Broadcast event to all players */
  broadcast: (event: string, payload: unknown) => void;
  /** Send event to a specific player */
  emitToPlayer: (playerId: string, event: string, payload: unknown) => void;
  /** Schedule a server-authoritative timer */
  scheduleTimer: (durationMs: number, timerType: string) => void;
  /** Cancel the active timer */
  clearTimer: () => void;
}

export interface GamePlayer {
  id: string;
  seatNumber: number;
  displayName: string;
  isConnected: boolean;
}

// ─── Game Move ─────────────────────────────────────────────────

/** A move submitted by a player */
export interface GameMove<TPayload = unknown> {
  type: string;
  playerId: string;
  payload: TPayload;
  timestamp: number;
}

/** Result of processing a move */
export interface MoveResult<TState> {
  success: boolean;
  error?: string;
  newState?: TState;
  events?: GameEvent[];
}

export interface GameEvent {
  type: string;
  payload: unknown;
  /** 'all' to broadcast, or a specific playerId */
  recipient?: 'all' | string;
}

// ─── Game End ──────────────────────────────────────────────────

export interface GameEndResult {
  isEnded: true;
  winners: string[];
  scoreSummary?: Record<string, number>;
  data?: unknown;
}

// ─── Game Settings Meta ────────────────────────────────────────

export interface GameSettingsField {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'select';
  default: unknown;
  min?: number;
  max?: number;
  options?: { label: string; value: unknown }[];
  description?: string;
}

// ─── Game Definition ───────────────────────────────────────────

/**
 * The core interface every game plugin must implement.
 *
 * @template TState - The master game state (server-only, contains all secrets)
 * @template TPlayerView - The filtered view each player receives (no secret leaks)
 * @template TSettings - Game-specific configuration
 */
export interface GameDefinition<
  TState = unknown,
  TPlayerView = unknown,
  TSettings = unknown,
> {
  /** Unique game identifier, e.g. 'spyfall' */
  id: string;
  /** Human-readable game name */
  name: string;
  /** Semver version */
  version: string;
  /** Minimum players required */
  minPlayers: number;
  /** Maximum players supported */
  maxPlayers: number;
  /** Default settings */
  defaultSettings: TSettings;
  /** Settings UI metadata */
  settingsFields: GameSettingsField[];

  // ── Lifecycle ──────────────────────────────────────────────

  /** Create initial game state from context and settings */
  setup: (ctx: GameContext, settings: TSettings) => TState;

  /** Get the current game phase name for display */
  getCurrentPhase: (state: TState) => string;

  // ── Move Processing ────────────────────────────────────────

  /** Validate whether a move is legal in the current state */
  validateMove: (
    state: TState,
    move: GameMove,
    ctx: GameContext,
  ) => { valid: boolean; reason?: string };

  /** Process a validated move and return new state */
  processMove: (
    state: TState,
    move: GameMove,
    ctx: GameContext,
  ) => MoveResult<TState>;

  // ── State Masking (Critical for Social Deduction) ──────────

  /**
   * Project master state into a per-player view.
   * This is the ONLY data the client ever sees.
   * Must strip all secret information not meant for this player.
   */
  getPlayerView: (
    state: TState,
    playerId: string,
    ctx: GameContext,
  ) => TPlayerView;

  // ── Win Condition ──────────────────────────────────────────

  /** Check if the game has ended */
  checkGameEnd: (
    state: TState,
    ctx: GameContext,
  ) => GameEndResult | null;

  // ── Optional Hooks ─────────────────────────────────────────

  /** Called when a server-authoritative timer expires */
  onTimerExpired?: (
    state: TState,
    timerType: string,
    ctx: GameContext,
  ) => MoveResult<TState>;

  /** Called when a player disconnects mid-game */
  onPlayerDisconnected?: (
    state: TState,
    playerId: string,
    ctx: GameContext,
  ) => MoveResult<TState>;

  /** Called when a player reconnects mid-game */
  onPlayerReconnected?: (
    state: TState,
    playerId: string,
    ctx: GameContext,
  ) => MoveResult<TState>;
}
