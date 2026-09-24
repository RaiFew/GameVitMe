import { randomUUID } from 'crypto';
import type { InMemoryRoom, PlayerState } from './room-state.js';

// Crockford Base32
const CHARSET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

class RoomManager {
  private rooms: Map<string, InMemoryRoom> = new Map();
  private codeToId: Map<string, string> = new Map();

  constructor() {
    // TTL cleanup every 5 minutes
    setInterval(() => this.cleanupRooms(), 1000 * 60 * 5);
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

    return { room, player };
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

    if (room.players.length === 0 || room.players.every(p => !p.connected)) {
      // Delay destruction?
      // Destroy immediately for now if empty and not playing
      if (room.status !== 'playing') {
        this.destroyRoom(roomId);
      }
    }
  }

  public destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.codeToId.delete(room.code);
      this.rooms.delete(roomId);
    }
  }

  private cleanupRooms(): void {
    const now = Date.now();
    const TTL = 1000 * 60 * 60 * 2; // 2 hours
    for (const [id, room] of this.rooms.entries()) {
      if (now - room.lastActivityAt > TTL) {
        this.destroyRoom(id);
      }
    }
  }
}

export const roomManager = new RoomManager();
