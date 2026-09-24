import type { Alignment } from './alignment.js';

export type RoleActionType =
  | 'GROUP_TARGET'
  | 'SINGLE_TARGET'
  | 'MULTI_TARGET'
  | 'SELF_ACTION'
  | 'NO_ACTION'
  | 'INVESTIGATE'
  | 'PROTECT'
  | 'KILL'
  | 'HEAL'
  | 'POISON'
  | 'CONTROL';

export interface NightAction {
  playerId: string;
  roleId: string;
  actionType: RoleActionType;
  targetPlayerId?: string;
  isHeal?: boolean;
  isPoison?: boolean;
  isSkip?: boolean;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export type InvestigationType =
  | 'ALIGNMENT_ONLY'
  | 'ROLE_ONLY'
  | 'ALIGNMENT_AND_ROLE'
  | 'CUSTOM_RESULT';

export interface InvestigationResult {
  targetPlayerId: string;
  revealedAlignment: Alignment;
  revealedRole?: string;
  notes?: string;
}
