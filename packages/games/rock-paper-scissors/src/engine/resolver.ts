import type {
  RPSChoice,
  RPSGameMode,
  RPSPlayerState,
  RPSRoundOutcome,
} from '../types/index.js';

export function beats(a: RPSChoice, b: RPSChoice): boolean {
  return (
    (a === 'ROCK' && b === 'SCISSORS') ||
    (a === 'SCISSORS' && b === 'PAPER') ||
    (a === 'PAPER' && b === 'ROCK')
  );
}

export function getChoiceEmoji(choice: RPSChoice): string {
  switch (choice) {
    case 'ROCK':
      return '🪨';
    case 'PAPER':
      return '📄';
    case 'SCISSORS':
      return '✂️';
  }
}

export function resolveRound(
  roundNumber: number,
  gameMode: RPSGameMode,
  players: Record<string, RPSPlayerState>,
  activePlayerIds: string[],
): RPSRoundOutcome {
  const choices: Record<string, RPSChoice | null> = {};
  const activeChoices: { playerId: string; choice: RPSChoice }[] = [];

  for (const id of activePlayerIds) {
    const player = players[id];
    const choice = player?.currentChoice || null;
    choices[id] = choice;
    if (choice) {
      activeChoices.push({ playerId: id, choice });
    }
  }

  // Find unique choices
  const uniqueChoices = Array.from(new Set(activeChoices.map((c) => c.choice)));

  // Case 1: 0 choices or everyone failed to choose
  if (uniqueChoices.length === 0) {
    return {
      roundNumber,
      isTie: true,
      tieReason: 'NO_CHOICES',
      winnerIds: [],
      loserIds: [],
      eliminatedIds: [],
      choices,
      description: 'No choices were made. The round is a tie!',
    };
  }

  // Case 2: Everyone chose the same weapon
  if (uniqueChoices.length === 1) {
    const weapon = uniqueChoices[0]!;
    return {
      roundNumber,
      isTie: true,
      tieReason: 'ALL_SAME',
      winnerIds: [],
      loserIds: [],
      eliminatedIds: [],
      choices,
      description: `All active players chose ${getChoiceEmoji(weapon)} ${weapon}. Tie round!`,
    };
  }

  // Case 3: All 3 weapons were thrown (Rock, Paper, Scissors all present)
  if (uniqueChoices.length === 3) {
    return {
      roundNumber,
      isTie: true,
      tieReason: 'ALL_THREE_PRESENT',
      winnerIds: [],
      loserIds: [],
      eliminatedIds: [],
      choices,
      description: 'All 3 weapons thrown (🪨 Rock, 📄 Paper, ✂️ Scissors) — Standoff! Tie round.',
    };
  }

  // Case 4: Exactly 2 weapons were thrown -> One beats the other!
  const choiceA = uniqueChoices[0];
  const choiceB = uniqueChoices[1];

  if (!choiceA || !choiceB) {
    return {
      roundNumber,
      isTie: true,
      tieReason: 'NO_CHOICES',
      winnerIds: [],
      loserIds: [],
      eliminatedIds: [],
      choices,
      description: 'Round could not be determined.',
    };
  }

  const winningChoice: RPSChoice = beats(choiceA, choiceB) ? choiceA : choiceB;
  const losingChoice: RPSChoice = winningChoice === choiceA ? choiceB : choiceA;

  const winnerIds = activeChoices
    .filter((c) => c.choice === winningChoice)
    .map((c) => c.playerId);

  const loserIds = activeChoices
    .filter((c) => c.choice === losingChoice)
    .map((c) => c.playerId);

  let description = '';
  if (winningChoice === 'ROCK' && losingChoice === 'SCISSORS') {
    description = '🪨 Rock crushes ✂️ Scissors!';
  } else if (winningChoice === 'SCISSORS' && losingChoice === 'PAPER') {
    description = '✂️ Scissors cut 📄 Paper!';
  } else if (winningChoice === 'PAPER' && losingChoice === 'ROCK') {
    description = '📄 Paper covers 🪨 Rock!';
  }

  const eliminatedIds = gameMode === 'BATTLE_ROYALE' ? [...loserIds] : [];

  return {
    roundNumber,
    isTie: false,
    winningChoice,
    losingChoice,
    winnerIds,
    loserIds,
    eliminatedIds,
    choices,
    description,
  };
}
