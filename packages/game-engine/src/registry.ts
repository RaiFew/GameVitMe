import type { GameDefinition } from './types.js';

/**
 * Singleton registry for all available game plugins.
 * Games register themselves at startup.
 * The server and UI query this registry to discover available games.
 */
export class GameRegistry {
  private static instance: GameRegistry;
  private games = new Map<string, GameDefinition<any, any, any>>();

  static getInstance(): GameRegistry {
    if (!GameRegistry.instance) {
      GameRegistry.instance = new GameRegistry();
    }
    return GameRegistry.instance;
  }

  /** Register a game plugin */
  register<TState, TView, TSettings>(
    game: GameDefinition<TState, TView, TSettings>,
  ): void {
    if (this.games.has(game.id)) {
      this.games.set(game.id, game);
      return;
    }
    this.games.set(game.id, game);
    console.log(`[GameRegistry] Registered game: ${game.name} (${game.id})`);
  }

  /** Get a game definition by ID */
  get(gameId: string): GameDefinition | undefined {
    return this.games.get(gameId);
  }

  /** Check if a game is registered */
  has(gameId: string): boolean {
    return this.games.has(gameId);
  }

  /** List all registered games with metadata */
  listGames(): {
    id: string;
    name: string;
    version: string;
    minPlayers: number;
    maxPlayers: number;
    settingsFields: GameDefinition['settingsFields'];
  }[] {
    return Array.from(this.games.values()).map((g) => ({
      id: g.id,
      name: g.name,
      version: g.version,
      minPlayers: g.minPlayers,
      maxPlayers: g.maxPlayers,
      settingsFields: g.settingsFields,
    }));
  }

  /** Get total number of registered games */
  get size(): number {
    return this.games.size;
  }
}
