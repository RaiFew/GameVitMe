import type { Server, Socket } from 'socket.io';
import { db } from '../../db/client.js';
import { friendships } from '../../db/schema.js';
import { and, eq, or } from 'drizzle-orm';
import { presence } from '../presence.js';

export const registerFriendHandlers = (io: Server, socket: Socket) => {
  const user = socket.data.user;

  socket.on('friend:invite_to_room', async (payload, callback) => {
    const { friendId, roomCode } = payload;
    
    // Verify friendship
    const friends = await db.select().from(friendships).where(
      and(
        eq(friendships.status, 'accepted'),
        or(
          and(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, friendId)),
          and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, user.id))
        )
      )
    ).limit(1);

    if (friends.length === 0) {
      if (callback) callback({ error: 'User is not your friend' });
      return;
    }

    if (!presence.isUserOnline(friendId)) {
      if (callback) callback({ error: 'Friend is offline' });
      return;
    }

    io.to(`user:${friendId}`).emit('notification:invite', {
      fromUserId: user.id,
      fromDisplayName: user.displayName,
      roomCode,
      timestamp: Date.now(),
    });

    if (callback) callback({ success: true });
  });
  
  socket.on('presence:subscribe', (payload) => {
    const { targetUserId } = payload;
    socket.join(`presence:${targetUserId}`);
  });

  socket.on('presence:unsubscribe', (payload) => {
    const { targetUserId } = payload;
    socket.leave(`presence:${targetUserId}`);
  });
};
