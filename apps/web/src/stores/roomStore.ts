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
      // PlayerState carries `id`, not `userId`. Matching on the wrong field made
      // this a no-op, so optimistic updates never showed up.
      const players = state.room.players.map((p) =>
        p.id === playerId ? { ...p, ...data } : p
      );
      return { room: { ...state.room, players } };
    }),
}));
