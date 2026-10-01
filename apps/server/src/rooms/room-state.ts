// Room State interfaces
export interface PlayerState {
  id: string;
  username: string;
  displayName: string;
  isReady: boolean;
  connected: boolean;
  seatNumber: number;
}

export interface RoomGameSettings {
  maxPlayers: number;
  hostMode?: boolean;
  roundDurationSeconds?: number;
  roleAssignmentMode?: 'PHYSICAL' | 'RANDOM';
  isRoleConfigurationCustomized?: boolean;
  roleCounts?: Record<string, number>;
  werewolfTieRule?: 'NO_KILL' | 'RANDOM' | 'HOST_DECIDES';
  [key: string]: any;
}

export interface InMemoryRoom {
  id: string; // Internal UUID
  code: string; // 5 char code
  name: string;
  hostId: string;
  creatorId?: string;
  gameType?: string;
  status: 'waiting' | 'playing' | 'finished';
  isPrivate: boolean;
  settings: RoomGameSettings;
  players: PlayerState[];
  kickedPlayerIds: string[];
  gameRunner?: any; // Should be RoomRunner from @party/game-engine
  createdAt: number;
  lastActivityAt: number;
  /**
   * When the room first had nobody connected, or undefined while it is occupied.
   * Drives the abandoned-room sweep; see `RoomManager.cleanupRooms`.
   */
  emptySince?: number;
  timers: Map<string, any>;
}
