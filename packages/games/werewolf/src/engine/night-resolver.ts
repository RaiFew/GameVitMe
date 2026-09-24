import type { WerewolfPlayerState, NightAction, NightResolutionSummary, InvestigationResult } from '../types/index.js';
import { RoleRegistry } from '../roles/registry.js';

/**
 * Resolves all collected night actions atomically at dawn.
 * Protects players, applies kills, executes heals & poisons, and calculates seer results.
 */
export function resolveNightActions(
  players: WerewolfPlayerState[],
  actions: NightAction[]
): NightResolutionSummary {
  const registry = RoleRegistry.getInstance();
  const playerMap = new Map<string, WerewolfPlayerState>(players.map((p) => [p.id, p]));

  // 1. Werewolf Group Target (Majority vote)
  const wolfActions = actions.filter((a) => a.roleId === 'werewolf' && a.targetPlayerId && !a.isSkip);
  let werewolfVictimId: string | null = null;
  if (wolfActions.length > 0) {
    const targetVotes = new Map<string, number>();
    for (const act of wolfActions) {
      if (!act.targetPlayerId) continue;
      targetVotes.set(act.targetPlayerId, (targetVotes.get(act.targetPlayerId) || 0) + 1);
    }
    let maxVotes = 0;
    let candidates: string[] = [];
    for (const [targetId, count] of targetVotes.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        candidates = [targetId];
      } else if (count === maxVotes) {
        candidates.push(targetId);
      }
    }
    // Only kill if majority (tie = no kill)
    if (candidates.length === 1 && maxVotes > 0) {
      werewolfVictimId = candidates[0]!;
    }
  }

  // 2. Protections (Defender & Constable)
  const protectedTargetIds = new Set<string>();
  const defenderActions = actions.filter((a) => a.roleId === 'defender' && a.targetPlayerId && !a.isSkip);
  for (const act of defenderActions) {
    if (act.targetPlayerId) protectedTargetIds.add(act.targetPlayerId);
  }
  const constableActions = actions.filter((a) => a.roleId === 'constable' && a.targetPlayerId && !a.isSkip);
  for (const act of constableActions) {
    if (act.targetPlayerId) protectedTargetIds.add(act.targetPlayerId);
  }

  // 3. Witch Actions (Heal & Poison)
  let witchHealedVictimId: string | null = null;
  let witchPoisonVictimId: string | null = null;
  const witchActions = actions.filter((a) => a.roleId === 'witch' && !a.isSkip);
  for (const act of witchActions) {
    if (act.isHeal && act.targetPlayerId) {
      witchHealedVictimId = act.targetPlayerId;
    }
    if (act.isPoison && act.secondaryTargetPlayerId) {
      witchPoisonVictimId = act.secondaryTargetPlayerId;
    }
  }

  // 4. Resolve Werewolf Kill
  const eliminatedPlayerIds: string[] = [];
  const savedPlayerIds: string[] = [];

  if (werewolfVictimId) {
    const isProtected = protectedTargetIds.has(werewolfVictimId);
    const isHealed = witchHealedVictimId === werewolfVictimId;

    if (isProtected || isHealed) {
      savedPlayerIds.push(werewolfVictimId);
    } else {
      eliminatedPlayerIds.push(werewolfVictimId);
    }
  }

  // 5. Resolve Witch Poison (Protection does not stop poison)
  if (witchPoisonVictimId && !eliminatedPlayerIds.includes(witchPoisonVictimId)) {
    eliminatedPlayerIds.push(witchPoisonVictimId);
  }

  // 6. Resolve Seer Investigations
  const investigations: Record<string, InvestigationResult> = {};
  const seerActions = actions.filter((a) => a.roleId === 'seer' && a.targetPlayerId && !a.isSkip);
  for (const act of seerActions) {
    if (!act.targetPlayerId) continue;
    const target = playerMap.get(act.targetPlayerId);
    if (!target) continue;

    const targetRoleDef = target.roleId ? registry.get(target.roleId) : undefined;
    const alignment = targetRoleDef?.investigationResult?.revealedAlignment || target.alignment || 'GOOD';

    investigations[act.playerId] = {
      targetPlayerId: target.id,
      targetDisplayName: target.displayName,
      revealedAlignment: alignment,
      revealedRole: targetRoleDef?.investigationResult?.revealedRole,
    };
  }

  return {
    eliminatedPlayerIds,
    savedPlayerIds,
    investigations,
  };
}
