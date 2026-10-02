/**
 * Fisher-Yates using the game's injected generator.
 *
 * Replaces the `sort(() => random() - 0.5)` idiom, which looks like a shuffle
 * and is not one: `Array.prototype.sort` with an inconsistent comparator is
 * implementation-defined, and on V8's TimSort it produces a visibly skewed
 * distribution rather than a uniform permutation. On top of that it cannot be
 * reproduced from a seed, which every decision made through `ctx.random()` can.
 */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}