import { z } from 'zod';

// ─── Room Status ───────────────────────────────────────────────

export const RoomStatus = {
  WAITING: 'waiting',
  STARTING: 'starting',
  PLAYING: 'playing',
  FINISHED: 'finished',
  CLOSED: 'closed',
} as const;

export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

// ─── Room DTOs ─────────────────────────────────────────────────

export interface RoomPlayer {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  seatNumber: number;
  isReady: boolean;
  isHost: boolean;
  isConnected: boolean;
}

export interface RoomGameSettings {
  roundDurationSeconds?: number;
  hostMode?: boolean;
  roleAssignmentMode?: 'PHYSICAL' | 'RANDOM';
  isRoleConfigurationCustomized?: boolean;
  roleCounts?: Record<string, number>;
  werewolfTieRule?: 'NO_KILL' | 'RANDOM' | 'HOST_DECIDES';
  [key: string]: unknown;
}

export interface RoomState {
  id: string;
  code: string;
  name: string;
  hostId: string;
  creatorId?: string;
  gameType: string;
  status: RoomStatus;
  isPrivate: boolean;
  maxPlayers: number;
  settings: RoomGameSettings;
  players: RoomPlayer[];
  createdAt: string;
}

export interface RoomSummary {
  code: string;
  name: string;
  gameType: string;
  hostDisplayName: string;
  playerCount: number;
  maxPlayers: number;
  status: RoomStatus;
}

// ─── Room Action Schemas ───────────────────────────────────────

export const createRoomSchema = z.object({
  gameType: z.string().min(1),
  name: z.string().min(1).max(30).default('Game Room'),
  maxPlayers: z.number().int().min(2).max(20).default(8),
  isPrivate: z.boolean().default(true),
  settings: z.record(z.unknown()).default({}),
});

export type CreateRoomPayload = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({
  roomCode: z.string().min(4).max(6).toUpperCase(),
});

export type JoinRoomPayload = z.infer<typeof joinRoomSchema>;

export const kickPlayerSchema = z.object({
  targetPlayerId: z.string().uuid(),
});

export const transferHostSchema = z.object({
  targetPlayerId: z.string().uuid(),
});

export const updateRoomSettingsSchema = z.object({
  settings: z.record(z.unknown()),
  gameType: z.string().optional(),
  maxPlayers: z.number().int().min(2).max(20).optional(),
});

export type UpdateRoomSettingsPayload = z.infer<typeof updateRoomSettingsSchema>;

// ─── Game Session ──────────────────────────────────────────────

export const SessionStatus = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];
