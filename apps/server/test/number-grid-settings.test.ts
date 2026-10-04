import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateNumberGridSettings } from '../src/rooms/settings-validation.js';

const accept = (patch: Record<string, unknown>) => {
  const r = validateNumberGridSettings(patch);
  assert.equal(r.ok, true, r.ok ? '' : r.error);
  return (r as { settings: Record<string, unknown> }).settings;
};

const reject = (patch: Record<string, unknown>) => {
  const r = validateNumberGridSettings(patch);
  assert.equal(r.ok, false, `expected ${JSON.stringify(patch)} to be rejected`);
  return (r as { error: string }).error;
};

test('a valid custom progression is accepted', () => {
  const s = accept({ difficultyMode: 'CUSTOM', customGridSizes: [3, 5, 5, 8, 10] });

  assert.deepEqual(s.customGridSizes, [3, 5, 5, 8, 10]);
  // totalRounds is derived from the list so the engine cannot run past its end
  // and start padding with the last size.
  assert.equal(s.totalRounds, 5);
});

test('a grid size outside 2x2-10x10 is refused rather than clamped', () => {
  assert.match(reject({ customGridSizes: [3, 11] }), /between 2x2 and 10x10/);
  assert.match(reject({ customGridSizes: [3, 1] }), /between 2x2 and 10x10/);
  assert.match(reject({ customGridSizes: [3, 'big'] }), /between 2x2 and 10x10/);
});

test('a malformed round list is refused', () => {
  assert.match(reject({ customGridSizes: '3,5,5' }), /must be a list/);
  assert.match(reject({ customGridSizes: [] }), /between 1 and 20 rounds/);
  assert.match(reject({ customGridSizes: new Array(21).fill(3) }), /between 1 and 20 rounds/);
});

test('a ranked variant cannot be written into a normal room', () => {
  // Ranked is server-chosen and gated at game:start. If a host could park a
  // ranked variant in room settings, that gate would be the only thing left
  // standing.
  assert.match(reject({ variant: 'RANKED_TIME' }), /cannot be set on a normal room/);
  assert.match(reject({ variant: 'RANKED_TOWER' }), /cannot be set on a normal room/);
  assert.equal(accept({ variant: 'CHAOS' }).variant, 'CHAOS');
  assert.equal(accept({ variant: 'STANDARD' }).variant, 'STANDARD');
});

test('numeric ranges are clamped to the engine-supported bounds', () => {
  assert.equal(accept({ maxHp: 0 }).maxHp, 1);
  assert.equal(accept({ maxHp: 999 }).maxHp, 10);
  assert.equal(accept({ totalRounds: -5 }).totalRounds, 1);
  assert.equal(accept({ totalRounds: 999 }).totalRounds, 20);
});

test('unknown enum values are refused', () => {
  assert.match(reject({ difficultyMode: 'BRUTAL' }), /DEFAULT, CUSTOM or RANDOM/);
  assert.match(reject({ damageMode: 'EVERYONE_DIES' }), /LAST_PLAYER or EVERYONE_EXCEPT_FIRST/);
});

test('clearing the variant is allowed', () => {
  const s = accept({ variant: undefined });
  assert.equal(s.variant, undefined);
});

test('keys belonging to another game are dropped, not rejected', () => {
  // `gameSettings` is reused once the host changes game type, so a leftover
  // key must not make an otherwise valid update fail.
  const s = accept({ difficultyMode: 'DEFAULT', someWerewolfKey: 3 });
  assert.equal(s.difficultyMode, 'DEFAULT');
  assert.equal('someWerewolfKey' in s, false);
});
test('the largest-grid ceiling is accepted and range-checked', () => {
  assert.equal(accept({ maxGridSize: 5 }).maxGridSize, 5);
  assert.equal(accept({ maxGridSize: 2 }).maxGridSize, 2);
  assert.equal(accept({ maxGridSize: 10 }).maxGridSize, 10);
  // Anything outside the ladder would reach every player's preview and then be
  // quietly rewritten by the engine's clamp.
  for (const bad of [1, 11, 0, -3, 5.5, 'big', null]) {
    assert.match(reject({ maxGridSize: bad }), /between 2x2 and 10x10/);
  }
});

test('a custom progression ignores the ceiling, which only Default reads', () => {
  const s = accept({ difficultyMode: 'CUSTOM', customGridSizes: [4, 4], maxGridSize: 9 });
  assert.deepEqual(s.customGridSizes, [4, 4]);
  assert.equal(s.totalRounds, 2);
  assert.equal(s.maxGridSize, 9);
});
