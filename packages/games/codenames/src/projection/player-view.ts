import type { GameContext } from '@party/game-engine';
import type {
  CodenamesMasterState,
  CodenamesPlayerView,
  CodenamesPublicCard,
} from '../types/index.js';

export function projectCodenamesPlayerView(
  state: CodenamesMasterState,
  playerId: string,
  ctx: GameContext
): CodenamesPlayerView {
  const me = state.players.find((p) => p.id === playerId);
  const isHost = playerId === state.hostPlayerId;
  const isSpymaster = me?.role === 'SPYMASTER';
  const isGameOver = state.phase === 'GAME_OVER';

  // Card visibility masking:
  // Spymasters see all colors.
  // When GAME_OVER, all players see all colors.
  // Operatives and unassigned players see color ONLY IF card.revealed === true!
  const publicCards: CodenamesPublicCard[] = state.cards.map((card) => {
    const showColor = isGameOver || isSpymaster || card.revealed;
    return {
      id: card.id,
      word: card.word,
      color: showColor ? card.color : undefined,
      revealed: card.revealed,
      revealedByTeam: card.revealedByTeam,
    };
  });

  const isMyTurn = !!(me?.team && me.team === state.currentTeam);
  const canGiveClue = state.phase === 'CLUE' && isMyTurn && me?.role === 'SPYMASTER';
  const canGuess = state.phase === 'GUESSING' && isMyTurn && me?.role === 'OPERATIVE';

  // Check if setup is valid to start
  let canStartMatch = false;
  if (state.phase === 'TEAM_SETUP' && isHost) {
    if (state.gameMode === 'TWO_PLAYER') {
      const spymaster = state.players.find((p) => p.team === 'RED' && p.role === 'SPYMASTER');
      const operative = state.players.find((p) => p.team === 'RED' && p.role === 'OPERATIVE');
      canStartMatch = state.players.length === 2 && !!spymaster && !!operative;
    } else {
      const redSpymaster = state.players.find((p) => p.team === 'RED' && p.role === 'SPYMASTER');
      const redOperatives = state.players.filter((p) => p.team === 'RED' && p.role === 'OPERATIVE');
      const blueSpymaster = state.players.find((p) => p.team === 'BLUE' && p.role === 'SPYMASTER');
      const blueOperatives = state.players.filter((p) => p.team === 'BLUE' && p.role === 'OPERATIVE');

      canStartMatch =
        !!redSpymaster &&
        redOperatives.length > 0 &&
        !!blueSpymaster &&
        blueOperatives.length > 0;
    }
  }

  const isTwoPlayer = state.gameMode === 'TWO_PLAYER';
  const cooperativeScore = isTwoPlayer
    ? {
        found: Math.max(0, 9 - state.redRemaining),
        total: 9,
        mistakes: state.mistakesMade || 0,
        remaining: state.redRemaining,
      }
    : undefined;

  // History is a replay of what actually happened, so every recorded word is one
  // an Operative already saw selected — except at game over, when the board is
  // uncovered anyway and an Operative is about to be shown the key.
  const revealAll = isGameOver || isSpymaster;
  const mask = (g: (typeof state.currentGuesses)[number]) => ({
    cardId: g.cardId,
    word: g.word,
    resultedIn: g.resultedIn,
    guessedBy: g.guessedBy,
    color: revealAll ? g.color : undefined,
  });

  const history = state.history.map((turn) => ({
    turnNumber: turn.turnNumber,
    team: turn.team,
    clue: turn.clue,
    endedReason: turn.endedReason,
    guesses: turn.guesses.map(mask),
  }));

  // The turn in flight is appended so a word guessed a second ago is visible
  // now, not only once the turn has been filed.
  if (state.phase === 'GUESSING' && state.currentClue) {
    history.push({
      turnNumber: state.turnNumber,
      team: state.currentTeam,
      clue: state.currentClue,
      endedReason: 'IN_PROGRESS',
      guesses: state.currentGuesses.map(mask),
    });
  }

  return {
    phase: state.phase,
    gameMode: state.gameMode || 'CLASSIC',
    roomId: state.roomId,
    hostPlayerId: state.hostPlayerId,
    me: {
      id: playerId,
      displayName: me?.displayName || 'Spectator',
      team: me?.team || null,
      role: me?.role || null,
      isHost,
      isMyTurn,
      canGiveClue,
      canGuess,
    },
    players: state.players.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      seatNumber: p.seatNumber,
      isConnected: p.isConnected,
      team: p.team,
      role: p.role,
      isHost: p.id === state.hostPlayerId,
    })),
    startingTeam: state.startingTeam,
    currentTeam: state.currentTeam,
    currentClue: state.currentClue,
    guessesRemaining: state.guessesRemaining,
    guessesMadeInTurn: state.guessesMadeInTurn,
    cards: publicCards,
    redRemaining: state.redRemaining,
    blueRemaining: state.blueRemaining,
    mistakesMade: state.mistakesMade || 0,
    cooperativeScore,
    winner: state.winner,
    winReason: state.winReason,
    wordSource: state.wordSource,
    turnNumber: state.turnNumber,
    canStartMatch,
    history,
    // Only meaningful while a turn is live; a stale deadline on the game-over
    // screen would keep counting down after play stopped.
    turnExpiresAt: isGameOver || state.phase === 'TEAM_SETUP' ? null : state.turnExpiresAt,
    timerKind: isGameOver || state.phase === 'TEAM_SETUP' ? null : state.timerKind,
  };
}
