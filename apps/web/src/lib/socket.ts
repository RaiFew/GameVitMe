import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      const { user, token } = useAuthStore.getState();
      const targetUrl = import.meta.env.VITE_WS_URL || window.location.origin;
      this.socket = io(targetUrl, {
        withCredentials: true,
        reconnection: true,
        // Start on polling and upgrade afterwards. A connection whose very
        // first request is a WebSocket upgrade is accepted by the Cloudflare
        // proxy in front of the API but never wired up: `connect` fires, the
        // socket reports itself connected, and every emit is then dropped on the
        // floor. Measured against production, 3/3 such connections went deaf
        // while 8/8 that started on polling worked.
        transports: ['polling', 'websocket'],
        auth: {
          token,
          user,
        },
      });
    }
    return this.socket;
  }

  /**
   * Throw away the current engine and handshake again from scratch. Used when
   * the socket claims to be connected but nothing is coming back, which is what
   * a half-open upgrade looks like from the client's side.
   */
  recycle(): void {
    if (!this.socket) return;
    this.socket.io.engine?.close();
    this.socket.disconnect().connect();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
