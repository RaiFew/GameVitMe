import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle } from '../src/shuffle.js';

/** Deterministic LCG so a failure is reproducible from the printed seed. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const ids = (list: { id: string }[]) => list.map((x) => x.id).sort();

test('shuffle is a permutation — nothing is lost, duplicated or invented', () => {
  const input = Array.from({ length: 16 }, (_, i) => ({ id: `loc${i}` }));
  const out = shuffle(input, seeded(7));

  assert.equal(out.length, input.length);
  assert.deepEqual(ids(out), ids(input));
  assert.equal(new Set(out.map((x) => x.id)).size, input.length);
});

test('shuffle does not mutate its input', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  shuffle(input, seeded(3));
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('shuffle actually reorders', () => {
  const input = Array.from({ length: 16 }, (_, i) => i);
  const out = shuffle(input, seeded(11));
  assert.notDeepEqual(out, input, 'a shuffle of 16 items should not be the identity');
});

test('the same seed reproduces the same order', () => {
  const input = Array.from({ length: 12 }, (_, i) => i);
  assert.deepEqual(shuffle(input, seeded(99)), shuffle(input, seeded(99)));
});

test('every element reaches every position — this is what the old sort got wrong', () => {
  // `sort(() => random() - 0.5)` is not a shuffle. V8's TimSort with an
  // inconsistent comparator leaves middle elements far more likely to keep
  // their place, so a player sitting mid-list was picked as spymaster far more
  // often than a player on the ends. A uniform permutation must move every
  // element with equal probability.
  const input = Array.from({ length: 8 }, (_, i) => i);
  const runs = 20000;

  for (const target of [0, 3, 7]) {
    let landed = 0;
    for (let seed = 0; seed < runs; seed++) {
      if (shuffle(input, seeded(seed))[target] === target) landed++;
    }
    // 1/8 of runs would leave `target` in place under a uniform shuffle.
    const rate = landed / runs;
    assert.ok(
      Math.abs(rate - 0.125) < 0.02,
      `element ${target} stayed put ${(rate * 100).toFixed(1)}% of the time, expected ~12.5%`
    );
  }
});

test('empty and single-element input is handled', () => {
  assert.deepEqual(shuffle([], seeded(1)), []);
  assert.deepEqual(shuffle([42], seeded(1)), [42]);
});
