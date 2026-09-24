import type { CardColor, CodenamesCard, TeamColor } from '../types/index.js';

export interface BoardGenerationResult {
  cards: CodenamesCard[];
  startingTeam: TeamColor;
  redTotal: number;
  blueTotal: number;
}

export function generateCodenamesBoard(
  wordPool: string[],
  random: () => number = Math.random,
  forcedStartingTeam?: TeamColor
): BoardGenerationResult {
  if (wordPool.length < 25) {
    throw new Error(`Word pool must contain at least 25 words to generate a board. Received ${wordPool.length}.`);
  }

  // Pick 25 unique words
  const shuffledWords = [...wordPool];
  for (let i = shuffledWords.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j]!, shuffledWords[i]!];
  }
  const selectedWords = shuffledWords.slice(0, 25);

  // Determine starting team
  const startingTeam: TeamColor = forcedStartingTeam || (random() < 0.5 ? 'RED' : 'BLUE');
  const secondTeam: TeamColor = startingTeam === 'RED' ? 'BLUE' : 'RED';

  // Card distribution:
  // 9 for starting team, 8 for second team, 7 for neutral, 1 for assassin
  const cardColors: CardColor[] = [
    ...Array(9).fill(startingTeam),
    ...Array(8).fill(secondTeam),
    ...Array(7).fill('NEUTRAL'),
    'ASSASSIN',
  ];

  // Shuffle card colors
  for (let i = cardColors.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cardColors[i], cardColors[j]] = [cardColors[j]!, cardColors[i]!];
  }

  // Create 25 cards
  const cards: CodenamesCard[] = selectedWords.map((word, idx) => ({
    id: `card-${idx}`,
    word,
    color: cardColors[idx]!,
    revealed: false,
  }));

  return {
    cards,
    startingTeam,
    redTotal: startingTeam === 'RED' ? 9 : 8,
    blueTotal: startingTeam === 'BLUE' ? 9 : 8,
  };
}
