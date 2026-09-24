import { z } from 'zod';

// ─── User Status ───────────────────────────────────────────────

export const UserStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  IN_GAME: 'in_game',
  AWAY: 'away',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

// ─── User DTOs ─────────────────────────────────────────────────

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  username: z.string().min(3).max(20),
  displayName: z.string().min(1).max(30),
  avatarUrl: z.string().url().nullable(),
  status: z.enum(['online', 'offline', 'in_game', 'away']),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime().nullable(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(30).optional(),
  username: z.string().min(3).max(20).optional(),
});

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;

export const userSearchSchema = z.object({
  q: z.string().min(1).max(50),
});

/** Compact user info returned in lists */
export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
}
