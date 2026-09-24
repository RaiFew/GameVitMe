import { z } from 'zod';

// ─── Friendship Status ─────────────────────────────────────────

export const FriendshipStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  BLOCKED: 'blocked',
} as const;

export type FriendshipStatus = (typeof FriendshipStatus)[keyof typeof FriendshipStatus];

// ─── Friend DTOs ───────────────────────────────────────────────

export interface FriendInfo {
  friendshipId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    status: string;
  };
  since: string;
}

export interface FriendRequest {
  id: string;
  from: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

// ─── Friend Action Schemas ─────────────────────────────────────

export const sendFriendRequestSchema = z.object({
  targetUserId: z.string().uuid(),
});

export type SendFriendRequestPayload = z.infer<typeof sendFriendRequestSchema>;

export const respondFriendRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['accept', 'reject']),
});

export type RespondFriendRequestPayload = z.infer<typeof respondFriendRequestSchema>;

export const removeFriendSchema = z.object({
  friendshipId: z.string().uuid(),
});

export type RemoveFriendPayload = z.infer<typeof removeFriendSchema>;
