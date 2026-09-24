export interface GuestSession {
  user: {
    id: string;
    name: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    status: string;
    isGuest: boolean;
  };
  expiresAt: Date;
}

export const guestSessions = new Map<string, GuestSession>();
