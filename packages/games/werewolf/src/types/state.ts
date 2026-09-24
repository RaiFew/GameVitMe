import type { Alignment, Team } from './alignment.js';
import type { NightAction, InvestigationResult } from './action.js';
import type { RoleCategory } from './role.js';

export const WerewolfPhase = {
  ROLE_CONFIGURATION: 'ROLE_CONFIGURATION',
  ROLE_ASSIGNMENT: 'ROLE_ASSIGNMENT',
  ROLE_SELECTION: 'ROLE_SELECTION',
  ROLE_REVEAL: 'ROLE_REVEAL',
  NIGHT: 'NIGHT',
  DAY_ANNOUNCEMENT: 'DAY_ANNOUNCEMENT',
  DAY_DISCUSSION: 'DAY_DISCUSSION',
  DAY_VOTING: 'DAY_VOTING',
  DAY_EXECUTION: 'DAY_EXECUTION',
  GAME_OVER: 'GAME_OVER',
} as const;

export type WerewolfPhase = (typeof WerewolfPhase)[keyof typeof WerewolfPhase];

export type RoleAssignmentMode = 'PHYSICAL' | 'RANDOM';

export interface WerewolfPlayerState {
  id: string;
  seatNumber: number;
  displayName: string;
  isConnected: boolean;
  roleId: string | null;
  alignment: Alignment;
  team: Team;
  isAlive: boolean;
  isHost?: boolean;
  canPlay?: boolean;
  roleConfirmed?: boolean;
  roleRevealedReady?: boolean;
  deathRound?: number;
  deathReason?: string;
  witchUsedHeal?: boolean;
  witchUsedPoison?: boolean;
  defenderLastProtectedId?: string;
}

export interface NightQueueStage {
  roleId: string;
  roleName: string;
  durationSeconds: number;
  actionType: string;
  actionMode: 'GROUP' | 'INDIVIDUAL';
  allowSkip: boolean;
  audioWake?: string;
  audioAction?: string;
  audioSleep?: string;
}

export interface WerewolfMasterState {
  phase: WerewolfPhase;
  roundNumber: number;
  hostPlayerId?: string;
  hostMode?: boolean;
  roleAssignmentMode: RoleAssignmentMode;
  roleCounts: Record<string, number>;
  players: WerewolfPlayerState[];
  availableRoles: Record<string, { minCount: number; maxCount: number; currentCount: number }>;
  allRolesSelected: boolean;
  allRolesConfirmed: boolean;
  allRolesReady: boolean;
  night: {
    queue: NightQueueStage[];
    currentStageIndex: number;
    currentStage: NightQueueStage | null;
    stageStartedAt: number;
    stageEndsAt: number;
    actions: NightAction[];
    lastResolution: {
      eliminatedPlayerIds: string[];
      savedPlayerIds: string[];
    } | null;
  };
  day: {
    votes: Record<string, string>;
    eliminatedPlayerId: string | null;
    isTie: boolean;
  };
  investigations: Record<string, InvestigationResult[]>;
  gameOverData: {
    winner: 'VILLAGE' | 'WEREWOLF' | 'NEUTRAL';
    reason: string;
    roles: Record<string, { roleId: string; roleName: string; alignment: Alignment; isAlive: boolean }>;
    nightsSurvived: number;
  } | null;
}

export interface WerewolfPlayerView {
  phase: WerewolfPhase;
  roundNumber: number;
  hostPlayerId?: string;
  hostMode?: boolean;
  isHost: boolean;
  canPlay: boolean;
  roleAssignmentMode: RoleAssignmentMode;
  roleCounts: Record<string, number>;
  allRolesSelected: boolean;
  allRolesConfirmed: boolean;
  allRolesReady: boolean;
  me: {
    id: string;
    displayName: string;
    roleId: string | null;
    roleName: string | null;
    category?: RoleCategory;
    alignment: Alignment;
    team: Team;
    isAlive: boolean;
    hasSelectedRole: boolean;
    roleConfirmed?: boolean;
    roleRevealedReady?: boolean;
    hasVoted?: boolean;
    votedForId?: string;
    witchUsedHeal?: boolean;
    witchUsedPoison?: boolean;
    teammates?: { id: string; displayName: string }[];
    investigations?: InvestigationResult[];
  };
  players: {
    id: string;
    seatNumber: number;
    displayName: string;
    isAlive: boolean;
    isConnected: boolean;
    hasSelectedRole: boolean;
    roleConfirmed?: boolean;
    roleRevealedReady?: boolean;
    isHost?: boolean;
    canPlay?: boolean;
    revealedRoleId?: string;
    revealedRoleName?: string;
    revealedAlignment?: Alignment;
    hasVoted?: boolean;
    votedForId?: string;
    voteCount?: number;
  }[];
  availableRoles?: {
    id: string;
    name: string;
    category: RoleCategory;
    alignment: Alignment;
    description: string;
    totalSlots: number;
    takenSlots: number;
    isAvailable: boolean;
  }[];
  night?: {
    isMyTurn: boolean;
    currentRoleName?: string;
    currentActionType?: string;
    durationSeconds: number;
    stageEndsAt: number;
    allowSkip: boolean;
    validTargetIds?: string[];
    groupVotes?: Record<string, string>;
    victimToHealId?: string;
    latestInvestigation?: InvestigationResult | null;
    audioToPlay?: string;
  };
  day?: {
    eliminatedPlayerNames?: string[];
    isDiscussionActive?: boolean;
    isVotingActive?: boolean;
    votes?: Record<string, string>;
    eliminatedThisDay?: { id: string; displayName: string; roleName?: string } | null;
    isTie?: boolean;
  };
  gameOverData?: WerewolfMasterState['gameOverData'];
}

export interface WerewolfSettings {
  minPlayers?: number;
  maxPlayers?: number;
  roleCounts?: Record<string, number>;
  roleTimers?: Record<string, number>;
  witchAlignment?: Alignment;
  tieResolution?: 'NO_KILL' | 'REVOTE';
  audioMode?: 'PRIVATE' | 'GLOBAL' | 'MUTED';
}
