import { create } from 'zustand';

interface GameStore {
  playerView: any | null;
  timer: { type: string; expiresAt: number } | null;
  gameResult: { winners: string[]; summary: any } | null;
  actionError: string | null;
  setActionError: (error: string | null) => void;
  setPlayerView: (view: any) => void;
  setTimer: (timer: any) => void;
  setGameResult: (result: any) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  playerView: null,
  timer: null,
  gameResult: null,
  actionError: null,
  setActionError: (actionError) => set({ actionError }),
  setPlayerView: (playerView) => set({ playerView }),
  setTimer: (timer) => set({ timer }),
  setGameResult: (gameResult) => set({ gameResult }),
  clearGame: () => set({ playerView: null, timer: null, gameResult: null, actionError: null }),
}));
