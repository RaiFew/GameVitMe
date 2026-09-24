import { create } from 'zustand';
import type { RoomState } from '@party/shared-types';

interface RoomStore {
  room: RoomState | null;
  setRoom: (room: RoomState | null) => void;
  clearRoom: () => void;
  updatePlayer: (playerId: string, data: Partial<any>) => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  setRoom: (room) => set({ room }),
  clearRoom: () => set({ room: null }),
  updatePlayer: (playerId, data) =>
    set((state) => {
      if (!state.room) return state;
      const players = state.room.players.map((p) =>
        p.userId === playerId ? { ...p, ...data } : p
      );
      return { room: { ...state.room, players } };
    }),
}));
