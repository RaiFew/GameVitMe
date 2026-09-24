import type { SalemPlayerState } from '../types/state.js';
import { SalemRoleRegistry } from '../roles/registry.js';

export function getDefaultSalemRoleCounts(playerCount: number): Record<string, number> {
  const counts: Record<string, number> = {};

  if (playerCount <= 4) {
    counts['witch'] = 1;
    counts['town_crier'] = 1;
    counts['puritan'] = playerCount - 2;
  } else if (playerCount <= 5) {
    counts['witch'] = 1;
    counts['town_crier'] = 1;
    counts['doctor'] = 1;
    counts['puritan'] = playerCount - 3;
  } else if (playerCount <= 6) {
    counts['witch'] = 2;
    counts['town_crier'] = 1;
    counts['doctor'] = 1;
    counts['puritan'] = playerCount - 4;
  } else if (playerCount <= 7) {
    counts['witch'] = 2;
    counts['town_crier'] = 1;
    counts['doctor'] = 1;
    counts['constable'] = 1;
    counts['puritan'] = playerCount - 5;
  } else {
    counts['witch'] = Math.min(3, Math.floor(playerCount / 3));
    counts['town_crier'] = 1;
    counts['doctor'] = 1;
    counts['constable'] = 1;
    const specialCount = counts['witch'] + 3;
    counts['puritan'] = Math.max(1, playerCount - specialCount);
  }

  return counts;
}

export function validateSalemRoleCounts(
  counts: Record<string, number>,
  playerCount: number
): { valid: boolean; reason?: string } {
  const registry = SalemRoleRegistry.getInstance();
  let totalCount = 0;
  let witchCount = 0;

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

    if (roleDef.category === 'WITCH' || roleDef.team === 'WITCH') {
      witchCount += count;
    }
    totalCount += count;
  }

  if (totalCount !== playerCount) {
    return {
      valid: false,
      reason: `Configured roles total (${totalCount}) does not match playing player count (${playerCount}).`,
    };
  }

  if (witchCount < 1) {
    return {
      valid: false,
      reason: 'At least one Witch role is required in Salem.',
    };
  }

  return { valid: true };
}

export function assignRandomSalemRoles(
  players: SalemPlayerState[],
  roleCounts: Record<string, number>
): SalemPlayerState[] {
  const registry = SalemRoleRegistry.getInstance();
  const pool: string[] = [];

  for (const [roleId, count] of Object.entries(roleCounts)) {
    for (let i = 0; i < count; i++) {
      pool.push(roleId);
    }
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  let poolIdx = 0;
  return players.map((player) => {
    if (player.canPlay === false || player.isHost) {
      return player;
    }
    const roleId = pool[poolIdx++] || 'puritan';
    const roleDef = registry.get(roleId);

    return {
      ...player,
      roleId,
      alignment: roleDef?.alignment || 'GOOD',
      team: roleDef?.team || 'TOWN',
      roleConfirmed: true,
      roleRevealedReady: false,
    };
  });
}
