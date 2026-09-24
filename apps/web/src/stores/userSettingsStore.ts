import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserSettingsState {
  streamerMode: boolean;
  setStreamerMode: (enabled: boolean) => void;
  toggleStreamerMode: () => void;
}

export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set) => ({
      streamerMode: false,
      setStreamerMode: (streamerMode: boolean) => set({ streamerMode }),
      toggleStreamerMode: () => set((state) => ({ streamerMode: !state.streamerMode })),
    }),
    {
      name: 'party-user-settings',
    }
  )
);
