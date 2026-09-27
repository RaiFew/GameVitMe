import { db } from '../db/client.js';
import { friendships, gameInvitations } from '../db/schema.js';
import { and, eq, gt, or, lt } from 'drizzle-orm';

export const INVITATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Guest sessions use synthetic ids like `guest_ab12cd3` that are not uuids.
 * Passing one into a uuid column comparison makes Postgres raise, so callers
 * must screen them out before touching the database.
 */
export function isPersistedUserId(id: string | undefined | null): boolean {
  return !!id && UUID_RE.test(id);
}

/** True when the two users have an accepted friendship in either direction. */
export async function areFriends(a: string, b: string): Promise<boolean> {
  if (!isPersistedUserId(a) || !isPersistedUserId(b) || a === b) return false;

  const rows = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, 'accepted'),
        or(
          and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
          and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a)),
        ),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Grants access to a private room only to users the host actually invited.
 * A live PENDING invite is enough: the invitee may join by code before clicking
 * Join, and an ACCEPTED one keeps their access afterwards.
 */
export async function hasValidRoomInvite(userId: string, roomId: string): Promise<boolean> {
  if (!isPersistedUserId(userId)) return false;

  const rows = await db
    .select({ id: gameInvitations.id })
    .from(gameInvitations)
    .where(
      and(
        eq(gameInvitations.roomId, roomId),
        eq(gameInvitations.inviteeId, userId),
        or(
          eq(gameInvitations.status, 'ACCEPTED'),
          and(eq(gameInvitations.status, 'PENDING'), gt(gameInvitations.expiresAt, new Date())),
        ),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

/** Flips overdue PENDING invitations to EXPIRED. Returns how many were swept. */
export async function expireStaleInvitations(): Promise<number> {
  const stale = await db
    .update(gameInvitations)
    .set({ status: 'EXPIRED' })
    .where(and(eq(gameInvitations.status, 'PENDING'), lt(gameInvitations.expiresAt, new Date())))
    .returning({ id: gameInvitations.id });

  return stale.length;
}

/**
 * Only the host may invite unless the room opted into player invites. Guests are
 * rejected outright: their ids are not uuids, so they cannot own invitations.
 */
export function canInvite(room: any, inviterId: string): boolean {
  if (!room) return false;
  if (!isPersistedUserId(inviterId)) return false;
  if (room.hostId === inviterId) return true;
  return room.settings?.allowPlayerInvites === true;
}
