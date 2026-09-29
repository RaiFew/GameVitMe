export const SalemPhase = {
  LOBBY: 'LOBBY',
  NIGHT_WITCH: 'NIGHT_WITCH',
  NIGHT_CONSTABLE: 'NIGHT_CONSTABLE',
  MORNING: 'MORNING',
  CONFESSION: 'CONFESSION',
  RESOLUTION: 'RESOLUTION',
  GAME_OVER: 'GAME_OVER',
} as const;

export type SalemPhase = (typeof SalemPhase)[keyof typeof SalemPhase];

/**
 * The only two roles. Salem does not assign them: the players hold physical
 * cards, so no `roleId` is ever stored on a player.
 */
export type SalemRole = 'WITCH' | 'CONSTABLE';

export type SalemNightResult = 'NO_DEATH' | 'WITCH_TARGET_DIES' | null;

/** The role each night phase is waiting on. The client never names the role. */
export const NIGHT_ROLE: Partial<Record<SalemPhase, SalemRole>> = {
  NIGHT_WITCH: 'WITCH',
  NIGHT_CONSTABLE: 'CONSTABLE',
};

export interface SalemPlayerState {
  id: string;
  seatNumber: number;
  displayName: string;
  isConnected: boolean;
  isAlive: boolean;
  isHost: boolean;
  canPlay: boolean;
  deathRound?: number;
}

/**
 * A player who has proved possession of a role card by entering a passphrase
 * only they know. Server-only: `token` is never projected into a player view.
 */
export interface RoleClaim {
  playerId: string;
  role: SalemRole;
  round: number;
  token: string;
}

export interface SalemMasterState {
  phase: SalemPhase;
  roundNumber: number;
  hostPlayerId?: string;
  hostMode: boolean;
  players: SalemPlayerState[];

  night: {
    witchTargetPlayerId: string | null;
    constableProtectionPlayerId: string | null;
    claims: Partial<Record<SalemRole, RoleClaim>>;
    /** Written once when the host opens MORNING; no later move may change it. */
    result: SalemNightResult;
    deadPlayerIds: string[];
  };

  deaths: { round: number; playerId: string }[];
  gameOverData: { roundsPlayed: number; survivors: string[] } | null;
}

export interface SalemPlayerView {
  phase: SalemPhase;
  roundNumber: number;
  isHost: boolean;
  canPlay: boolean;

  me: { id: string; displayName: string; isAlive: boolean };

  players: {
    id: string;
    seatNumber: number;
    displayName: string;
    isAlive: boolean;
    isConnected: boolean;
    isHost: boolean;
    canPlay: boolean;
  }[];

  /**
   * Present during NIGHT_WITCH / NIGHT_CONSTABLE. `myTargetId` and
   * `hasActed` are filled in only for the player holding the claim, so no
   * other player — the Host included — can read a target.
   */
  night?: {
    actingRole: SalemRole;
    /** Some player has claimed this role. Reveals no identity. */
    claimed: boolean;
    iHaveClaimed: boolean;
    hasActed: boolean;
    myTargetId: string | null;
  };

  /** Public night outcome, readable from MORNING onwards. */
  outcome?: {
    result: SalemNightResult;
    deadPlayerIds: string[];
  };

  gameOverData?: SalemMasterState['gameOverData'];
}

export interface SalemSettings {
  minPlayers?: number;
  maxPlayers?: number;
}
