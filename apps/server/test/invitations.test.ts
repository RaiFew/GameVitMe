import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canInvite, isPersistedUserId } from '../src/services/invitations.js';

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
