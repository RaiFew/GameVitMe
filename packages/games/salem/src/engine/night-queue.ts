import type { SalemPlayerState, NightQueueStage, SalemSettings } from '../types/index.js';
import { SalemRoleRegistry } from '../roles/registry.js';

export function buildNightQueue(
  players: SalemPlayerState[],
  settings?: SalemSettings
): NightQueueStage[] {
  const alivePlayers = players.filter((p) => p.isAlive && p.roleId && p.canPlay !== false);
  const aliveRoleIds = new Set(alivePlayers.map((p) => p.roleId!));

  const registry = SalemRoleRegistry.getInstance();
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

  // Sort strictly by priority
  stages.sort((a, b) => a.priority - b.priority);

  return stages.map(({ priority, ...stage }) => stage);
}
