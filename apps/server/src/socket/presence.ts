import type { Server } from 'socket.io';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

class PresenceManager {
  // Map of userId -> Set of socketIds
  private onlineUsers: Map<string, Set<string>> = new Map();
  private io: Server | null = null;

  init(io: Server) {
    this.io = io;
  }

  async userConnected(userId: string, socketId: string) {
    let userSockets = this.onlineUsers.get(userId);
    const isNewConnection = !userSockets || userSockets.size === 0;

    if (!userSockets) {
      userSockets = new Set();
      this.onlineUsers.set(userId, userSockets);
    }
    userSockets.add(socketId);

    if (isNewConnection) {
      await this.setDbStatus(userId, 'online');
      this.broadcastPresence(userId, 'online');
    }
  }

  async userDisconnected(userId: string, socketId: string) {
    const userSockets = this.onlineUsers.get(userId);
    if (!userSockets) return;

    userSockets.delete(socketId);
    if (userSockets.size === 0) {
      this.onlineUsers.delete(userId);
      await this.setDbStatus(userId, 'offline');
      this.broadcastPresence(userId, 'offline');
    }
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId) && this.onlineUsers.get(userId)!.size > 0;
  }

  getUserSockets(userId: string): string[] {
    return Array.from(this.onlineUsers.get(userId) || []);
  }

  private async setDbStatus(userId: string, status: 'online' | 'offline' | 'in-game') {
    try {
      await db.update(users)
        .set({ status, lastSeenAt: new Date() })
        .where(eq(users.id, userId));
    } catch (err) {
      console.error(`Failed to update user ${userId} status to ${status}`, err);
    }
  }

  private broadcastPresence(userId: string, status: string) {
    if (!this.io) return;
    // Broadcast to the user's specific room for friends watching presence
    // For now, emit a global presence event, or clients can join "user_presence:userId" room
    this.io.to(`presence:${userId}`).emit('presence:update', { userId, status });
  }
}

export const presence = new PresenceManager();
