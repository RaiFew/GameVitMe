/**
 * Run: npx tsx src/routes/check-auth-handoff.ts
 * Hits the real database from .env and cleans up after itself.
 */
import assert from 'node:assert';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, sessions, verifications } from '../db/schema.js';
import { randomUUID } from 'node:crypto';
import { issueHandoffCode, redeemHandoffCode } from './auth.routes.js';

const expiresAt = new Date(Date.now() + 60_000);
const sessionToken = randomUUID();
let userId = '';

try {
  const [user] = await db
    .insert(users)
    .values({ name: 'handoff-check', displayName: 'handoff-check', status: 'online' })
    .returning();
  assert.ok(user, 'could not create check user');
  userId = user.id;
  await db.insert(sessions).values({ userId, token: sessionToken, expiresAt });

  // A code is a UUID — Postgres will throw on any other shape.
  const code = await issueHandoffCode(sessionToken);
  assert.match(code, /^[0-9a-f-]{36}$/, 'code must be a UUID');

  const first = await redeemHandoffCode(code);
  assert.ok(first, 'valid code should redeem');
  assert.equal(first!.token, sessionToken, 'should return the session token');
  assert.equal(first!.user.id, userId, 'should return the owning user');

  const replay = await redeemHandoffCode(code);
  assert.equal(replay, null, 'replayed code must be rejected');

  // Expiry is enforced even when the code is still well-formed and unused.
  const expiredId = randomUUID();
  await db.insert(verifications).values({
    id: expiredId,
    identifier: 'oauth-handoff',
    value: sessionToken,
    expiresAt: new Date(Date.now() - 1000),
  });
  assert.equal(await redeemHandoffCode(expiredId), null, 'expired code must be rejected');

  // A better-auth verification row must never be redeemable as a handoff code.
  const foreignId = randomUUID();
  await db.insert(verifications).values({
    id: foreignId,
    identifier: 'state',
    value: 'something',
    expiresAt: new Date(Date.now() + 60_000),
  });
  assert.equal(await redeemHandoffCode(foreignId), null, 'non-handoff rows must be rejected');

  assert.equal(await redeemHandoffCode(randomUUID()), null, 'unknown code must be rejected');

  console.log('auth handoff checks passed');
} finally {
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
  process.exit(0);
}
