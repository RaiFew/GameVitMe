import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateMusicQuizSettings } from '../src/rooms/settings-validation.js';

describe('validateMusicQuizSettings', () => {
  test('accepts a plain query and question type', () => {
    const r = validateMusicQuizSettings({ query: 'Radiohead', questionType: 'ARTIST' });
    assert.ok(r.ok);
    assert.deepEqual(r.settings, { query: 'Radiohead', questionType: 'ARTIST' });
  });

  test('a blank query is a real choice, not a missing one', () => {
    const r = validateMusicQuizSettings({ query: '   ' });
    assert.ok(r.ok);
    assert.equal(r.settings.query, '');
  });

  test('numeric ranges are clamped to the engine-supported bounds', () => {
    const r = validateMusicQuizSettings({
      rounds: 9999,
      excerptSeconds: 1,
      answerSeconds: 0,
      maxPoints: 1e9,
    });
    assert.ok(r.ok);
    assert.deepEqual(r.settings, {
      rounds: 50,
      excerptSeconds: 5,
      answerSeconds: 5,
      maxPoints: 5000,
    });
  });

  test('the reveal length is the game\'s, not the host\'s', () => {
    // The reveal is how long the answer stays up and how long the clip plays on
    // through it, so it is a constant. The key is accepted — an old client still
    // sends it — and discarded rather than echoed back into the room settings.
    for (const v of [-3, 60, 5]) {
      const r = validateMusicQuizSettings({ revealSeconds: v });
      assert.ok(r.ok);
      assert.equal(r.settings.revealSeconds, undefined);
    }
  });

  test('an unknown question type is refused rather than defaulted', () => {
    const r = validateMusicQuizSettings({ questionType: 'LYRICS' });
    assert.equal(r.ok, false);
  });

  test('a non-string query is refused rather than coerced', () => {
    const r = validateMusicQuizSettings({ query: { $ne: null } });
    assert.equal(r.ok, false);
  });

  test('an overlong query is refused', () => {
    assert.equal(validateMusicQuizSettings({ query: 'x'.repeat(81) }).ok, false);
  });

  test('a client cannot inject its own song pool', () => {
    // `pool` is the whole trust boundary here: the real one is fetched by the
    // server at game:start from the provider search. It is not a known key, so
    // the validator drops it rather than rejecting the whole patch.
    const r = validateMusicQuizSettings({
      query: 'x',
      pool: [{ provider: 'deezer', providerId: '1', title: 'Mine', artist: 'Me' }],
    });
    assert.ok(r.ok);
    assert.equal(r.settings.pool, undefined);
    assert.deepEqual(r.settings, { query: 'x' });
  });

  test('keys belonging to another game are dropped, not rejected', () => {
    const r = validateMusicQuizSettings({ difficulty: 'HARD', imageId: 'anything' });
    assert.ok(r.ok);
    assert.deepEqual(r.settings, {});
  });

  test('excludedIds survives as a plain list of track keys', () => {
    const r = validateMusicQuizSettings({ excludedIds: ['deezer:123', 'itunes:456'] });
    assert.ok(r.ok);
    assert.deepEqual(r.settings.excludedIds, ['deezer:123', 'itunes:456']);
  });

  test('excludedIds cannot smuggle in a track of its own', () => {
    // Subtractive by construction: anything that is not `provider:id` on a
    // provider we know is dropped, so the list can only ever name tracks the
    // server already fetched. The `pool` key stays unavailable for the same reason.
    const r = validateMusicQuizSettings({
      excludedIds: ['deezer:1', 'spotify:9', 'deezer:../../etc', '', 42, { id: 'deezer:1' }],
    });
    assert.ok(r.ok);
    assert.deepEqual(r.settings.excludedIds, ['deezer:1']);
  });

  test('a non-array excludedIds is refused rather than ignored', () => {
    assert.equal(validateMusicQuizSettings({ excludedIds: 'deezer:1' }).ok, false);
  });
});