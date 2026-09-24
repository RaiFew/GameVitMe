import type { WerewolfPlayerState, RoleAssignmentMode } from '../types/state.js';
import { RoleRegistry } from '../roles/registry.js';

/**
 * Returns sensible default role counts for a given playing player count.
 */
export function getDefaultRoleCounts(playerCount: number): Record<string, number> {
  const counts: Record<string, number> = {};

  if (playerCount <= 4) {
    counts['werewolf'] = 1;
    counts['seer'] = 1;
    counts['villager'] = playerCount - 2;
  } else if (playerCount <= 5) {
    counts['werewolf'] = 1;
    counts['seer'] = 1;
    counts['witch'] = 1;
    counts['villager'] = playerCount - 3;
  } else if (playerCount <= 6) {
    counts['werewolf'] = 2;
    counts['seer'] = 1;
    counts['witch'] = 1;
    counts['villager'] = playerCount - 4;
  } else if (playerCount <= 7) {
    counts['werewolf'] = 2;
    counts['seer'] = 1;
    counts['witch'] = 1;
    counts['defender'] = 1;
    counts['villager'] = playerCount - 5;
  } else {
    // 8+ players
    counts['werewolf'] = Math.min(3, Math.floor(playerCount / 3));
    counts['seer'] = 1;
    counts['witch'] = 1;
    counts['defender'] = 1;
    counts['doctor'] = 1;
    const specialCount = counts['werewolf'] + 4;
    counts['villager'] = Math.max(1, playerCount - specialCount);
  }

  return counts;
}

/**
 * Validates that roleCounts match the total number of playing players.
 */
export function validateRoleCounts(
  counts: Record<string, number>,
  playerCount: number
): { valid: boolean; reason?: string } {
  const registry = RoleRegistry.getInstance();
  let totalCount = 0;
  let werewolfTeamCount = 0;

  for (const [roleId, count] of Object.entries(counts)) {
    if (count < 0) {
      return { valid: false, reason: `Role count cannot be negative: ${roleId}` };
    }
    if (count === 0) continue;

    const roleDef = registry.get(roleId);
    if (!roleDef) {
      return { valid: false, reason: `Unknown role: ${roleId}` };
    }

    if (count > roleDef.maxCount) {
      return {
        valid: false,
        reason: `Role ${roleDef.name} exceeds max allowed count (${roleDef.maxCount}).`,
      };
    }

    if (roleDef.category === 'WEREWOLF' || roleDef.team === 'WEREWOLF') {
      werewolfTeamCount += count;
    }
    totalCount += count;
  }

  if (totalCount !== playerCount) {
    return {
      valid: false,
      reason: `Configured roles total (${totalCount}) does not match playing player count (${playerCount}).`,
    };
  }

  if (werewolfTeamCount < 1) {
    return {
      valid: false,
      reason: 'At least one Werewolf or Werewolf-aligned role is required.',
    };
  }

  return { valid: true };
}

/**
 * Assigns roles randomly via Fisher-Yates shuffle.
 */
export function assignRandomRoles(
  players: WerewolfPlayerState[],
  roleCounts: Record<string, number>
): WerewolfPlayerState[] {
  const registry = RoleRegistry.getInstance();
  const pool: string[] = [];

  for (const [roleId, count] of Object.entries(roleCounts)) {
    for (let i = 0; i < count; i++) {
      pool.push(roleId);
    }
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  let poolIdx = 0;
  return players.map((player) => {
    if (player.canPlay === false || player.isHost) {
      return player;
    }
    const roleId = pool[poolIdx++] || 'villager';
    const roleDef = registry.get(roleId);

    return {
      ...player,
      roleId,
      alignment: roleDef?.alignment || 'GOOD',
      team: roleDef?.team || 'VILLAGE',
      roleConfirmed: true,
      roleRevealedReady: false,
    };
  });
}
