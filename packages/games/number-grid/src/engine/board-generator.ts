import type { GridSize, DifficultyMode, NumberCircleCard } from '../types/index.js';

export const ALL_GRID_SIZES: GridSize[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Upper bound of the Chaos / RANKED_CHAOS number pool. */
export const CHAOS_NUMBER_CEILING = 1000;

/**
 * Draws `count` distinct values from 1..ceiling and returns them ascending.
 * Ascending because the click order is the sort order: the player hunts for the
 * smallest remaining value, which is what makes a sparse 1-1000 board readable.
 *
 * Rejection sampling over a Set rather than a shuffled 1000-slot pool: a board
 * holds at most 100 values, so the loop is short and there is no 1000-entry
 * allocation per floor.
 */
export function drawChaosNumbers(count: number, random: () => number = Math.random): number[] {
  const size = Math.max(1, Math.min(CHAOS_NUMBER_CEILING, Math.floor(count)));
  const picked = new Set<number>();
  while (picked.size < size) {
    picked.add(1 + Math.floor(random() * CHAOS_NUMBER_CEILING));
  }
  return [...picked].sort((a, b) => a - b);
}

/**
 * Builds a server-authoritative board.
 *
 * `sequence` is the click order (ascending); the cards are that same set
 * shuffled into visual position, so position carries no information about order.
 */
export function buildBoard(
  gridSize: GridSize,
  options: { numberRange?: 'SEQUENTIAL' | 'CHAOS'; random?: () => number } = {},
): { cards: NumberCircleCard[]; sequence: number[] } {
  const random = options.random ?? Math.random;
  const total = gridSize * gridSize;
  const sequence =
    options.numberRange === 'CHAOS' ? drawChaosNumbers(total, random) : Array.from({ length: total }, (_, i) => i + 1);

  const cards = [...sequence];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = cards[i]!;
    cards[i] = cards[j]!;
    cards[j] = tmp;
  }

  return {
    cards: cards.map((num, idx) => ({
      // Index is part of the id so two boards with identical number sets still
      // produce distinct card ids.
      id: `card_${gridSize}x${gridSize}_${num}_${idx}`,
      number: num,
      index: idx,
    })),
    sequence,
  };
}

/**
 * Generates an authoritative shuffled board of 1..N cards inside a gridSize * gridSize grid.
 */
export function generateBoard(gridSize: GridSize): NumberCircleCard[] {
  return buildBoard(gridSize).cards;
}

/**
 * Calculates authoritative grid sizes for every round according to the selected difficulty mode.
 */
export function calculateRoundGridSizes(
  mode: DifficultyMode,
  totalRounds: number,
  customSizes?: GridSize[],
  // Passed in rather than calling Math.random directly, so a run is reproducible
  // from its seed like every other random decision a game makes.
  random: () => number = Math.random,
  maxGridSize?: number,
): GridSize[] {
  const count = Math.max(1, Math.min(20, totalRounds || 9));

  if (mode === 'CUSTOM' && customSizes && customSizes.length > 0) {
    const list: GridSize[] = [];
    for (let r = 0; r < count; r++) {
      const size = customSizes[r] ?? customSizes[customSizes.length - 1] ?? 3;
      list.push(clampGridSize(size));
    }
    return list;
  }

  if (mode === 'RANDOM') {
    const list: GridSize[] = [];
    for (let r = 0; r < count; r++) {
      const randomSize = ALL_GRID_SIZES[Math.floor(random() * ALL_GRID_SIZES.length)] ?? 3;
      list.push(randomSize);
    }
    return list;
  }

  // DEFAULT PROGRESSION: scales from 2x2 up to the host's ceiling, spread evenly
  // across however many rounds were asked for. Nine rounds to a 10x10 ceiling
  // reproduces the original 2,3,4,5,6,7,8,9,10 ladder exactly.
  const top = clampGridSize(maxGridSize || 10);
  const result: GridSize[] = [];
  for (let r = 0; r < count; r++) {
    const size = count === 1 ? top : 2 + Math.round((r * (top - 2)) / (count - 1));
    result.push(clampGridSize(size));
  }
  return result;
}

export function clampGridSize(val: number): GridSize {
  const clamped = Math.max(2, Math.min(10, Math.floor(val)));
  return (ALL_GRID_SIZES.includes(clamped as GridSize) ? clamped : 3) as GridSize;
}
