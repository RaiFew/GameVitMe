import type { GameContext, GameMove, MoveResult } from '@party/game-engine';
import type {
  CodenamesMasterState,
  CodenamesRole,
  TeamColor,
  CodenamesGuess,
} from '../types/index.js';
import { generateCodenamesBoard } from '../engine/board-generator.js';

export function validateCodenamesMove(
  state: CodenamesMasterState,
  move: GameMove,
  ctx: GameContext
): { valid: boolean; reason?: string; error?: string } {
  const fail = (msg: string) => ({ valid: false, reason: msg, error: msg });
  const ok = () => ({ valid: true });

  const player = state.players.find((p) => p.id === move.playerId);
  if (!player) {
    return fail('Player is not in the room.');
  }

  const isHost = move.playerId === state.hostPlayerId;

  switch (move.type) {
    case 'ASSIGN_TEAM_ROLE': {
      if (state.phase !== 'TEAM_SETUP') {
        return fail('Teams can only be assigned during team setup.');
      }
      const targetId = (move.payload as any)?.targetPlayerId || move.playerId;
      // Normal players can only change their own team/role unless they are the room host
      if (targetId !== move.playerId && !isHost) {
        return fail('Only the room host can change other players assignments.');
      }
      const requestedRole = (move.payload as any)?.role as CodenamesRole | null;
      const requestedTeam = (move.payload as any)?.team as TeamColor | null;

      // If claiming Spymaster, ensure no one else is currently Spymaster for that team
      if (requestedTeam && requestedRole === 'SPYMASTER') {
        const existingSpymaster = state.players.find(
          (p) => p.id !== targetId && p.team === requestedTeam && p.role === 'SPYMASTER'
        );
        if (existingSpymaster) {
          return fail(
            `${existingSpymaster.displayName} is already the ${requestedTeam} Spymaster. Each team has exactly 1 Spymaster.`
          );
        }
      }
      return ok();
    }

    case 'SWAP_ROLES': {
      if (state.phase !== 'TEAM_SETUP') {
        return fail('Roles can only be swapped during team setup.');
      }
      if (state.players.length !== 2) {
        return fail('Swap roles is only available with 2 players.');
      }
      return ok();
    }

    case 'RANDOMIZE_TEAMS': {
      if (state.phase !== 'TEAM_SETUP') {
        return fail('Teams can only be randomized during team setup.');
      }
      if (!isHost) {
        return fail('Only the room host can randomize teams.');
      }
      if (state.players.length < 4) {
        return fail('At least 4 players are required to randomize teams.');
      }
      return ok();
    }

    case 'START_MATCH': {
      if (state.phase !== 'TEAM_SETUP') {
        return fail('Match has already started.');
      }
      if (!isHost) {
        return fail('Only the room host can start the match.');
      }

      if (state.gameMode === 'TWO_PLAYER') {
        if (state.players.length !== 2) {
          return fail('2-Player Codenames requires exactly 2 players.');
        }
        const spymaster = state.players.find((p) => p.team === 'RED' && p.role === 'SPYMASTER');
        const operative = state.players.find((p) => p.team === 'RED' && p.role === 'OPERATIVE');
        if (!spymaster) {
          return fail('One player must be assigned as Spymaster.');
        }
        if (!operative) {
          return fail('One player must be assigned as Operative.');
        }
        if (state.wordPoolSnapshot.length < 25) {
          return fail('Word pool has fewer than 25 words.');
        }
        return ok();
      }

      const redSpymaster = state.players.find((p) => p.team === 'RED' && p.role === 'SPYMASTER');
      const redOperatives = state.players.filter((p) => p.team === 'RED' && p.role === 'OPERATIVE');
      const blueSpymaster = state.players.find((p) => p.team === 'BLUE' && p.role === 'SPYMASTER');
      const blueOperatives = state.players.filter((p) => p.team === 'BLUE' && p.role === 'OPERATIVE');

      if (!redSpymaster) {
        return fail('Red team needs a Spymaster before starting.');
      }
      if (redOperatives.length === 0) {
        return fail('Red team needs at least one Operative before starting.');
      }
      if (!blueSpymaster) {
        return fail('Blue team needs a Spymaster before starting.');
      }
      if (blueOperatives.length === 0) {
        return fail('Blue team needs at least one Operative before starting.');
      }
      if (state.wordPoolSnapshot.length < 25) {
        return fail('Word pool has fewer than 25 words.');
      }
      return ok();
    }

    case 'SUBMIT_CLUE': {
      if (state.phase !== 'CLUE') {
        return fail('Not currently in the Clue phase.');
      }
      if (player.team !== state.currentTeam || player.role !== 'SPYMASTER') {
        return fail(`Only the ${state.currentTeam} Spymaster can give a clue.`);
      }
      const word = String((move.payload as any)?.word || '').trim();
      const number = Number((move.payload as any)?.number);

      if (!word) {
        return fail('Clue word cannot be empty.');
      }
      if (/\s/.test(word)) {
        return fail('Clue must be a single word with no spaces.');
      }
      if (isNaN(number) || number < 0 || number > 9) {
        return fail('Clue number must be an integer between 0 and 9.');
      }
      return ok();
    }

    case 'SELECT_CARD': {
      if (state.phase !== 'GUESSING') {
        return fail('Not currently in the Guessing phase.');
      }
      if (player.team !== state.currentTeam || player.role !== 'OPERATIVE') {
        return fail(`Only ${state.currentTeam} Operatives can select cards during guessing.`);
      }
      const cardId = (move.payload as any)?.cardId;
      const card = state.cards.find((c) => c.id === cardId);
      if (!card) {
        return fail('Card not found on board.');
      }
      if (card.revealed) {
        return fail('Card has already been revealed.');
      }
      return ok();
    }

    case 'END_GUESSING':
    case 'PASS_TURN': {
      if (state.phase !== 'GUESSING') {
        return fail('Not currently in the Guessing phase.');
      }
      if (player.team !== state.currentTeam || player.role !== 'OPERATIVE') {
        return fail(`Only ${state.currentTeam} Operatives can pass the turn.`);
      }
      return ok();
    }

    default:
      return fail(`Unknown move type: ${move.type}`);
  }
}

export function processCodenamesMove(
  state: CodenamesMasterState,
  move: GameMove,
  ctx: GameContext
): MoveResult<CodenamesMasterState> {
  const validation = validateCodenamesMove(state, move, ctx);
  if (!validation.valid) {
    return { success: false, error: validation.error || validation.reason };
  }

  const payload = move.payload as any;

  switch (move.type) {
    case 'ASSIGN_TEAM_ROLE': {
      const targetId = payload.targetPlayerId || move.playerId;
      const team = (payload.team as TeamColor) || null;
      const role = (payload.role as CodenamesRole) || null;

      const updatedPlayers = state.players.map((p) => {
        if (p.id === targetId) {
          return { ...p, team, role };
        }
        return p;
      });

      return {
        success: true,
        newState: {
          ...state,
          players: updatedPlayers,
        },
      };
    }

    case 'RANDOMIZE_TEAMS': {
      const shuffled = [...state.players].sort(() => ctx.random() - 0.5);
      const updatedPlayers = state.players.map((p) => {
        const idx = shuffled.findIndex((s) => s.id === p.id);
        if (idx === 0) return { ...p, team: 'RED' as TeamColor, role: 'SPYMASTER' as CodenamesRole };
        if (idx === 1) return { ...p, team: 'BLUE' as TeamColor, role: 'SPYMASTER' as CodenamesRole };
        const team: TeamColor = idx % 2 === 0 ? 'RED' : 'BLUE';
        return { ...p, team, role: 'OPERATIVE' as CodenamesRole };
      });

      return {
        success: true,
        newState: {
          ...state,
          players: updatedPlayers,
        },
      };
    }

    case 'SWAP_ROLES': {
      if (state.players.length !== 2) return { success: false, error: '2 players required' };
      const p1 = state.players[0]!;
      const p2 = state.players[1]!;
      const updatedPlayers = [
        { ...p1, team: 'RED' as TeamColor, role: (p1.role === 'SPYMASTER' ? 'OPERATIVE' : 'SPYMASTER') as CodenamesRole },
        { ...p2, team: 'RED' as TeamColor, role: (p2.role === 'SPYMASTER' ? 'OPERATIVE' : 'SPYMASTER') as CodenamesRole },
      ];
      return {
        success: true,
        newState: {
          ...state,
          players: updatedPlayers,
        },
      };
    }

    case 'START_MATCH': {
      const isTwoPlayer = state.gameMode === 'TWO_PLAYER';
      const boardGen = generateCodenamesBoard(
        state.wordPoolSnapshot,
        ctx.random,
        isTwoPlayer ? 'RED' : undefined
      );

      return {
        success: true,
        newState: {
          ...state,
          phase: 'CLUE',
          cards: boardGen.cards,
          startingTeam: boardGen.startingTeam,
          currentTeam: boardGen.startingTeam,
          redRemaining: boardGen.redTotal,
          blueRemaining: boardGen.blueTotal,
          mistakesMade: 0,
          currentClue: null,
          guessesRemaining: 0,
          guessesMadeInTurn: 0,
          turnNumber: 1,
          winner: null,
          winReason: undefined,
        },
      };
    }

    case 'SUBMIT_CLUE': {
      const word = String(payload.word).trim().toUpperCase();
      const number = Number(payload.number);
      const guessesRemaining = number === 0 ? 99 : number + 1;

      return {
        success: true,
        newState: {
          ...state,
          phase: 'GUESSING',
          currentClue: {
            word,
            number,
            team: state.currentTeam,
            submittedAt: Date.now(),
          },
          guessesRemaining,
          guessesMadeInTurn: 0,
        },
      };
    }

    case 'SELECT_CARD': {
      const cardId = payload.cardId;
      const card = state.cards.find((c) => c.id === cardId)!;
      const currentTeam = state.currentTeam;
      const opponentTeam: TeamColor = currentTeam === 'RED' ? 'BLUE' : 'RED';

      const updatedCard = {
        ...card,
        revealed: true,
        revealedByTeam: currentTeam,
      };

      const updatedCards = state.cards.map((c) => (c.id === cardId ? updatedCard : c));
      let redRemaining = state.redRemaining;
      let blueRemaining = state.blueRemaining;
      let winner: TeamColor | null = null;
      let winReason: CodenamesMasterState['winReason'];
      let phase: CodenamesMasterState['phase'] = 'GUESSING';
      let nextTeam = currentTeam;
      const newGuessesRemaining = state.guessesRemaining - 1;
      const newGuessesMade = state.guessesMadeInTurn + 1;

      const guessRecord: CodenamesGuess = {
        cardId,
        word: card.word,
        color: card.color,
        resultedIn:
          card.color === currentTeam
            ? 'CORRECT'
            : card.color === opponentTeam
            ? 'OPPONENT'
            : card.color === 'ASSASSIN'
            ? 'ASSASSIN'
            : 'NEUTRAL',
        guessedBy: move.playerId,
      };

      if (state.gameMode === 'TWO_PLAYER') {
        let redRemaining = state.redRemaining;
        let blueRemaining = state.blueRemaining;
        let mistakesMade = state.mistakesMade;
        let winner: TeamColor | null = null;
        let winReason: CodenamesMasterState['winReason'];
        let phase: CodenamesMasterState['phase'] = 'GUESSING';

        if (card.color === 'ASSASSIN') {
          // Instant loss
          winner = null;
          winReason = 'ASSASSIN_TRIGGERED';
          phase = 'GAME_OVER';
        } else if (card.color === 'RED') {
          // Friendly card found
          redRemaining--;
          if (redRemaining <= 0) {
            // Victory: all friendly agents contacted!
            winner = 'RED';
            winReason = 'ALL_CARDS_FOUND';
            phase = 'GAME_OVER';
          } else if (newGuessesRemaining <= 0) {
            // Out of guesses -> turn ends, return to CLUE
            phase = 'CLUE';
          } else {
            // Continue guessing
            phase = 'GUESSING';
          }
        } else if (card.color === 'BLUE') {
          // Opposing decoy card: mistake and turn ends immediately
          blueRemaining--;
          mistakesMade++;
          phase = 'CLUE';
        } else {
          // NEUTRAL bystander: mistake and turn ends immediately
          mistakesMade++;
          phase = 'CLUE';
        }

        const turnNumber = phase === 'CLUE' ? state.turnNumber + 1 : state.turnNumber;

        return {
          success: true,
          newState: {
            ...state,
            cards: updatedCards,
            redRemaining,
            blueRemaining,
            mistakesMade,
            phase,
            currentTeam: 'RED',
            currentClue: phase === 'CLUE' ? null : state.currentClue,
            guessesRemaining: phase === 'CLUE' ? 0 : newGuessesRemaining,
            guessesMadeInTurn: phase === 'CLUE' ? 0 : newGuessesMade,
            winner,
            winReason,
            turnNumber,
          },
        };
      }

      if (card.color === 'ASSASSIN') {
        // Instant loss: opponent wins!
        winner = opponentTeam;
        winReason = 'ASSASSIN_TRIGGERED';
        phase = 'GAME_OVER';
      } else if (card.color === currentTeam) {
        if (currentTeam === 'RED') redRemaining--;
        else blueRemaining--;

        // Check if current team found all cards
        if ((currentTeam === 'RED' && redRemaining <= 0) || (currentTeam === 'BLUE' && blueRemaining <= 0)) {
          winner = currentTeam;
          winReason = 'ALL_CARDS_FOUND';
          phase = 'GAME_OVER';
        } else if (newGuessesRemaining <= 0) {
          // Out of guesses -> switch turn
          phase = 'CLUE';
          nextTeam = opponentTeam;
        } else {
          // Continue guessing!
          phase = 'GUESSING';
        }
      } else if (card.color === opponentTeam) {
        if (opponentTeam === 'RED') redRemaining--;
        else blueRemaining--;

        // Check if opponent won from this
        if ((opponentTeam === 'RED' && redRemaining <= 0) || (opponentTeam === 'BLUE' && blueRemaining <= 0)) {
          winner = opponentTeam;
          winReason = 'ALL_CARDS_FOUND';
          phase = 'GAME_OVER';
        } else {
          // Turn ends immediately on opponent card
          phase = 'CLUE';
          nextTeam = opponentTeam;
        }
      } else {
        // NEUTRAL bystander -> Turn ends immediately
        phase = 'CLUE';
        nextTeam = opponentTeam;
      }

      const turnNumber = phase === 'CLUE' ? state.turnNumber + 1 : state.turnNumber;

      return {
        success: true,
        newState: {
          ...state,
          cards: updatedCards,
          redRemaining,
          blueRemaining,
          phase,
          currentTeam: nextTeam,
          currentClue: phase === 'CLUE' ? null : state.currentClue,
          guessesRemaining: phase === 'CLUE' ? 0 : newGuessesRemaining,
          guessesMadeInTurn: phase === 'CLUE' ? 0 : newGuessesMade,
          winner,
          winReason,
          turnNumber,
        },
      };
    }

    case 'END_GUESSING':
    case 'PASS_TURN': {
      if (state.gameMode === 'TWO_PLAYER') {
        return {
          success: true,
          newState: {
            ...state,
            phase: 'CLUE',
            currentTeam: 'RED',
            currentClue: null,
            guessesRemaining: 0,
            guessesMadeInTurn: 0,
            turnNumber: state.turnNumber + 1,
          },
        };
      }

      const opponentTeam: TeamColor = state.currentTeam === 'RED' ? 'BLUE' : 'RED';
      return {
        success: true,
        newState: {
          ...state,
          phase: 'CLUE',
          currentTeam: opponentTeam,
          currentClue: null,
          guessesRemaining: 0,
          guessesMadeInTurn: 0,
          turnNumber: state.turnNumber + 1,
        },
      };
    }

    default:
      return { success: false, error: 'Unhandled move' };
  }
}
