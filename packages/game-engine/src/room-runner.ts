import type { GameDefinition, GameContext, GameMove, GamePlayer, MoveResult, GameEndResult } from './types.js';
import { GameRegistry } from './registry.js';
import { TimerManager } from './timer.js';

/**
 * RoomRunner manages the lifecycle of a single game session within a room.
 * It wraps a GameDefinition and provides the runtime context.
 */
export class RoomRunner<TState = unknown, TPlayerView = unknown, TSettings = unknown> {
  private game: GameDefinition<TState, TPlayerView, TSettings>;
  private state: TState | null = null;
  private timerManager = new TimerManager();
  private sessionId: string;
  private roomId: string;
  private players: GamePlayer[] = [];

  // Callbacks set by the server
  private broadcastFn: ((event: string, payload: unknown) => void) | null = null;
  private emitToPlayerFn: ((playerId: string, event: string, payload: unknown) => void) | null = null;
  private onGameEndFn?: (result: GameEndResult) => void;

  constructor(
    gameId: string,
    roomId: string,
    sessionId: string,
  ) {
    const game = GameRegistry.getInstance().get(gameId);
    if (!game) {
      throw new Error(`Game "${gameId}" is not registered.`);
    }
    this.game = game as GameDefinition<TState, TPlayerView, TSettings>;
    this.roomId = roomId;
    this.sessionId = sessionId;
  }

  /** Set the broadcast callback */
  setBroadcast(fn: (event: string, payload: unknown) => void): void {
    this.broadcastFn = fn;
  }

  /** Set the emit-to-player callback */
  setEmitToPlayer(fn: (playerId: string, event: string, payload: unknown) => void): void {
    this.emitToPlayerFn = fn;
  }

  /** Set callback for game conclusion (e.g. on timer expiration) */
  setOnGameEnd(fn: (result: GameEndResult) => void): void {
    this.onGameEndFn = fn;
  }

  /** Set the player list */
  setPlayers(players: GamePlayer[]): void {
    this.players = players;
  }

  /** Get the game session ID */
  getSessionId(): string {
    return this.sessionId;
  }

  /** Get the game definition metadata */
  getGameInfo() {
    return {
      id: this.game.id,
      name: this.game.name,
      minPlayers: this.game.minPlayers,
      maxPlayers: this.game.maxPlayers,
    };
  }

  /** Create the game context for passing to game logic */
  private createContext(): GameContext {
    return {
      roomId: this.roomId,
      gameSessionId: this.sessionId,
      players: [...this.players],
      random: Math.random, // TODO: Replace with seeded PRNG
      broadcast: (event, payload) => {
        this.broadcastFn?.(event, payload);
      },
      emitToPlayer: (playerId, event, payload) => {
        this.emitToPlayerFn?.(playerId, event, payload);
      },
      scheduleTimer: (durationMs, timerType) => {
        const expiresAt = this.timerManager.schedule(
          timerType,
          durationMs,
          () => this.handleTimerExpired(timerType),
        );
        this.broadcastFn?.('game:timer', { type: timerType, expiresAt });
      },
      clearTimer: () => {
        this.timerManager.clearAll();
      },
    };
  }

  /** Initialize the game with settings */
  setup(settings: TSettings): TState {
    const ctx = this.createContext();
    this.state = this.game.setup(ctx, settings);
    return this.state;
  }

  /** Get current phase */
  getCurrentPhase(): string {
    if (!this.state) return 'NOT_STARTED';
    return this.game.getCurrentPhase(this.state);
  }

  /** Process a player move */
  processMove(move: GameMove): MoveResult<TState> {
    if (!this.state) {
      return { success: false, error: 'Game not started' };
    }

    const ctx = this.createContext();

    // Validate
    const validation = this.game.validateMove(this.state, move, ctx);
    if (!validation.valid) {
      return { success: false, error: validation.reason || 'Invalid move' };
    }

    // Process
    const result = this.game.processMove(this.state, move, ctx);
    if (result.success && result.newState) {
      this.state = result.newState;
    }

    return result;
  }

  /** Get per-player view (state masking) */
  getPlayerView(playerId: string): TPlayerView | null {
    if (!this.state) return null;
    const ctx = this.createContext();
    return this.game.getPlayerView(this.state, playerId, ctx);
  }

  /** Check if game has ended */
  checkGameEnd() {
    if (!this.state) return null;
    const ctx = this.createContext();
    return this.game.checkGameEnd(this.state, ctx);
  }

  /** Handle timer expiration */
  private handleTimerExpired(timerType: string): void {
    if (!this.state || !this.game.onTimerExpired) return;
    const ctx = this.createContext();
    const result = this.game.onTimerExpired(this.state, timerType, ctx);
    if (result.success && result.newState) {
      this.state = result.newState;
      // Broadcast updated views to all players
      this.broadcastPlayerViews();

      // Check if timer expiration finished the game
      const endResult = this.checkGameEnd();
      if (endResult && this.onGameEndFn) {
        this.onGameEndFn(endResult);
      }
    }
  }

  /** Emit player view to a single player (for reconnection/sync) */
  emitPlayerView(playerId: string): void {
    if (!this.state) return;
    const ctx = this.createContext();
    const view = this.game.getPlayerView(this.state, playerId, ctx);
    this.emitToPlayerFn?.(playerId, 'game:state', view);
  }

  /** Handle player disconnect */
  handlePlayerDisconnect(playerId: string): void {
    // Update player connection status
    const player = this.players.find((p) => p.id === playerId);
    if (player) {
      player.isConnected = false;
    }

    if (!this.state || !this.game.onPlayerDisconnected) return;
    const ctx = this.createContext();
    const result = this.game.onPlayerDisconnected(this.state, playerId, ctx);
    if (result.success && result.newState) {
      this.state = result.newState;
    }
  }

  /** Handle player reconnect */
  handlePlayerReconnect(playerId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (player) {
      player.isConnected = true;
    }

    if (!this.state || !this.game.onPlayerReconnected) return;
    const ctx = this.createContext();
    const result = this.game.onPlayerReconnected(this.state, playerId, ctx);
    if (result.success && result.newState) {
      this.state = result.newState;
    }
  }

  /** Broadcast player-specific views to all connected players */
  broadcastPlayerViews(): void {
    if (!this.state) return;
    const ctx = this.createContext();
    for (const player of this.players) {
      if (player.isConnected) {
        const view = this.game.getPlayerView(this.state, player.id, ctx);
        this.emitToPlayerFn?.(player.id, 'game:state', view);
      }
    }
  }

  /** Get the raw master state (server-only, for persistence) */
  getMasterState(): TState | null {
    return this.state;
  }

  /** Clean up timers */
  destroy(): void {
    this.timerManager.clearAll();
    this.state = null;
  }
}
