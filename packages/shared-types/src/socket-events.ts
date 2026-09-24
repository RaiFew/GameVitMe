import type { RoomState, RoomPlayer } from './room.js';
import type { FriendRequest, FriendInfo } from './friend.js';

// ─── Client → Server Events ───────────────────────────────────

export interface ClientToServerEvents {
  // Room
  'room:create': (payload: {
    gameType: string;
    name?: string;
    maxPlayers?: number;
    isPrivate?: boolean;
    settings?: Record<string, unknown>;
  }) => void;

  'room:join': (payload: {
    roomCode: string;
  }) => void;

  'room:leave': () => void;

  'room:ready': (payload: {
    isReady: boolean;
  }) => void;

  'room:kick': (payload: {
    targetPlayerId: string;
  }) => void;

  'room:transfer_host': (payload: {
    targetPlayerId: string;
  }) => void;

  'room:update_settings': (payload: {
    settings?: Record<string, unknown>;
    gameType?: string;
    maxPlayers?: number;
  }) => void;

  // Game
  'game:start': () => void;

  'game:action': (payload: {
    type: string;
    payload?: unknown;
  }) => void;

  // Chat
  'chat:message': (payload: {
    content: string;
  }) => void;

  // Friends
  'friend:invite_to_room': (payload: {
    friendUserId: string;
    roomCode: string;
  }) => void;
}

// ─── Server → Client Events ───────────────────────────────────

export interface ServerToClientEvents {
  // Room
  'room:state': (state: RoomState) => void;
  'room:error': (error: { code: string; message: string }) => void;
  'room:player_joined': (player: RoomPlayer) => void;
  'room:player_left': (payload: { playerId: string; reason: string }) => void;
  'room:player_ready': (payload: { playerId: string; isReady: boolean }) => void;
  'room:host_changed': (payload: { newHostId: string }) => void;
  'room:kicked': (payload: { reason: string }) => void;
  'room:closed': (payload: { reason: string }) => void;

  // Game
  'game:started': (payload: { gameType: string; sessionId: string }) => void;
  'game:state': (playerView: unknown) => void;
  'game:action_error': (error: { code: string; message: string }) => void;
  'game:timer': (payload: { type: string; expiresAt: number }) => void;
  'game:finished': (payload: {
    winners: string[];
    summary: unknown;
  }) => void;

  // Chat
  'chat:message': (message: {
    senderId: string;
    senderName: string;
    content: string;
    timestamp: string;
  }) => void;

  // Friends
  'friend:invite_received': (payload: {
    fromUserId: string;
    fromDisplayName: string;
    roomCode: string;
    gameType: string;
  }) => void;

  'friend:request_received': (request: FriendRequest) => void;

  'friend:status_changed': (payload: {
    userId: string;
    status: string;
  }) => void;

  // System
  'error': (error: { code: string; message: string }) => void;
  'reconnected': (payload: { roomCode: string; state: RoomState }) => void;
}

// ─── Inter-Server Events (Socket.IO adapter) ──────────────────

export interface InterServerEvents {
  ping: () => void;
}

// ─── Socket Data ───────────────────────────────────────────────

export interface SocketData {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  roomCode: string | null;
}
