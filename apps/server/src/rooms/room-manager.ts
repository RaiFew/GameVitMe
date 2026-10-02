import { randomUUID } from 'crypto';
import type { InMemoryRoom, PlayerState } from './room-state.js';

// Crockford Base32
const CHARSET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

class RoomManager {
  private rooms: Map<string, InMemoryRoom> = new Map();
  private codeToId: Map<string, string> = new Map();
  /**
   * playerId -> roomId. Room membership changes rarely but is read on every
   * `game:sync` fallback, and a linear scan of every room would grow with the
   * junk the sweep has not reached yet.
   */
  private playerIndex: Map<string, string> = new Map();

  constructor() {
    // TTL cleanup every 5 minutes. unref so the sweep never holds the process open.
    setInterval(() => this.cleanupRooms(), 1000 * 60 * 5).unref();
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
    return code;
  }

  public createRoom(hostId: string, options: { name: string, gameType?: string, maxPlayers?: number, isPrivate?: boolean }): InMemoryRoom {
    let code: string;
    do {
      code = this.generateCode();
    } while (this.codeToId.has(code));

    const id = randomUUID();
    const room: InMemoryRoom = {
      id,
      code,
      name: options.name,
      hostId,
      creatorId: hostId,
      gameType: options.gameType,
      status: 'waiting',
      isPrivate: options.isPrivate || false,
      settings: { maxPlayers: options.maxPlayers || 8 },
      players: [],
      kickedPlayerIds: [],
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      timers: new Map(),
    };

    this.rooms.set(id, room);
    this.codeToId.set(code, id);

    return room;
  }

  public getRoom(id: string): InMemoryRoom | undefined {
    return this.rooms.get(id);
  }

  public getRoomByCode(code: string): InMemoryRoom | undefined {
    const id = this.codeToId.get(code.toUpperCase());
    return id ? this.rooms.get(id) : undefined;
  }

  public joinRoom(roomId: string, user: { id: string, username: string, displayName: string }): { room: InMemoryRoom, player: PlayerState } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.lastActivityAt = Date.now();
    room.emptySince = undefined;
    let player = room.players.find(p => p.id === user.id);

    if (!player) {
      if (room.players.length >= room.settings.maxPlayers) {
        throw new Error('Room is full');
      }

      const seatNumber = room.players.length > 0 ? Math.max(...room.players.map(p => p.seatNumber)) + 1 : 1;

      player = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        isReady: false,
        connected: true,
        seatNumber,
      };
      room.players.push(player);
    } else {
      player.connected = true; // Reconnect
    }

    this.playerIndex.set(user.id, roomId);
    return { room, player };
  }

  /**
   * A socket dropped. Distinct from `leaveRoom` on purpose: the player keeps
   * their seat and ready state so a refresh or a tunnel blip rejoins as the
   * same seat rather than a new one at the end of the row.
   */
  public markDisconnected(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === userId);
    if (!player) return;
    player.connected = false;
    this.touchEmptiness(room);
  }

  /** The room a player currently holds a seat in, if any. */
  public getRoomByPlayer(userId: string): InMemoryRoom | undefined {
    const roomId = this.playerIndex.get(userId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /**
   * The inverse of `markDisconnected`. A socket that drops and comes back is a
   * brand-new socket object whose `data` is empty, so the server has no way to
   * know which room it belonged to — and `roomManager.joinRoom`, the only other
   * thing that clears the flag, only runs when a client explicitly re-emits
   * `room:join`. Without this a refreshed or backgrounded player stays
   * `connected: false`, and since `broadcastPlayerViews` skips disconnected
   * players they would never receive another `game:state`.
   *
   * Deliberately does not create a seat: a player with no seat stays a
   * non-member until they join something.
   */
  public reconnectPlayer(userId: string): InMemoryRoom | undefined {
    const room = this.getRoomByPlayer(userId);
    if (!room) return undefined;
    const player = room.players.find(p => p.id === userId);
    if (!player) return undefined;
    player.connected = true;
    room.emptySince = undefined;
    return room;
  }

  private touchEmptiness(room: InMemoryRoom): void {
    const occupied = room.players.some(p => p.connected);
    if (occupied) {
      room.emptySince = undefined;
    } else if (room.emptySince === undefined) {
      room.emptySince = Date.now();
    }
  }

  /**
   * Records a kick so the player cannot immediately rejoin. Without this the
   * host's kick was cosmetic: the player re-joined on the next room:join.
   */
  public kickPlayer(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (!room.kickedPlayerIds.includes(userId)) {
      room.kickedPlayerIds.push(userId);
    }
  }

  public isKicked(roomId: string, userId: string): boolean {
    return this.rooms.get(roomId)?.kickedPlayerIds.includes(userId) ?? false;
  }

  public leaveRoom(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.lastActivityAt = Date.now();

    // Mark as disconnected instead of removing if game is playing
    if (room.status === 'playing') {
      const player = room.players.find(p => p.id === userId);
      if (player) player.connected = false;
    } else {
      room.players = room.players.filter(p => p.id !== userId);
      if (this.playerIndex.get(userId) === roomId) this.playerIndex.delete(userId);
    }

    // Host migration
    if (room.hostId === userId && room.players.length > 0) {
      // 45s grace period could be implemented with setTimeout here
      // For simplicity, direct promotion of oldest player (seatNumber)
      const oldestPlayer = [...room.players].sort((a, b) => a.seatNumber - b.seatNumber)[0];
      if (oldestPlayer) {
        room.hostId = oldestPlayer.id;
      }
    }

    this.touchEmptiness(room);

    // An idle lobby is destroyed now so its code frees up. A room mid-game gets
    // the grace period instead: the players may be on a refresh, and taking the
    // session out from under them would be worse than holding it a few minutes.
    if (room.players.length === 0 && room.status !== 'playing') {
      this.destroyRoom(roomId);
    }
  }

  public destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.codeToId.delete(room.code);
      for (const p of room.players) {
        if (this.playerIndex.get(p.id) === roomId) this.playerIndex.delete(p.id);
      }
      room.timers.forEach((timer) => clearTimeout(timer));
      room.timers.clear();
      this.rooms.delete(roomId);
    }
  }

  private cleanupRooms(): void {
    const now = Date.now();
    const TTL = 1000 * 60 * 60 * 2; // 2 hours of no activity at all
    // A room nobody is connected to. Long enough to survive a refresh, a tunnel
    // blip, or someone stepping out of the room and back, short enough that
    // dead lobbies do not pile up for hours.
    const ABANDONED = 1000 * 60 * 10;

    for (const [id, room] of this.rooms.entries()) {
      const abandoned =
        room.emptySince !== undefined && now - room.emptySince > ABANDONED;
      if (abandoned || now - room.lastActivityAt > TTL) {
        this.destroyRoom(id);
      }
    }
  }
}

export const roomManager = new RoomManager();
