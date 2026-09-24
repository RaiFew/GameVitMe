import type { GridSize, DifficultyMode, NumberCircleCard } from '../types/index.js';

export const ALL_GRID_SIZES: GridSize[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Generates an authoritative shuffled board of 1..N cards inside a gridSize * gridSize grid.
 */
export function generateBoard(gridSize: GridSize): NumberCircleCard[] {
  const total = gridSize * gridSize;
  const numbers: number[] = Array.from({ length: total }, (_, i) => i + 1);

  // Fisher-Yates shuffle
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = numbers[i]!;
    numbers[i] = numbers[j]!;
    numbers[j] = temp;
  }

  return numbers.map((num, idx) => ({
    id: `card_${gridSize}x${gridSize}_${num}_${idx}`,
    number: num,
    index: idx,
  }));
}

/**
 * Calculates authoritative grid sizes for every round according to the selected difficulty mode.
 */
export function calculateRoundGridSizes(
  mode: DifficultyMode,
  totalRounds: number,
  customSizes?: GridSize[],
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
      const randomSize = ALL_GRID_SIZES[Math.floor(Math.random() * ALL_GRID_SIZES.length)] ?? 3;
      list.push(randomSize);
    }
    return list;
  }

  // DEFAULT PROGRESSION: 2, 3, 4, 5, 6, 7, 8, 9, 10...
  const defaultList: GridSize[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result: GridSize[] = [];
  for (let r = 0; r < count; r++) {
    const idx = Math.min(r, defaultList.length - 1);
    result.push(defaultList[idx] ?? 3);
  }
  return result;
}

export function clampGridSize(val: number): GridSize {
  const clamped = Math.max(2, Math.min(10, Math.floor(val)));
  return (ALL_GRID_SIZES.includes(clamped as GridSize) ? clamped : 3) as GridSize;
}
