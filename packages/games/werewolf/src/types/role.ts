import type { Alignment, Team } from './alignment.js';

export type NightActionMode = 'GROUP' | 'INDIVIDUAL';

export type NightActionType =
  | 'KILL'
  | 'PROTECT'
  | 'INVESTIGATE'
  | 'HEAL_POISON'
  | 'GUARD'
  | 'NONE';

export interface RoleAudioConfig {
  wake?: string;
  action?: string;
  sleep?: string;
}

export interface NightRoleConfig {
  priority: number;
  durationSeconds: number;
  actionMode: NightActionMode;
  actionType: NightActionType;
  allowSkip: boolean;
}

export type RoleCategory = 'VILLAGER' | 'WEREWOLF' | 'NEUTRAL' | 'ADDITIONAL';

export interface RoleDefinition {
  id: string;
  name: string;
  category: RoleCategory;
  alignment: Alignment;
  team: Team;
  minCount: number;
  maxCount: number;
  description: string;
  icon?: string;
  nightConfig?: NightRoleConfig;
  audio?: RoleAudioConfig;
  investigationResult?: {
    revealedAlignment: Alignment;
    revealedRole?: string;
  };
}
