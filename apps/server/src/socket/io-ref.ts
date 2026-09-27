import type { Server } from 'socket.io';

let ioRef: Server | null = null;

/**
 * Socket.IO does not expose the Server it was constructed with, but HTTP routes
 * need it to push realtime events (invitations, friend requests). The gateway
 * registers it once at startup.
 */
export function setIo(io: Server): void {
  ioRef = io;
}

export function getIo(): Server | null {
  return ioRef;
}
