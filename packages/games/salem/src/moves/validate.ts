import type { GameMove } from '@party/game-engine';
import type { SalemMasterState } from '../types/index.js';
import { SalemRoleRegistry } from '../roles/registry.js';
import { validateSalemRoleCounts } from '../engine/role-assignment.js';

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

  switch (move.type) {
    case 'UPDATE_ROLE_CONFIG': {
      if (state.phase !== 'ROLE_CONFIGURATION') {
        return { valid: false, reason: 'Role configuration can only be changed before setup starts.' };
      }
      if (!isHost) {
        return { valid: false, reason: 'Only the Host Moderator can configure roles.' };
      }
      return { valid: true };
    }

    case 'START_ROLE_SETUP': {
      if (state.phase !== 'ROLE_CONFIGURATION') {
        return { valid: false, reason: 'Role setup has already been started.' };
      }
      if (!isHost) {
        return { valid: false, reason: 'Only the Host Moderator can start role setup.' };
      }
      const playingPlayers = state.players.filter((p) => p.canPlay !== false && !p.isHost);
      const val = validateSalemRoleCounts(state.roleCounts, playingPlayers.length);
      if (!val.valid) {
        return { valid: false, reason: val.reason };
      }
      return { valid: true };
    }

    case 'SELECT_ROLE': {
      if (state.phase !== 'ROLE_ASSIGNMENT' && state.phase !== 'ROLE_SELECTION') {
        return { valid: false, reason: 'Role selection is not active.' };
      }
      if (player.isHost || player.canPlay === false) {
        return { valid: false, reason: 'The Host acts as moderator and does not select a player role.' };
      }
      const roleId = payload.roleId;
      if (!roleId) return { valid: false, reason: 'Role ID required.' };

      const roleDef = SalemRoleRegistry.getInstance().get(roleId);
      if (!roleDef) return { valid: false, reason: `Unknown role "${roleId}".` };

      const configuredCount = state.roleCounts?.[roleId] || state.availableRoles?.[roleId]?.maxCount || 0;
      if (configuredCount <= 0) {
        return { valid: false, reason: 'This role selection cannot be accepted. Please choose another role.' };
      }

      const isCurrentRole = player.roleId === roleId;
      const currentlyTaken = state.players.filter(
        (p) => p.id !== player.id && p.roleId === roleId
      ).length;

      if (!isCurrentRole && currentlyTaken >= configuredCount) {
        return { valid: false, reason: 'This role selection cannot be accepted. Please choose another role.' };
      }
      return { valid: true };
    }

    case 'START_GAME': {
      if (state.phase !== 'ROLE_ASSIGNMENT') {
        return { valid: false, reason: 'Game can only be started during role assignment.' };
      }
      if (!isHost) {
        return { valid: false, reason: 'Only the Host can start the game.' };
      }
      const playingPlayers = state.players.filter((p) => p.canPlay !== false && !p.isHost);
      const allConfirmed = playingPlayers.every((p) => p.roleConfirmed && !!p.roleId);
      if (!allConfirmed) {
        return { valid: false, reason: 'Not all role assignments are complete.' };
      }
      return { valid: true };
    }

    case 'CONFIRM_ROLE': {
      if (state.phase !== 'ROLE_ASSIGNMENT') {
        return { valid: false, reason: 'Not in role assignment phase.' };
      }
      if (player.isHost || player.canPlay === false) {
        return { valid: false, reason: 'The Host does not confirm a citizen role.' };
      }
      if (!player.roleId) {
        return { valid: false, reason: 'You must select a role before confirming.' };
      }
      return { valid: true };
    }

    case 'ACKNOWLEDGE_ROLE': {
      if (state.phase !== 'ROLE_REVEAL') {
        return { valid: false, reason: 'Not in role reveal phase.' };
      }
      return { valid: true };
    }

    case 'START_NIGHT_1': {
      if (state.phase !== 'ROLE_REVEAL') {
        return { valid: false, reason: 'Not in role reveal phase.' };
      }
      if (!isHost) {
        return { valid: false, reason: 'Only the Host Moderator can start Night 1.' };
      }
      return { valid: true };
    }

    case 'CONFIRM_START': {
      if (
        state.phase !== 'ROLE_SELECTION' &&
        state.phase !== 'ROLE_CONFIGURATION' &&
        state.phase !== 'ROLE_REVEAL'
      ) {
        return { valid: false, reason: 'Game is already in progress.' };
      }
      if (state.hostPlayerId && move.playerId !== state.hostPlayerId) {
        return { valid: false, reason: 'Only the Host Moderator can start the game.' };
      }
      const unselected = state.players.filter((p) => p.canPlay !== false && !p.isHost && !p.roleId);
      if (state.phase === 'ROLE_SELECTION' && unselected.length > 0) {
        return {
          valid: false,
          reason: `Waiting for ${unselected.length} citizen(s) to choose their role.`,
        };
      }
      return { valid: true };
    }

    case 'NIGHT_ACTION': {
      if (state.phase !== 'NIGHT' || !state.night.currentStage) {
        return { valid: false, reason: 'Night action is not active.' };
      }
      if (!player.isAlive) {
        return { valid: false, reason: 'Dead players cannot act at night.' };
      }
      if (player.roleId !== state.night.currentStage.roleId) {
        return { valid: false, reason: 'It is not your turn to act.' };
      }
      return { valid: true };
    }

    case 'NIGHT_SKIP': {
      if (state.phase !== 'NIGHT' || !state.night.currentStage) {
        return { valid: false, reason: 'Night action is not active.' };
      }
      const isCurrentRole = player.roleId === state.night.currentStage.roleId;
      if (!isHost && !isCurrentRole) {
        return { valid: false, reason: 'It is not your turn to act.' };
      }
      if (!isHost && !state.night.currentStage.allowSkip) {
        return { valid: false, reason: 'This role cannot skip their action.' };
      }
      return { valid: true };
    }

    case 'DAY_PROCEED': {
      if (state.phase !== 'DAY_ANNOUNCEMENT') {
        return { valid: false, reason: 'Not in dawn announcement phase.' };
      }
      return { valid: true };
    }

    case 'DAY_CALL_VOTE': {
      if (state.phase !== 'DAY_DISCUSSION') {
        return { valid: false, reason: 'Not in discussion phase.' };
      }
      return { valid: true };
    }

    case 'DAY_VOTE': {
      if (state.phase !== 'DAY_VOTING') {
        return { valid: false, reason: 'Voting is not currently active.' };
      }
      if (player.isHost || player.canPlay === false) {
        return { valid: false, reason: 'The Host acts as moderator and does not vote.' };
      }
      if (!player.isAlive) {
        return { valid: false, reason: 'Dead citizens cannot vote.' };
      }
      const targetId = payload.targetPlayerId;
      if (!targetId) return { valid: false, reason: 'Target player required.' };

      if (targetId !== 'SKIP') {
        const target = state.players.find((p) => p.id === targetId);
        if (!target || !target.isAlive) {
          return { valid: false, reason: 'Vote target must be a living citizen.' };
        }
      }
      return { valid: true };
    }

    case 'DAY_FINISH_VOTING': {
      if (state.phase !== 'DAY_VOTING') {
        return { valid: false, reason: 'Not in voting phase.' };
      }
      return { valid: true };
    }

    case 'DAY_PROCEED_TO_NIGHT': {
      if (state.phase !== 'DAY_EXECUTION') {
        return { valid: false, reason: 'Not in execution phase.' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, reason: `Unknown move type "${move.type}".` };
  }
}
