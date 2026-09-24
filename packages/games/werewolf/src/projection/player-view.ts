import type {
  WerewolfMasterState,
  WerewolfPlayerView,
  Alignment,
} from '../types/index.js';
import { RoleRegistry } from '../roles/registry.js';

export function projectWerewolfPlayerView(
  state: WerewolfMasterState,
  playerId: string
): WerewolfPlayerView {
  const registry = RoleRegistry.getInstance();
  const me = state.players.find((p) => p.id === playerId);
  const isGameOver = state.phase === 'GAME_OVER';

  const myRoleDef = me?.roleId ? registry.get(me.roleId) : undefined;
  const isWerewolf = me?.team === 'WEREWOLF' || me?.roleId === 'werewolf';

  // Teammates for werewolves
  const teammates =
    isWerewolf && !isGameOver
      ? state.players
          .filter((p) => p.id !== playerId && (p.team === 'WEREWOLF' || p.roleId === 'werewolf'))
          .map((p) => ({ id: p.id, displayName: p.displayName }))
      : undefined;

  // Project players list with strict role privacy
  const projectedPlayers = state.players.map((p) => {
    const isMe = p.id === playerId;
    const roleDef = p.roleId ? registry.get(p.roleId) : undefined;

    // Revealed role if dead or game over
    const showRole = isGameOver || (!p.isAlive && state.phase !== 'ROLE_SELECTION' && state.phase !== 'ROLE_ASSIGNMENT' && state.phase !== 'ROLE_CONFIGURATION');
    // Werewolves know each other
    const isTeammate = isWerewolf && (p.team === 'WEREWOLF' || p.roleId === 'werewolf');

    let revealedRoleId: string | undefined;
    let revealedRoleName: string | undefined;
    let revealedAlignment: Alignment | undefined;

    if (showRole || isMe || isTeammate) {
      revealedRoleId = p.roleId || undefined;
      revealedRoleName = roleDef?.name;
      revealedAlignment = roleDef?.alignment || p.alignment;
    }

    const isPhysicalAssignment = state.phase === 'ROLE_ASSIGNMENT';
    const roleConfirmed = isPhysicalAssignment
      ? (isMe ? p.roleConfirmed : undefined)
      : p.roleConfirmed;
    const hasSelectedRole = isPhysicalAssignment
      ? (isMe ? !!p.roleId : false)
      : !!p.roleId;

    return {
      id: p.id,
      seatNumber: p.seatNumber,
      displayName: p.displayName,
      isAlive: p.isAlive,
      isConnected: p.isConnected,
      hasSelectedRole,
      roleConfirmed,
      roleRevealedReady: p.roleRevealedReady,
      isHost: p.isHost,
      canPlay: p.canPlay,
      revealedRoleId,
      revealedRoleName,
      revealedAlignment,
      hasVoted: state.phase === 'DAY_VOTING' ? !!state.day.votes[p.id] : undefined,
      votedForId: isGameOver || state.phase === 'DAY_EXECUTION' ? state.day.votes[p.id] : undefined,
    };
  });

  // Available roles for configuration and physical selection
  const isSetupPhase =
    state.phase === 'ROLE_CONFIGURATION' ||
    state.phase === 'ROLE_ASSIGNMENT' ||
    state.phase === 'ROLE_SELECTION';

  const isPhysicalAssignment = state.phase === 'ROLE_ASSIGNMENT';

  const availableRoles = isSetupPhase
    ? registry.list().map((role) => {
        const configuredSlots = state.roleCounts?.[role.id] ?? state.availableRoles?.[role.id]?.maxCount ?? 0;
        const takenSlots = state.players.filter((p) => p.roleId === role.id).length;
        return {
          id: role.id,
          name: role.name,
          category: role.category,
          alignment: role.alignment,
          description: role.description,
          totalSlots: configuredSlots,
          takenSlots: isPhysicalAssignment ? 0 : takenSlots,
          isAvailable: isPhysicalAssignment ? configuredSlots > 0 : takenSlots < configuredSlots,
        };
      })
    : undefined;

  // Night phase projection
  let nightView: WerewolfPlayerView['night'] | undefined;
  if (state.phase === 'NIGHT' && state.night.currentStage) {
    const stage = state.night.currentStage;
    const isMyTurn = !!(me && me.isAlive && me.roleId === stage.roleId);

    let validTargetIds: string[] | undefined;
    let groupVotes: Record<string, string> | undefined;
    let victimToHealId: string | undefined;

    if (isMyTurn) {
      const livingPlayers = state.players.filter((p) => p.isAlive);

      if (stage.actionType === 'KILL') {
        validTargetIds = livingPlayers
          .filter((p) => p.team !== 'WEREWOLF' && p.roleId !== 'werewolf')
          .map((p) => p.id);
        if (validTargetIds.length === 0) {
          validTargetIds = livingPlayers.filter((p) => p.id !== playerId).map((p) => p.id);
        }

        groupVotes = {};
        for (const act of state.night.actions) {
          if (act.roleId === 'werewolf' && act.targetPlayerId) {
            groupVotes[act.playerId] = act.targetPlayerId;
          }
        }
      } else if (stage.actionType === 'PROTECT') {
        validTargetIds = livingPlayers
          .filter((p) => p.id !== me.defenderLastProtectedId)
          .map((p) => p.id);
      } else if (stage.actionType === 'GUARD') {
        validTargetIds = livingPlayers.filter((p) => p.id !== playerId).map((p) => p.id);
      } else if (stage.actionType === 'INVESTIGATE') {
        validTargetIds = livingPlayers.filter((p) => p.id !== playerId).map((p) => p.id);
      } else if (stage.actionType === 'HEAL_POISON') {
        validTargetIds = livingPlayers.map((p) => p.id);
        const wolfActs = state.night.actions.filter((a) => a.roleId === 'werewolf' && a.targetPlayerId);
        if (wolfActs.length > 0 && !me.witchUsedHeal) {
          victimToHealId = wolfActs[wolfActs.length - 1]?.targetPlayerId;
        }
      }
    }

    const myInvestigations = state.investigations[playerId] || [];
    const latestInvestigation = myInvestigations.length > 0 ? myInvestigations[myInvestigations.length - 1] : null;

    nightView = {
      isMyTurn,
      currentRoleName: isMyTurn ? stage.roleName : undefined,
      currentActionType: isMyTurn ? stage.actionType : undefined,
      durationSeconds: stage.durationSeconds,
      stageEndsAt: state.night.stageEndsAt,
      allowSkip: stage.allowSkip,
      validTargetIds,
      groupVotes,
      victimToHealId,
      latestInvestigation,
      audioToPlay: isMyTurn ? stage.audioWake : undefined,
    };
  }

  // Day phase projection
  let dayView: WerewolfPlayerView['day'] | undefined;
  if (
    state.phase === 'DAY_ANNOUNCEMENT' ||
    state.phase === 'DAY_DISCUSSION' ||
    state.phase === 'DAY_VOTING' ||
    state.phase === 'DAY_EXECUTION'
  ) {
    const eliminatedNames = (state.night.lastResolution?.eliminatedPlayerIds || [])
      .map((id) => state.players.find((p) => p.id === id)?.displayName)
      .filter(Boolean) as string[];

    const eliminatedThisDay = state.day.eliminatedPlayerId
      ? (() => {
          const ep = state.players.find((p) => p.id === state.day.eliminatedPlayerId);
          const r = ep?.roleId ? registry.get(ep.roleId) : undefined;
          return ep ? { id: ep.id, displayName: ep.displayName, roleName: r?.name } : null;
        })()
      : null;

    dayView = {
      eliminatedPlayerNames: eliminatedNames,
      isDiscussionActive: state.phase === 'DAY_DISCUSSION',
      isVotingActive: state.phase === 'DAY_VOTING',
      votes: state.phase === 'DAY_EXECUTION' || isGameOver ? state.day.votes : undefined,
      eliminatedThisDay,
      isTie: state.day.isTie,
    };
  }

  const isHost = state.hostMode ? playerId === state.hostPlayerId : false;
  const canPlay = !isHost;

  return {
    phase: state.phase,
    roundNumber: state.roundNumber,
    hostPlayerId: state.hostPlayerId,
    hostMode: state.hostMode,
    isHost,
    canPlay,
    roleAssignmentMode: state.roleAssignmentMode,
    roleCounts: state.roleCounts,
    allRolesSelected: state.allRolesSelected,
    allRolesConfirmed: state.allRolesConfirmed,
    allRolesReady: state.allRolesReady,
    me: {
      id: playerId,
      displayName: me?.displayName || 'Unknown',
      roleId: isHost ? 'host' : (me?.roleId || null),
      roleName: isHost ? 'Host Moderator' : (myRoleDef?.name || null),
      category: myRoleDef?.category,
      alignment: isHost ? 'NEUTRAL' : (myRoleDef?.alignment || me?.alignment || 'GOOD'),
      team: myRoleDef?.team || me?.team || 'VILLAGE',
      isAlive: me?.isAlive ?? true,
      hasSelectedRole: isHost ? true : !!me?.roleId,
      roleConfirmed: me?.roleConfirmed,
      roleRevealedReady: me?.roleRevealedReady,
      hasVoted: state.phase === 'DAY_VOTING' ? !!state.day.votes[playerId] : undefined,
      votedForId: state.day.votes[playerId],
      witchUsedHeal: me?.witchUsedHeal,
      witchUsedPoison: me?.witchUsedPoison,
      teammates,
      investigations: state.investigations[playerId] || [],
    },
    players: projectedPlayers,
    availableRoles,
    night: nightView,
    day: dayView,
    gameOverData: state.gameOverData,
  };
}
