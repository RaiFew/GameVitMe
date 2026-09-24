import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { socketService } from '../lib/socket';

export interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(() => socketService.getSocket());
  const [isConnected, setIsConnected] = useState<boolean>(() => socketService.getSocket()?.connected ?? false);

  useEffect(() => {
    const s = socketService.connect();
    setSocket(s);
    setIsConnected(s.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket, isConnected };
}
