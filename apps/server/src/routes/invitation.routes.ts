import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { db } from '../db/client.js';
import { gameInvitations, users } from '../db/schema.js';
import { and, eq, desc, gt, inArray } from 'drizzle-orm';
import { requireAuth } from '../auth/middleware.js';
import { roomManager } from '../rooms/room-manager.js';
import { getIo } from '../socket/io-ref.js';
import {
  INVITATION_TTL_MS,
  areFriends,
  canInvite,
  isPersistedUserId,
} from '../services/invitations.js';

const MAX_INVITEES = 20;

const uuid = z.string().uuid();

/**
 * The client never sends a user id it wants to become. Every identity in a
 * request is either request.user.id (the session) or a validated inviteeId
 * that is proven to be a friend of the session holder.
 */
const createSchema = z.object({
  roomCode: z.string().min(1).max(16),
  inviteeIds: z.array(uuid).min(1).max(MAX_INVITEES),
});

const idSchema = z.object({ invitationId: uuid });

/** Public projection. Never leaks room secrets, passwords, or the inviter's email. */
function toPublicInvitation(row: any, room?: any) {
  return {
    id: row.id,
    roomId: row.roomId,
    roomCode: room?.code,
    roomName: room?.name,
    isPrivate: !!room?.isPrivate,
    gameType: row.gameType,
    status: row.status,
    inviterId: row.inviterId,
    inviterName: row.inviter?.displayName || row.inviter?.name || 'Player',
    inviteeId: row.inviteeId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

/**
 * Only the host may invite unless the room opted into player invites. Guests
 * are rejected outright: their ids are not uuids, so they cannot own invitations.
 */
const invitationRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Incoming invitations ───────────────────────────────────────
  fastify.get('/api/invitations', { preHandler: [requireAuth] }, async (request, reply) => {
    if (!isPersistedUserId(request.user.id)) return [];

    const rows = await db.query.gameInvitations.findMany({
      where: and(
        eq(gameInvitations.inviteeId, request.user.id),
        eq(gameInvitations.status, 'PENDING'),
      ),
      with: { inviter: true, room: true },
      orderBy: [desc(gameInvitations.createdAt)],
    });

    // Surfacing an expired invite as actionable is worse than hiding it, so the
    // pending list is filtered rather than left to the client.
    return rows
      .filter((r) => new Date(r.expiresAt).getTime() > Date.now())
      .map((r) => toPublicInvitation(r, r.room));
  });

  // ─── Outgoing invitations ───────────────────────────────────────
  fastify.get('/api/invitations/sent', { preHandler: [requireAuth] }, async (request, reply) => {
    if (!isPersistedUserId(request.user.id)) return [];

    const rows = await db.query.gameInvitations.findMany({
      where: and(
        eq(gameInvitations.inviterId, request.user.id),
        eq(gameInvitations.status, 'PENDING'),
      ),
      with: { invitee: true, room: true },
      orderBy: [desc(gameInvitations.createdAt)],
    });

    return rows
      .filter((r) => new Date(r.expiresAt).getTime() > Date.now())
      .map((r) => toPublicInvitation(r, r.room));
  });

  // ─── Send invitations ───────────────────────────────────────────
  fastify.post('/api/invitations', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid invitation request' });
    }

    const { roomCode, inviteeIds } = parsed.data;
    const inviterId = request.user.id;

    if (!isPersistedUserId(inviterId)) {
      return reply.status(403).send({ error: 'Guests cannot send invitations' });
    }

    const room = roomManager.getRoomByCode(roomCode);
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }
    if (!canInvite(room, inviterId)) {
      return reply.status(403).send({ error: 'Only the host can invite players to this room' });
    }

    const uniqueInviteeIds = [...new Set(inviteeIds)].filter((id) => id !== inviterId);
    if (uniqueInviteeIds.length === 0) {
      return reply.status(400).send({ error: 'No valid invitees' });
    }

    // Invitees must be real accounts, and must be friends with the inviter.
    const inviteeRows = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, uniqueInviteeIds));
    if (inviteeRows.length !== uniqueInviteeIds.length) {
      return reply.status(400).send({ error: 'One or more invitees do not exist' });
    }

    const accepted: string[] = [];
    const rejected: { userId: string; reason: string }[] = [];

    for (const inviteeId of uniqueInviteeIds) {
      if (!(await areFriends(inviterId, inviteeId))) {
        rejected.push({ userId: inviteeId, reason: 'not_friend' });
        continue;
      }
      if (room.players.some((p) => p.id === inviteeId)) {
        rejected.push({ userId: inviteeId, reason: 'already_in_room' });
        continue;
      }

      // The partial unique index on (room_id, invitee_id) WHERE status='PENDING'
      // is the real guard against two hosts double-inviting; a pre-check only
      // makes the common case return a friendly error.
      const existing = await db
        .select({ id: gameInvitations.id })
        .from(gameInvitations)
        .where(
          and(
            eq(gameInvitations.roomId, room.id),
            eq(gameInvitations.inviteeId, inviteeId),
            eq(gameInvitations.status, 'PENDING'),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        rejected.push({ userId: inviteeId, reason: 'already_invited' });
        continue;
      }

      try {
        await db.insert(gameInvitations).values({
          roomId: room.id,
          inviterId,
          inviteeId,
          gameType: room.gameType || 'unknown',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        });
        accepted.push(inviteeId);
      } catch (err: any) {
        // 23505 = unique violation from the partial index.
        rejected.push({
          userId: inviteeId,
          reason: err?.code === '23505' ? 'already_invited' : 'failed',
        });
      }
    }

    // Realtime delivery is best-effort; the row is the source of truth so an
    // offline invitee still finds it on their next load.
    for (const inviteeId of accepted) {
      getIo()?.to(`user:${inviteeId}`).emit('invitation:received', {
        roomId: room.id,
        roomCode: room.code,
        roomName: room.name,
        gameType: room.gameType,
        isPrivate: room.isPrivate,
        inviterId,
        inviterName: request.user.displayName || request.user.name || 'Player',
        createdAt: Date.now(),
      });
    }

    return { sent: accepted.length, accepted, rejected };
  });

  // ─── Accept: join the room, then mark the invite used ────────────
  fastify.post('/api/invitations/accept', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = idSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid invitationId' });

    const inviteeId = request.user.id;
    if (!isPersistedUserId(inviteeId)) {
      return reply.status(403).send({ error: 'Guests cannot accept invitations' });
    }

    const invitation = await db.query.gameInvitations.findFirst({
      where: and(
        eq(gameInvitations.id, parsed.data.invitationId),
        eq(gameInvitations.inviteeId, inviteeId), // ownership: only the invitee
      ),
      with: { room: true },
    });

    if (!invitation) {
      return reply.status(404).send({ error: 'Invitation not found' });
    }
    if (invitation.status !== 'PENDING') {
      return reply.status(409).send({ error: 'Invitation is no longer pending' });
    }
    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
      await db
        .update(gameInvitations)
        .set({ status: 'EXPIRED' })
        .where(eq(gameInvitations.id, invitation.id));
      return reply.status(410).send({ error: 'Invitation expired' });
    }

    const room = roomManager.getRoom(invitation.roomId);
    if (!room) {
      return reply.status(404).send({ error: 'Room no longer exists' });
    }
    if (room.status === 'finished') {
      return reply.status(409).send({ error: 'That game has already finished' });
    }
    if (roomManager.isKicked(room.id, inviteeId)) {
      return reply.status(403).send({ error: 'You were removed from this room' });
    }

    const alreadyInRoom = room.players.some((p) => p.id === inviteeId);
    if (!alreadyInRoom && room.players.length >= room.settings.maxPlayers) {
      return reply.status(409).send({ error: 'Room is full' });
    }

    // The socket layer performs the actual join (room:join) so socket.io rooms
    // and presence stay correct; here we only authorise the transition.
    const [claimed] = await db
      .update(gameInvitations)
      .set({ status: 'ACCEPTED' })
      .where(
        and(eq(gameInvitations.id, invitation.id), eq(gameInvitations.status, 'PENDING')),
      )
      .returning();

    if (!claimed) {
      // Lost the race against a second accept of the same invite.
      return reply.status(409).send({ error: 'Invitation already used' });
    }

    getIo()?.to(`user:${invitation.inviterId}`).emit('invitation:updated', {
      invitationId: invitation.id,
      inviteeId,
      status: 'ACCEPTED',
    });

    return {
      accepted: true,
      roomCode: room.code,
      roomId: room.id,
    };
  });

  // ─── Decline ────────────────────────────────────────────────────
  fastify.post('/api/invitations/decline', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = idSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid invitationId' });

    const [declined] = await db
      .update(gameInvitations)
      .set({ status: 'DECLINED' })
      .where(
        and(
          eq(gameInvitations.id, parsed.data.invitationId),
          eq(gameInvitations.inviteeId, request.user.id),
          eq(gameInvitations.status, 'PENDING'),
        ),
      )
      .returning();

    if (!declined) {
      return reply.status(404).send({ error: 'Invitation not found or already handled' });
    }

    getIo()?.to(`user:${declined.inviterId}`).emit('invitation:updated', {
      invitationId: declined.id,
      inviteeId: declined.inviteeId,
      status: 'DECLINED',
    });

    return { success: true };
  });
};

export default invitationRoutes;
