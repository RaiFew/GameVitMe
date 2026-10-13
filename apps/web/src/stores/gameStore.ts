import { create } from 'zustand';

interface GameStore {
  playerView: any | null;
  /** The run `game:started` announced; views stamped with another are stale. */
  sessionId: string | null;
  timer: { type: string; expiresAt: number } | null;
  gameResult: { winners: string[]; summary: any } | null;
  actionError: string | null;
  setActionError: (error: string | null) => void;
  setPlayerView: (view: any) => void;
  setTimer: (timer: any) => void;
  setGameResult: (result: any) => void;
  clearGame: () => void;
  startSession: (sessionId: string | null) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  playerView: null,
  sessionId: null,
  timer: null,
  gameResult: null,
  actionError: null,
  setActionError: (actionError) => set({ actionError }),
  // A view from a different run (a late push from a game that was replaced) must
  // never overwrite the current one — that is how an old quiz's songs came back.
  setPlayerView: (playerView) =>
    set((s) =>
      playerView?.sessionId && s.sessionId && playerView.sessionId !== s.sessionId ? s : { playerView }
    ),
  setTimer: (timer) => set({ timer }),
  setGameResult: (gameResult) => set({ gameResult }),
  clearGame: () => set({ playerView: null, sessionId: null, timer: null, gameResult: null, actionError: null }),
  startSession: (sessionId) =>
    set({ sessionId, playerView: null, timer: null, gameResult: null, actionError: null }),
}));
