import { db } from '../db/client.js';
import { rooms } from '../db/schema.js';
import type { InMemoryRoom } from './room-state.js';

/**
 * Rooms are held in memory, but `game_invitations.room_id` is a foreign key: an
 * invitation cannot be written without a matching row. Call this once the caller
 * has finished mutating `room.settings`, since the row is a snapshot.
 *
 * Best-effort by design. A guest host has no `users` row, so the host FK fails, and
 * the room is still perfectly playable without its database shadow. Nothing here may
 * take the room down with it.
 */
export async function persistRoom(room: InMemoryRoom): Promise<void> {
  try {
    await db
      .insert(rooms)
      .values({
        id: room.id,
        code: room.code,
        hostId: room.hostId,
        gameType: room.gameType,
        name: room.name,
        status: 'waiting',
        isPrivate: room.isPrivate,
        maxPlayers: room.settings?.maxPlayers ?? 8,
        settings: room.settings ?? {},
      })
      .onConflictDoNothing();
  } catch {
    // No users row behind this host, or the database is unreachable. Either way the
    // in-memory room stands on its own.
  }
}