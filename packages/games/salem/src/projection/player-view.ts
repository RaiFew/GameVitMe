import type { SalemMasterState, SalemPlayerView, Alignment } from '../types/index.js';
import { SalemRoleRegistry } from '../roles/registry.js';

export function projectSalemPlayerView(
  state: SalemMasterState,
  playerId: string
): SalemPlayerView {
  const registry = SalemRoleRegistry.getInstance();
  const me = state.players.find((p) => p.id === playerId);
  const isGameOver = state.phase === 'GAME_OVER';
  const isHost = state.hostMode ? playerId === state.hostPlayerId : false;
  const canPlay = !isHost;

  const myRoleDef = me?.roleId ? registry.get(me.roleId) : undefined;
  const isWitch = me?.team === 'WITCH' || me?.roleId === 'witch';

  // Witches know each other
  const covenTeammates =
    isWitch && !isGameOver
      ? state.players
          .filter((p) => p.id !== playerId && (p.team === 'WITCH' || p.roleId === 'witch'))
          .map((p) => ({ id: p.id, displayName: p.displayName }))
      : undefined;

  const projectedPlayers = state.players.map((p) => {
    const isMe = p.id === playerId;
    const roleDef = p.roleId ? registry.get(p.roleId) : undefined;
    const isThisHost = state.hostMode && p.id === state.hostPlayerId;

    const showRole = isGameOver || (!p.isAlive && state.phase !== 'ROLE_SELECTION' && state.phase !== 'ROLE_ASSIGNMENT' && state.phase !== 'ROLE_CONFIGURATION');
    const isTeammate = isWitch && (p.team === 'WITCH' || p.roleId === 'witch');

    let revealedRoleId: string | undefined;
    let revealedRoleName: string | undefined;
    let revealedAlignment: Alignment | undefined;

    if (showRole || isMe || isTeammate) {
      revealedRoleId = p.roleId || undefined;
      revealedRoleName = isThisHost ? 'Host Moderator' : roleDef?.name;
      revealedAlignment = isThisHost ? 'NEUTRAL' : (roleDef?.alignment || p.alignment);
    }

    const isPhysicalAssignment = state.phase === 'ROLE_ASSIGNMENT';
    const roleConfirmed = isPhysicalAssignment
      ? (isMe ? p.roleConfirmed : undefined)
      : p.roleConfirmed;
    const hasSelectedRole = isPhysicalAssignment
      ? (isMe ? !!p.roleId : false)
      : (isThisHost ? true : !!p.roleId);

    return {
      id: p.id,
      seatNumber: p.seatNumber,
      displayName: p.displayName,
      isAlive: p.isAlive,
      isConnected: p.isConnected,
      hasSelectedRole,
      roleConfirmed,
      roleRevealedReady: p.roleRevealedReady,
      isHost: isThisHost,
      canPlay: !isThisHost,
      revealedRoleId,
      revealedRoleName,
      revealedAlignment,
      hasVoted: state.phase === 'DAY_VOTING' ? !!state.day.votes[p.id] : undefined,
      votedForId: isGameOver || state.phase === 'DAY_EXECUTION' ? state.day.votes[p.id] : undefined,
    };
  });

  // Available roles for draft
  const isSetupPhase =
    state.phase === 'ROLE_CONFIGURATION' ||
    state.phase === 'ROLE_ASSIGNMENT' ||
    state.phase === 'ROLE_SELECTION';

  const isPhysicalAssignment = state.phase === 'ROLE_ASSIGNMENT';

  let availableRoles: SalemPlayerView['availableRoles'];
  if (isSetupPhase) {
    availableRoles = registry.list().map((role) => {
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
    });
  }

  // Night phase view
  let nightView: SalemPlayerView['night'] | undefined;
  if (state.phase === 'NIGHT' && state.night.currentStage) {
    const stage = state.night.currentStage;
    const isMyTurn = !isHost && me?.roleId === stage.roleId && (me?.isAlive ?? false);

    let validTargetIds: string[] | undefined;
    let groupVotes: Record<string, string> | undefined;
    let victimToHealId: string | undefined;

    if (isMyTurn) {
      if (stage.roleId === 'witch') {
        validTargetIds = state.players
          .filter((p) => p.isAlive && p.canPlay !== false && p.team !== 'WITCH' && p.roleId !== 'witch')
          .map((p) => p.id);

        groupVotes = {};
        for (const action of state.night.actions) {
          if (action.roleId === 'witch' && action.targetPlayerId) {
            groupVotes[action.playerId] = action.targetPlayerId;
          }
        }
      } else if (stage.roleId === 'constable') {
        validTargetIds = state.players
          .filter((p) => p.isAlive && p.canPlay !== false && p.id !== me?.constableLastProtectedId)
          .map((p) => p.id);
      } else if (stage.roleId === 'town_crier') {
        validTargetIds = state.players
          .filter((p) => p.isAlive && p.canPlay !== false && p.id !== playerId)
          .map((p) => p.id);
      } else if (stage.roleId === 'doctor') {
        validTargetIds = state.players
          .filter((p) => p.isAlive && p.canPlay !== false)
          .map((p) => p.id);
      }
    }

    const myInvestigations = state.investigations[playerId] || [];
    const latestInvestigation = (isMyTurn && me?.roleId === 'town_crier' && myInvestigations.length > 0)
      ? myInvestigations[myInvestigations.length - 1]
      : null;

    nightView = {
      isMyTurn,
      currentRoleName: isMyTurn || isHost ? stage.roleName : undefined,
      currentActionType: isMyTurn ? stage.actionType : undefined,
      durationSeconds: stage.durationSeconds,
      stageEndsAt: state.night.stageEndsAt,
      allowSkip: isHost || stage.allowSkip,
      validTargetIds,
      groupVotes,
      victimToHealId,
      audioToPlay: isMyTurn || isHost ? stage.audioWake : undefined,
      latestInvestigation,
    };
  }

  // Day phase view
  let dayView: SalemPlayerView['day'] | undefined;
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

  return {
    phase: state.phase,
    roundNumber: state.roundNumber,
    hostPlayerId: state.hostPlayerId,
    hostMode: true,
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
      team: myRoleDef?.team || me?.team || 'TOWN',
      isAlive: me?.isAlive ?? true,
      hasSelectedRole: isHost ? true : !!me?.roleId,
      roleConfirmed: me?.roleConfirmed,
      roleRevealedReady: me?.roleRevealedReady,
      hasVoted: state.phase === 'DAY_VOTING' ? !!state.day.votes[playerId] : undefined,
      votedForId: state.day.votes[playerId],
      doctorUsedHeal: me?.doctorUsedHeal,
      doctorUsedPoison: me?.doctorUsedPoison,
      covenTeammates,
      investigations: state.investigations[playerId] || [],
    },
    players: projectedPlayers,
    availableRoles,
    night: nightView,
    day: dayView,
    gameOverData: state.gameOverData,
  };
}
