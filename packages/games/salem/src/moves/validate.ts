import type { GameMove } from '@party/game-engine';
import { NIGHT_ROLE, type SalemMasterState, type SalemPlayerState } from '../types/index.js';
import { isValidPassphrase, tokenMatches } from '../engine/role-claim.js';

function isTargetable(target: SalemPlayerState | undefined): boolean {
  return !!target && target.isAlive && !target.isHost;
}

export function validateSalemMove(
  state: SalemMasterState,
  move: GameMove
): { valid: boolean; reason?: string } {
  const player = state.players.find((p) => p.id === move.playerId);
  if (!player) {
    return { valid: false, reason: 'Player not found in game.' };
  }

  const payload = (move.payload || {}) as Record<string, any>;
  const isHost = player.isHost || player.id === state.hostPlayerId;
  const actingRole = NIGHT_ROLE[state.phase];

  switch (move.type) {
    case 'HOST_ADVANCE': {
      if (!isHost) {
        return { valid: false, reason: 'Only the Host moves the trial forward.' };
      }
      if (state.phase === 'GAME_OVER') {
        return { valid: false, reason: 'The trial has already concluded.' };
      }
      return { valid: true };
    }

    case 'END_GAME': {
      if (!isHost) {
        return { valid: false, reason: 'Only the Host can end the trial.' };
      }
      if (state.phase !== 'RESOLUTION') {
        return { valid: false, reason: 'The night must be resolved first.' };
      }
      return { valid: true };
    }

    case 'CLAIM_ROLE': {
      if (!actingRole) {
        return { valid: false, reason: 'No role is being called for right now.' };
      }
      if (player.isHost || player.canPlay === false) {
        return { valid: false, reason: 'The Host reads the cards, not a player.' };
      }
      if (!player.isAlive) {
        return { valid: false, reason: 'The dead do not act at night.' };
      }
      const existing = state.night.claims[actingRole];
      if (existing && existing.playerId !== move.playerId) {
        return { valid: false, reason: 'That role has already been called for.' };
      }
      if (!isValidPassphrase(payload.passphrase)) {
        return { valid: false, reason: 'Enter your secret phrase to reveal your card.' };
      }
      return { valid: true };
    }

    case 'NIGHT_ACTION': {
      if (!actingRole) {
        return { valid: false, reason: 'It is not night.' };
      }
      const claim = state.night.claims[actingRole];
      if (!claim || claim.playerId !== move.playerId) {
        return { valid: false, reason: 'You are not the one holding this card.' };
      }
      if (claim.round !== state.roundNumber) {
        return { valid: false, reason: 'Your card is from an earlier night.' };
      }
      if (!tokenMatches(claim.token, payload.token)) {
        return { valid: false, reason: 'Your secret phrase does not match this card.' };
      }
      if (!isTargetable(state.players.find((p) => p.id === payload.targetPlayerId))) {
        return { valid: false, reason: 'Choose one player who is still in the village.' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, reason: `Unknown move type "${move.type}".` };
  }
}
