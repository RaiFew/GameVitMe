import type { Alignment, Team } from './alignment.js';
import type { RoleActionType, InvestigationType } from './action.js';

export interface NightActionConfig {
  actionType: RoleActionType;
  actionMode: 'GROUP' | 'INDIVIDUAL';
  priority: number;
  durationSeconds: number;
  allowSkip: boolean;
  requiresTarget: boolean;
  canTargetSelf: boolean;
}

export type RoleCategory = 'TOWN' | 'WITCH' | 'NEUTRAL' | 'ADDITIONAL';

export interface RoleDefinition {
  id: string;
  name: string;
  category: RoleCategory;
  alignment: Alignment;
  team: Team;
  description: string;
  flavorText?: string;
  minCount: number;
  maxCount: number;
  nightConfig?: NightActionConfig;
  audio?: {
    wake?: string;
    action?: string;
    sleep?: string;
  };
  investigationResult?: {
    type: InvestigationType;
    revealedAlignment: Alignment;
    revealedRole?: string;
  };
}
