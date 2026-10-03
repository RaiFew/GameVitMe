import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canInvite, isPersistedUserId, TOKEN_RE, INVITATION_TTL_MS, LINK_INVITATION_TTL_MS } from '../src/services/invitations.js';
import { randomBytes } from 'node:crypto';

const HOST = '11111111-1111-4111-8111-111111111111';
const PLAYER = '22222222-2222-4222-8222-222222222222';

const room = (over: any = {}) => ({
  hostId: HOST,
  settings: { allowPlayerInvites: false },
  ...over,
});

test('guest ids are rejected before they reach a uuid column', () => {
  assert.equal(isPersistedUserId(HOST), true);
  assert.equal(isPersistedUserId('guest_ab12cd3'), false);
  assert.equal(isPersistedUserId(''), false);
  assert.equal(isPersistedUserId(undefined), false);
  assert.equal(isPersistedUserId(null), false);
});

test('the host can always invite', () => {
  assert.equal(canInvite(room(), HOST), true);
});

test('a non-host cannot invite unless the room allows player invites', () => {
  assert.equal(canInvite(room(), PLAYER), false);
  assert.equal(canInvite(room({ settings: { allowPlayerInvites: true } }), PLAYER), true);
  // Truthy non-boolean settings must not unlock it.
  assert.equal(canInvite(room({ settings: { allowPlayerInvites: 'yes' } }), PLAYER), false);
});

test('guests and unknown rooms cannot invite', () => {
  assert.equal(canInvite(room(), 'guest_ab12cd3'), false);
  assert.equal(canInvite(null, HOST), false);
});

test('minted link tokens pass the gate the claim route screens with', () => {
  for (let i = 0; i < 200; i++) {
    assert.equal(TOKEN_RE.test(randomBytes(16).toString('base64url')), true);
  }
});

test('the token gate rejects anything that is not a minted token', () => {
  // Path traversal and separators must never reach the database as a lookup value.
  for (const bad of ['', 'x', '../admin', "'; drop table game_invitations; --", 'a'.repeat(23), 'a'.repeat(21)]) {
    assert.equal(TOKEN_RE.test(bad), false, bad);
  }
});

test('a shared link outlives a DM invite', () => {
  assert.equal(LINK_INVITATION_TTL_MS > INVITATION_TTL_MS, true);
});
