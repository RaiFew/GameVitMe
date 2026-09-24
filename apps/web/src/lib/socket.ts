import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      const { user, token } = useAuthStore.getState();
      // Connect to same-origin so cookies are automatically sent through Vite proxy
      this.socket = io(window.location.origin, {
        withCredentials: true,
        reconnection: true,
        auth: {
          token,
          user,
        },
      });
    }
    return this.socket;
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
