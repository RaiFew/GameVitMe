import type { Alignment } from './alignment.js';

export interface NightAction {
  playerId: string;
  roleId: string;
  actionType: string;
  targetPlayerId?: string;
  secondaryTargetPlayerId?: string;
  isHeal?: boolean;
  isPoison?: boolean;
  isSkip?: boolean;
  timestamp: number;
}

export interface InvestigationResult {
  targetPlayerId: string;
  targetDisplayName: string;
  revealedAlignment: Alignment;
  revealedRole?: string;
}

export interface NightResolutionSummary {
  eliminatedPlayerIds: string[];
  savedPlayerIds: string[];
  investigations: Record<string, InvestigationResult>;
}
