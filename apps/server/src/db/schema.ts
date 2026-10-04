import { pgTable, text, timestamp, uuid, pgEnum, boolean, integer, jsonb, numeric, unique, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const userStatusEnum = pgEnum('user_status', ['online', 'offline', 'in-game']);
export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted', 'blocked']);
export const roomStatusEnum = pgEnum('room_status', ['waiting', 'playing', 'finished']);
export const gameSessionStatusEnum = pgEnum('game_session_status', ['active', 'completed', 'aborted']);
export const invitationStatusEnum = pgEnum('invitation_status', [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
]);
// Which end of the scale wins. A leaderboard that assumes "higher is better"
// cannot express a time, and Time is a first-class ranked mode.
export const leaderboardDirectionEnum = pgEnum('leaderboard_direction', [
  'HIGHER_IS_BETTER',
  'LOWER_IS_BETTER',
]);
export const rankedRunStatusEnum = pgEnum('ranked_run_status', [
  'COMPLETED',
  'DIED',
  'ABANDONED',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: boolean('email_verified').default(false),
  image: text('image'),
  username: text('username').unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  status: userStatusEnum('status').default('offline'),
  isGuest: boolean('is_guest').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  idToken: text('id_token'),
}, (t) => ({
  unq: unique().on(t.providerId, t.accountId),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const friendships = pgTable('friendships', {
  id: uuid('id').primaryKey().defaultRandom(),
  requesterId: uuid('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addresseeId: uuid('addressee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: friendshipStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.requesterId, t.addresseeId),
}));

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  hostId: uuid('host_id').references(() => users.id),
  gameType: text('game_type'),
  name: text('name').notNull(),
  status: roomStatusEnum('status').default('waiting').notNull(),
  isPrivate: boolean('is_private').default(false).notNull(),
  maxPlayers: integer('max_players').default(8).notNull(),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roomParticipants = pgTable('room_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seatNumber: integer('seat_number'),
  isReady: boolean('is_ready').default(false).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.roomId, t.userId),
}));

export const gameInvitations = pgTable(
  'game_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
    inviterId: uuid('inviter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    inviteeId: uuid('invitee_id').references(() => users.id, { onDelete: 'cascade' }),
    // A link invitation carries an unguessable token and no invitee: who holds
    // the token is unknown until somebody opens the link. Claiming one inserts
    // an ordinary ACCEPTED row for that user, which is what hasValidRoomInvite
    // already reads, so private-room access needs no new path.
    token: text('token'),
    gameType: text('game_type').notNull(),
    status: invitationStatusEnum('status').default('PENDING').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (t) => ({
    // Partial unique index: one live invite per (room, invitee). A plain unique()
    // would also block re-inviting someone whose earlier invite was declined,
    // and the accept path would then race two simultaneous joins into the last
    // room slot instead of failing the second one.
    unqPending: uniqueIndex('game_invitations_pending_unq')
      .on(t.roomId, t.inviteeId)
      .where(sql`${t.status} = 'PENDING'`),
    unqToken: uniqueIndex('game_invitations_token_unq')
      .on(t.token)
      .where(sql`${t.token} IS NOT NULL`),
  }),
);

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  gameType: text('game_type').notNull(),
  status: gameSessionStatusEnum('status').default('active').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  durationSec: integer('duration_sec'),
  winnerData: jsonb('winner_data'),
  replayLog: jsonb('replay_log'),
});

export const gameSessionPlayers = pgTable('game_session_players', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleAssigned: text('role_assigned'),
  scoreAwarded: integer('score_awarded').default(0),
  won: boolean('won').default(false),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  sentFriendships: many(friendships, { relationName: 'requester' }),
  receivedFriendships: many(friendships, { relationName: 'addressee' }),
  sentInvitations: many(gameInvitations, { relationName: 'inviter' }),
  receivedInvitations: many(gameInvitations, { relationName: 'invitee' }),
  leaderboardEntries: many(leaderboardEntries),
  rankedGameResults: many(rankedGameResults),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, { fields: [friendships.requesterId], references: [users.id], relationName: 'requester' }),
  addressee: one(users, { fields: [friendships.addresseeId], references: [users.id], relationName: 'addressee' }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const gameInvitationsRelations = relations(gameInvitations, ({ one }) => ({
  room: one(rooms, { fields: [gameInvitations.roomId], references: [rooms.id] }),
  inviter: one(users, { fields: [gameInvitations.inviterId], references: [users.id], relationName: 'inviter' }),
  invitee: one(users, { fields: [gameInvitations.inviteeId], references: [users.id], relationName: 'invitee' }),
}));

/**
 * Generic leaderboard registry. Adding a future ranking (Play Streak, a
 * game-specific streak) is a row here, not a new table.
 *
 * `key` is the stable identifier code branches on ('number-rush.time'); `name`
 * and `category` are display-only. `mode` and `metric` are documentation of
 * what the score actually is, so a future UI can explain itself generically.
 */
export const leaderboards = pgTable('leaderboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  gameType: text('game_type'),
  mode: text('mode'),
  metric: text('metric'),
  direction: leaderboardDirectionEnum('direction').notNull(),
  /**
   * Seasons are not implemented yet. The column exists so that adding a weekly
   * rotation later is a filter, not a migration of every leaderboard row.
   */
  season: text('season').notNull().default('all-time'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * One row per (leaderboard, user) holding that user's best score. This is the
 * personal best AND the leaderboard position at once — a worse result is
 * written to rankedGameResults but never here.
 */
export const leaderboardEntries = pgTable('leaderboard_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  leaderboardId: uuid('leaderboard_id')
    .notNull()
    .references(() => leaderboards.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Numeric, not integer: a Time score is milliseconds and a future streak
  // leaderboard may want a ratio. Integer would force a unit change per metric.
  score: numeric('score', { precision: 20, scale: 4 }).notNull(),
  rank: integer('rank'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.leaderboardId, t.userId),
}));

/**
 * Every ranked attempt, kept separate from the leaderboard so the board can be
 * reset, re-ranked, or re-computed from history without players losing runs.
 * Guests never appear here — the ranked:start handler rejects them before a
 * run can begin.
 */
export const rankedGameResults = pgTable('ranked_game_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  gameType: text('game_type').notNull(),
  mode: text('mode').notNull(),
  leaderboardKey: text('leaderboard_key'),
  /** The comparable number: ms for Time, floor count for Tower/Chaos. */
  rankingValue: numeric('ranking_value', { precision: 20, scale: 4 }).notNull(),
  totalTimeMs: integer('total_time_ms').notNull(),
  highestFloor: integer('highest_floor').notNull(),
  mistakes: integer('mistakes').notNull(),
  status: rankedRunStatusEnum('status').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  idx: index('ranked_results_user_idx').on(t.userId, t.leaderboardKey),
}));

export const leaderboardsRelations = relations(leaderboards, ({ many }) => ({
  entries: many(leaderboardEntries),
}));

export const leaderboardEntriesRelations = relations(leaderboardEntries, ({ one }) => ({
  leaderboard: one(leaderboards, {
    fields: [leaderboardEntries.leaderboardId],
    references: [leaderboards.id],
  }),
  user: one(users, { fields: [leaderboardEntries.userId], references: [users.id] }),
}));

export const rankedGameResultsRelations = relations(rankedGameResults, ({ one }) => ({
  user: one(users, { fields: [rankedGameResults.userId], references: [users.id] }),
}));

export const codenamesWordFiles = pgTable('codenames_word_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  originalFileName: text('original_file_name').notNull(),
  format: text('format').notNull(), // 'TXT' | 'CSV' | 'JSON'
  words: jsonb('words').$type<string[]>().notNull(),
  wordCount: integer('word_count').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * A jigsaw picture, stored as a data URL rather than in object storage. The repo
 * has no bucket, no multipart handler and no static file serving, and the client
 * already downscales to ~200KB before upload, so a text column is enough.
 * `width`/`height` are the decoded dimensions — the engine sizes the grid from
 * them, so they must be real, not client-asserted.
 */
export const jigsawImages = pgTable('jigsaw_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  mimeType: text('mime_type').notNull(),
  data: text('data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const spyfallLocationSets = pgTable('spyfall_location_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  originalFileName: text('original_file_name').notNull(),
  format: text('format').notNull(), // 'CSV' | 'TXT'
  // Each entry carries its own roles -- an uploaded location has no shared role
  // pool, so the roles travel with the name rather than being looked up.
  locations: jsonb('locations')
    .$type<{ id: string; name: string; roles: string[] }[]>()
    .notNull(),
  locationCount: integer('location_count').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
