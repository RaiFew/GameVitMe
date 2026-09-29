import type { GameContext, GameMove, MoveResult } from '@party/game-engine';
import { NIGHT_ROLE, type SalemMasterState } from '../types/index.js';
import { deriveRoleToken } from '../engine/role-claim.js';
import { resolveNight } from '../engine/night-resolution.js';

const NEXT_PHASE: Partial<Record<SalemMasterState['phase'], SalemMasterState['phase']>> = {
  LOBBY: 'NIGHT_WITCH',
  NIGHT_WITCH: 'NIGHT_CONSTABLE',
  NIGHT_CONSTABLE: 'MORNING',
  MORNING: 'CONFESSION',
  CONFESSION: 'RESOLUTION',
  // RESOLUTION is the only place the Host may branch: another night, or the end.
  RESOLUTION: 'NIGHT_WITCH',
};

function emptyNight(): SalemMasterState['night'] {
  return {
    witchTargetPlayerId: null,
    constableProtectionPlayerId: null,
    claims: {},
    result: null,
    deadPlayerIds: [],
  };
}

export function processSalemMove(
  state: SalemMasterState,
  move: GameMove,
  ctx: GameContext
): MoveResult<SalemMasterState> {
  const payload = (move.payload || {}) as Record<string, any>;

  switch (move.type) {
    case 'CLAIM_ROLE': {
      const role = NIGHT_ROLE[state.phase]!;
      const token = deriveRoleToken(role, state.roundNumber, move.playerId, payload.passphrase);

      // The capability goes to this socket only — never into the player view,
      // which is what every other client and the Host can read.
      ctx.emitToPlayer(move.playerId, 'salem:role_token', {
        role,
        round: state.roundNumber,
        token,
      });

      return {
        success: true,
        newState: {
          ...state,
          night: {
            ...state.night,
            claims: {
              ...state.night.claims,
              [role]: { playerId: move.playerId, role, round: state.roundNumber, token },
            },
          },
        },
      };
    }

    case 'NIGHT_ACTION': {
      const role = NIGHT_ROLE[state.phase]!;
      return {
        success: true,
        newState: {
          ...state,
          night: {
            ...state.night,
            [role === 'WITCH' ? 'witchTargetPlayerId' : 'constableProtectionPlayerId']:
              payload.targetPlayerId as string,
          },
        },
      };
    }

    case 'HOST_ADVANCE': {
      const next = NEXT_PHASE[state.phase];
      if (!next) {
        return { success: false, error: 'The trial cannot move further.' };
      }

      // A new night clears the cards; a claim never carries across rounds.
      if (next === 'NIGHT_WITCH') {
        return {
          success: true,
          newState: {
            ...state,
            phase: 'NIGHT_WITCH',
            roundNumber: state.roundNumber + 1,
            night: emptyNight(),
          },
        };
      }

      // The night resolves on the way into MORNING, once, so no later move can
      // rewrite the outcome the village has already been shown.
      if (next === 'MORNING') {
        const resolution = resolveNight(
          state.night.witchTargetPlayerId,
          state.night.constableProtectionPlayerId
        );
        const dead = new Set(resolution.deadPlayerIds);

        return {
          success: true,
          newState: {
            ...state,
            phase: 'MORNING',
            players: state.players.map((p) =>
              dead.has(p.id) ? { ...p, isAlive: false, deathRound: state.roundNumber } : p
            ),
            night: {
              ...state.night,
              result: resolution.result,
              deadPlayerIds: resolution.deadPlayerIds,
            },
            deaths: [
              ...state.deaths,
              ...resolution.deadPlayerIds.map((playerId) => ({
                round: state.roundNumber,
                playerId,
              })),
            ],
          },
        };
      }

      return { success: true, newState: { ...state, phase: next } };
    }

    case 'END_GAME': {
      return {
        success: true,
        newState: {
          ...state,
          phase: 'GAME_OVER',
          gameOverData: {
            roundsPlayed: state.roundNumber,
            survivors: state.players.filter((p) => p.isAlive).map((p) => p.id),
          },
        },
      };
    }

    default:
      return { success: false, error: `Unhandled move: ${move.type}` };
  }
}
