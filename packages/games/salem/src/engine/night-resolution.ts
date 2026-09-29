import type { SalemNightResult } from '../types/index.js';

export interface NightResolution {
  result: SalemNightResult;
  deadPlayerIds: string[];
}

/**
 * At most one player can die per night. A null witch target means the Witch
 * never acted (the Host moved on), which is a night with no kill rather than
 * an error.
 */
export function resolveNight(
  witchTargetPlayerId: string | null,
  constableProtectionPlayerId: string | null
): NightResolution {
  if (witchTargetPlayerId === null) {
    return { result: null, deadPlayerIds: [] };
  }
  if (witchTargetPlayerId === constableProtectionPlayerId) {
    return { result: 'NO_DEATH', deadPlayerIds: [] };
  }
  return { result: 'WITCH_TARGET_DIES', deadPlayerIds: [witchTargetPlayerId] };
}
