import type { SalemPlayerState, NightAction } from '../types/index.js';

export interface NightResolutionResult {
  eliminatedPlayerIds: string[];
  savedPlayerIds: string[];
  investigationResults: Record<string, { targetPlayerId: string; revealedAlignment: string }>;
}

export function resolveNightActions(
  players: SalemPlayerState[],
  actions: NightAction[]
): NightResolutionResult {
  const eliminatedPlayerIds: string[] = [];
  const savedPlayerIds: string[] = [];
  const investigationResults: Record<string, { targetPlayerId: string; revealedAlignment: string }> = {};

  // 1. Tally Witch Coven kill target (Majority target)
  const witchActions = actions.filter((a) => a.roleId === 'witch' && a.targetPlayerId);
  const witchTargetCounts = new Map<string, number>();
  for (const a of witchActions) {
    if (a.targetPlayerId) {
      witchTargetCounts.set(a.targetPlayerId, (witchTargetCounts.get(a.targetPlayerId) || 0) + 1);
    }
  }

  let witchVictimId: string | null = null;
  let maxWitchVotes = 0;
  let hasTie = false;
  for (const [targetId, count] of witchTargetCounts.entries()) {
    if (count > maxWitchVotes) {
      witchVictimId = targetId;
      maxWitchVotes = count;
      hasTie = false;
    } else if (count === maxWitchVotes) {
      hasTie = true;
    }
  }
  if (hasTie) witchVictimId = null;

  // 2. Constable Protection
  const constableAction = actions.find((a) => a.roleId === 'constable' && a.actionType === 'PROTECT');
  const protectedId = constableAction?.targetPlayerId;

  // 3. Doctor Heal and Poison
  const doctorHeal = actions.find((a) => a.roleId === 'doctor' && a.metadata?.doctorAction === 'HEAL');
  const doctorPoison = actions.find((a) => a.roleId === 'doctor' && a.metadata?.doctorAction === 'POISON');
  const healedId = doctorHeal?.targetPlayerId;
  const poisonedId = doctorPoison?.targetPlayerId;

  // 4. Resolve Witch Curse
  if (witchVictimId) {
    const isProtected = protectedId === witchVictimId;
    const isHealed = healedId === witchVictimId;

    if (isProtected || isHealed) {
      savedPlayerIds.push(witchVictimId);
    } else {
      eliminatedPlayerIds.push(witchVictimId);
    }
  }

  // 5. Resolve Doctor Hemlock Poison
  if (poisonedId && !eliminatedPlayerIds.includes(poisonedId)) {
    const target = players.find((p) => p.id === poisonedId);
    if (target && target.isAlive) {
      eliminatedPlayerIds.push(poisonedId);
    }
  }

  // 6. Town Crier Investigation
  const townCrierAction = actions.find((a) => a.roleId === 'town_crier' && a.actionType === 'INVESTIGATE');
  if (townCrierAction && townCrierAction.targetPlayerId) {
    const target = players.find((p) => p.id === townCrierAction.targetPlayerId);
    if (target) {
      const isWitch = target.team === 'WITCH' || target.roleId === 'witch';
      investigationResults[townCrierAction.playerId] = {
        targetPlayerId: target.id,
        revealedAlignment: isWitch ? 'EVIL' : 'GOOD',
      };
    }
  }

  return {
    eliminatedPlayerIds,
    savedPlayerIds,
    investigationResults,
  };
}
