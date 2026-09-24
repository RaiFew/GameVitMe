import type { Server, Socket } from 'socket.io';
import { roomManager } from '../../rooms/room-manager.js';

export const registerChatHandlers = (io: Server, socket: Socket) => {
  const user = socket.data.user;

  socket.on('chat:message', (payload, callback) => {
    const { roomId, content } = payload;
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      if (callback) callback({ error: 'Invalid message' });
      return;
    }

    const room = roomManager.getRoom(roomId);
    
    if (!room || !room.players.some(p => p.id === user.id)) {
      if (callback) callback({ error: 'Not in room' });
      return;
    }

    const message = {
      id: Math.random().toString(36).substring(2, 9),
      userId: user.id,
      displayName: user.displayName,
      content: content.trim(),
      timestamp: Date.now(),
    };

    io.to(`room:${roomId}`).emit('chat:new_message', message);
    
    if (callback) callback({ success: true });
  });
};
