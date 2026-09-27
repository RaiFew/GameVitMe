import type { Server, Socket } from 'socket.io';

export const registerFriendHandlers = (io: Server, socket: Socket) => {
  // Room invitations moved to POST /api/invitations. The old socket path had no
  // persistence, no expiry, and no capacity check, so invitations now have a
  // single validated entry point instead of two divergent ones.

  socket.on('presence:subscribe', (payload) => {
    const { targetUserId } = payload;
    socket.join(`presence:${targetUserId}`);
  });

  socket.on('presence:unsubscribe', (payload) => {
    const { targetUserId } = payload;
    socket.leave(`presence:${targetUserId}`);
  });
};
