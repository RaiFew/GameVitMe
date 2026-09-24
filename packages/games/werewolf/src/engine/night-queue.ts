import type { WerewolfPlayerState, NightQueueStage, WerewolfSettings } from '../types/index.js';
import { RoleRegistry } from '../roles/registry.js';

/**
 * Builds the dynamic Night Queue containing only roles that have at least
 * one alive player in the game, sorted by priority.
 */
export function buildNightQueue(
  players: WerewolfPlayerState[],
  settings?: WerewolfSettings
): NightQueueStage[] {
  const alivePlayers = players.filter((p) => p.isAlive && p.roleId && p.canPlay !== false);
  const aliveRoleIds = new Set(alivePlayers.map((p) => p.roleId!));

  const registry = RoleRegistry.getInstance();
  const stages: (NightQueueStage & { priority: number })[] = [];

  for (const roleId of aliveRoleIds) {
    const roleDef = registry.get(roleId);
    if (!roleDef || !roleDef.nightConfig) continue;

    const customDuration = settings?.roleTimers?.[roleId];
    const duration =
      typeof customDuration === 'number' && customDuration >= 0
        ? customDuration
        : roleDef.nightConfig.durationSeconds;

    stages.push({
      roleId: roleDef.id,
      roleName: roleDef.name,
      durationSeconds: duration,
      actionType: roleDef.nightConfig.actionType,
      actionMode: roleDef.nightConfig.actionMode,
      allowSkip: roleDef.nightConfig.allowSkip,
      audioWake: roleDef.audio?.wake,
      audioAction: roleDef.audio?.action,
      audioSleep: roleDef.audio?.sleep,
      priority: roleDef.nightConfig.priority,
    });
  }

  // Sort strictly by priority (lower number executes earlier)
  stages.sort((a, b) => a.priority - b.priority);

  return stages.map(({ priority, ...stage }) => stage);
}
