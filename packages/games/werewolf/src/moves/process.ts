import type { GameMove, GameContext, MoveResult } from '@party/game-engine';
import type { WerewolfMasterState, WerewolfPlayerState, NightAction, RoleAssignmentMode } from '../types/index.js';
import { RoleRegistry } from '../roles/registry.js';
import { buildNightQueue } from '../engine/night-queue.js';
import { resolveNightActions } from '../engine/night-resolver.js';
import { checkWinConditions } from '../engine/win-conditions.js';
import { tallyDayVotes } from '../engine/day-engine.js';
import { assignRandomRoles } from '../engine/role-assignment.js';

/**
 * Helper to build Night 1 queue and transition to NIGHT phase.
 */
function startNight1(state: WerewolfMasterState, ctx: GameContext): WerewolfMasterState {
  const queue = buildNightQueue(state.players);
  const firstStage = queue[0] || null;
  const now = Date.now();
  const durationMs = (firstStage?.durationSeconds || 15) * 1000;

  ctx.clearTimer();
  if (firstStage && durationMs > 0) {
    ctx.scheduleTimer(durationMs, `NIGHT_STAGE_${firstStage.roleId}`);
  }

  return {
    ...state,
    phase: 'NIGHT',
    roundNumber: 1,
    night: {
      queue,
      currentStageIndex: 0,
      currentStage: firstStage,
      stageStartedAt: now,
      stageEndsAt: durationMs > 0 ? now + durationMs : 0,
      actions: [],
      lastResolution: null,
    },
  };
}

/**
 * Helper to advance to the next night stage or transition to Day at dawn.
 */
export function advanceNightStage(
  state: WerewolfMasterState,
  ctx: GameContext
): WerewolfMasterState {
  const nextIndex = state.night.currentStageIndex + 1;

  if (nextIndex < state.night.queue.length) {
    const nextStage = state.night.queue[nextIndex]!;
    const now = Date.now();
    const durationMs = nextStage.durationSeconds * 1000;

    ctx.clearTimer();
    if (durationMs > 0) {
      ctx.scheduleTimer(durationMs, `NIGHT_STAGE_${nextStage.roleId}`);
    }

    return {
      ...state,
      night: {
        ...state.night,
        currentStageIndex: nextIndex,
        currentStage: nextStage,
        stageStartedAt: now,
        stageEndsAt: durationMs > 0 ? now + durationMs : 0,
      },
    };
  }

  // Night queue finished -> Resolve dawn!
  ctx.clearTimer();
  const resolution = resolveNightActions(state.players, state.night.actions);

  // Apply deaths
  const updatedPlayers = state.players.map((p) => {
    if (resolution.eliminatedPlayerIds.includes(p.id)) {
      return {
        ...p,
        isAlive: false,
        deathRound: state.roundNumber,
        deathReason: 'Eliminated in the night',
      };
    }
    return p;
  });

  // Record seer investigation results
  const updatedInvestigations = { ...state.investigations };
  for (const [seerId, res] of Object.entries(resolution.investigations)) {
    const existing = updatedInvestigations[seerId] || [];
    if (!existing.some((e) => e.targetPlayerId === res.targetPlayerId)) {
      updatedInvestigations[seerId] = [...existing, res];
    }
  }

  // Check win condition immediately after night casualties
  const win = checkWinConditions(updatedPlayers);
  if (win) {
    return {
      ...state,
      phase: 'GAME_OVER',
      players: updatedPlayers,
      investigations: updatedInvestigations,
      night: {
        ...state.night,
        currentStageIndex: -1,
        currentStage: null,
        lastResolution: resolution,
      },
      gameOverData: {
        winner: win.winner,
        reason: win.reason,
        nightsSurvived: state.roundNumber,
        roles: Object.fromEntries(
          updatedPlayers.map((p) => [
            p.id,
            {
              roleId: p.roleId || 'villager',
              roleName: RoleRegistry.getInstance().get(p.roleId || 'villager')?.name || 'Villager',
              alignment: p.alignment,
              isAlive: p.isAlive,
            },
          ])
        ),
      },
    };
  }

  // Move to Day Announcement
  return {
    ...state,
    phase: 'DAY_ANNOUNCEMENT',
    players: updatedPlayers,
    investigations: updatedInvestigations,
    night: {
      ...state.night,
      currentStageIndex: -1,
      currentStage: null,
      lastResolution: resolution,
    },
    day: {
      votes: {},
      eliminatedPlayerId: null,
      isTie: false,
    },
  };
}

export function processWerewolfMove(
  state: WerewolfMasterState,
  move: GameMove,
  ctx: GameContext
): MoveResult<WerewolfMasterState> {
  const payload = (move.payload || {}) as Record<string, any>;

  switch (move.type) {
    case 'UPDATE_ROLE_CONFIG': {
      const mode = (payload.roleAssignmentMode as RoleAssignmentMode) || state.roleAssignmentMode;
      const roleCounts = (payload.roleCounts as Record<string, number>) || state.roleCounts;

      // Update availableRoles quotas matching roleCounts
      const updatedAvailable: WerewolfMasterState['availableRoles'] = {};
      const allRoles = RoleRegistry.getInstance().list();
      for (const role of allRoles) {
        const count = roleCounts[role.id] ?? 0;
        updatedAvailable[role.id] = {
          minCount: role.minCount,
          maxCount: count,
          currentCount: 0,
        };
      }

      return {
        success: true,
        newState: {
          ...state,
          roleAssignmentMode: mode,
          roleCounts,
          availableRoles: updatedAvailable,
        },
      };
    }

    case 'START_ROLE_SETUP': {
      if (state.roleAssignmentMode === 'RANDOM') {
        const assignedPlayers = assignRandomRoles(state.players, state.roleCounts);
        return {
          success: true,
          newState: {
            ...state,
            phase: 'ROLE_REVEAL',
            players: assignedPlayers,
            allRolesSelected: true,
            allRolesConfirmed: true,
            allRolesReady: false,
          },
        };
      }

      // Mode A: PHYSICAL
      // Reset players to unassigned for physical input
      const resetPlayers = state.players.map((p) => {
        if (p.isHost || p.canPlay === false) return p;
        return {
          ...p,
          roleId: null,
          roleConfirmed: false,
          roleRevealedReady: false,
        };
      });

      return {
        success: true,
        newState: {
          ...state,
          phase: 'ROLE_ASSIGNMENT',
          players: resetPlayers,
          allRolesSelected: false,
          allRolesConfirmed: false,
          allRolesReady: false,
        },
      };
    }

    case 'SELECT_ROLE': {
      const roleId = payload.roleId;
      const registry = RoleRegistry.getInstance();
      const roleDef = registry.get(roleId)!;

      const player = state.players.find((p) => p.id === move.playerId)!;
      const prevRoleId = player.roleId;

      const updatedAvailable = { ...state.availableRoles };
      if (prevRoleId && updatedAvailable[prevRoleId]) {
        updatedAvailable[prevRoleId] = {
          ...updatedAvailable[prevRoleId]!,
          currentCount: Math.max(0, updatedAvailable[prevRoleId]!.currentCount - 1),
        };
      }
      if (updatedAvailable[roleId]) {
        updatedAvailable[roleId] = {
          ...updatedAvailable[roleId]!,
          currentCount: updatedAvailable[roleId]!.currentCount + 1,
        };
      }

      const updatedPlayers = state.players.map((p) =>
        p.id === move.playerId
          ? {
              ...p,
              roleId,
              alignment: roleDef.alignment,
              team: roleDef.team,
            }
          : p
      );

      const allSelected = updatedPlayers
        .filter((p) => p.canPlay !== false && !p.isHost)
        .every((p) => !!p.roleId);

      return {
        success: true,
        newState: {
          ...state,
          players: updatedPlayers,
          availableRoles: updatedAvailable,
          allRolesSelected: allSelected,
        },
      };
    }

    case 'CONFIRM_ROLE': {
      const updatedPlayers = state.players.map((p) =>
        p.id === move.playerId
          ? { ...p, roleConfirmed: true }
          : p
      );

      const playingPlayers = updatedPlayers.filter((p) => p.canPlay !== false && !p.isHost);
      const allConfirmed = playingPlayers.every((p) => p.roleConfirmed && !!p.roleId);

      if (allConfirmed) {
        // Advance to common ROLE_REVEAL gate
        return {
          success: true,
          newState: {
            ...state,
            phase: 'ROLE_REVEAL',
            players: updatedPlayers,
            allRolesConfirmed: true,
            allRolesReady: false,
          },
        };
      }

      return {
        success: true,
        newState: {
          ...state,
          players: updatedPlayers,
        },
      };
    }

    case 'START_GAME': {
      if (state.phase === 'ROLE_ASSIGNMENT') {
        return {
          success: true,
          newState: {
            ...state,
            phase: 'ROLE_REVEAL',
            allRolesConfirmed: true,
            allRolesReady: false,
          },
        };
      }
      return { success: false, error: 'Cannot start game in current phase.' };
    }

    case 'ACKNOWLEDGE_ROLE': {
      const updatedPlayers = state.players.map((p) =>
        p.id === move.playerId
          ? { ...p, roleRevealedReady: true }
          : p
      );

      const playingPlayers = updatedPlayers.filter((p) => p.canPlay !== false && !p.isHost);
      const allReady = playingPlayers.every((p) => p.roleRevealedReady);

      const intermediateState: WerewolfMasterState = {
        ...state,
        players: updatedPlayers,
        allRolesReady: allReady,
      };

      if (allReady) {
        return {
          success: true,
          newState: startNight1(intermediateState, ctx),
        };
      }

      return {
        success: true,
        newState: intermediateState,
      };
    }

    case 'START_NIGHT_1': {
      return {
        success: true,
        newState: startNight1(state, ctx),
      };
    }

    case 'CONFIRM_START': {
      // Backward compatibility handler
      if (state.phase === 'ROLE_CONFIGURATION') {
        const assignedPlayers = assignRandomRoles(state.players, state.roleCounts);
        return {
          success: true,
          newState: {
            ...state,
            phase: 'ROLE_REVEAL',
            players: assignedPlayers,
            allRolesSelected: true,
            allRolesConfirmed: true,
            allRolesReady: false,
          },
        };
      }

      return {
        success: true,
        newState: startNight1(state, ctx),
      };
    }

    case 'NIGHT_ACTION':
    case 'NIGHT_SKIP': {
      const isSkip = move.type === 'NIGHT_SKIP';
      const stage = state.night.currentStage!;
      const action: NightAction = {
        playerId: move.playerId,
        roleId: stage.roleId,
        actionType: stage.actionType,
        targetPlayerId: payload.targetPlayerId,
        secondaryTargetPlayerId: payload.secondaryTargetPlayerId,
        isHeal: !!payload.isHeal,
        isPoison: !!payload.isPoison,
        isSkip,
        timestamp: Date.now(),
      };

      // Record player state updates (e.g. witch used potion, defender target)
      const updatedPlayers = state.players.map((p) => {
        if (p.id === move.playerId) {
          if (stage.roleId === 'witch') {
            return {
              ...p,
              witchUsedHeal: p.witchUsedHeal || !!payload.isHeal,
              witchUsedPoison: p.witchUsedPoison || !!payload.isPoison,
            };
          }
          if (stage.roleId === 'defender') {
            return {
              ...p,
              defenderLastProtectedId: payload.targetPlayerId,
            };
          }
        }
        return p;
      });

      // Immediate Seer investigation calculation
      const updatedInvestigations = { ...state.investigations };
      if (stage.roleId === 'seer' && payload.targetPlayerId && !isSkip) {
        const target = state.players.find((p) => p.id === payload.targetPlayerId);
        if (target) {
          const targetDef = target.roleId ? RoleRegistry.getInstance().get(target.roleId) : undefined;
          const alignment = targetDef?.investigationResult?.revealedAlignment || target.alignment || 'GOOD';
          const newInvestigationResult = {
            targetPlayerId: target.id,
            targetDisplayName: target.displayName,
            revealedAlignment: alignment,
            revealedRole: targetDef?.investigationResult?.revealedRole,
          };
          const existing = updatedInvestigations[move.playerId] || [];
          const filtered = existing.filter((e) => e.targetPlayerId !== target.id);
          updatedInvestigations[move.playerId] = [...filtered, newInvestigationResult];
        }
      }

      // Filter out any previous action from this player in this stage
      const filteredActions = state.night.actions.filter(
        (a) => !(a.playerId === move.playerId && a.roleId === stage.roleId)
      );
      const updatedActions = [...filteredActions, action];

      const intermediateState: WerewolfMasterState = {
        ...state,
        players: updatedPlayers,
        investigations: updatedInvestigations,
        night: {
          ...state.night,
          actions: updatedActions,
        },
      };

      // If Seer inspected a target (and did not click Done/Skip), keep Seer in intermediate state so they can view the result
      if (stage.roleId === 'seer' && !isSkip) {
        return {
          success: true,
          newState: intermediateState,
        };
      }

      // If individual action, or if all members of group role have acted -> advance stage
      const stagePlayers = state.players.filter(
        (p) => p.isAlive && p.roleId === stage.roleId
      );
      const actedCount = updatedActions.filter((a) => a.roleId === stage.roleId).length;

      if (stage.actionMode === 'INDIVIDUAL' || actedCount >= stagePlayers.length) {
        return {
          success: true,
          newState: advanceNightStage(intermediateState, ctx),
        };
      }

      return {
        success: true,
        newState: intermediateState,
      };
    }

    case 'DAY_PROCEED': {
      return {
        success: true,
        newState: {
          ...state,
          phase: 'DAY_DISCUSSION',
        },
      };
    }

    case 'DAY_CALL_VOTE': {
      return {
        success: true,
        newState: {
          ...state,
          phase: 'DAY_VOTING',
          day: {
            ...state.day,
            votes: {},
          },
        },
      };
    }

    case 'DAY_VOTE': {
      const targetId = payload.targetPlayerId;
      const updatedVotes = {
        ...state.day.votes,
        [move.playerId]: targetId,
      };

      const livingPlayers = state.players.filter((p) => p.isAlive && p.canPlay !== false && !p.isHost);
      const allVoted = livingPlayers.every((p) => !!updatedVotes[p.id]);

      const updatedState = {
        ...state,
        day: {
          ...state.day,
          votes: updatedVotes,
        },
      };

      // If all living players have voted, auto finish voting
      if (allVoted) {
        const tally = tallyDayVotes(state.players, updatedVotes);
        const elimId = tally.eliminatedPlayerId;

        const playersAfterLynch = state.players.map((p) => {
          if (elimId && p.id === elimId) {
            return {
              ...p,
              isAlive: false,
              deathRound: state.roundNumber,
              deathReason: 'Executed by village vote',
            };
          }
          return p;
        });

        const win = checkWinConditions(playersAfterLynch);
        if (win) {
          return {
            success: true,
            newState: {
              ...updatedState,
              phase: 'GAME_OVER',
              players: playersAfterLynch,
              day: {
                ...updatedState.day,
                eliminatedPlayerId: elimId,
                isTie: tally.isTie,
              },
              gameOverData: {
                winner: win.winner,
                reason: win.reason,
                nightsSurvived: state.roundNumber,
                roles: Object.fromEntries(
                  playersAfterLynch.map((p) => [
                    p.id,
                    {
                      roleId: p.roleId || 'villager',
                      roleName: RoleRegistry.getInstance().get(p.roleId || 'villager')?.name || 'Villager',
                      alignment: p.alignment,
                      isAlive: p.isAlive,
                    },
                  ])
                ),
              },
            },
          };
        }

        return {
          success: true,
          newState: {
            ...updatedState,
            phase: 'DAY_EXECUTION',
            players: playersAfterLynch,
            day: {
              ...updatedState.day,
              eliminatedPlayerId: elimId,
              isTie: tally.isTie,
            },
          },
        };
      }

      return {
        success: true,
        newState: updatedState,
      };
    }

    case 'DAY_FINISH_VOTING': {
      const tally = tallyDayVotes(state.players, state.day.votes);
      const elimId = tally.eliminatedPlayerId;

      const playersAfterLynch = state.players.map((p) => {
        if (elimId && p.id === elimId) {
          return {
            ...p,
            isAlive: false,
            deathRound: state.roundNumber,
            deathReason: 'Executed by village vote',
          };
        }
        return p;
      });

      const win = checkWinConditions(playersAfterLynch);
      if (win) {
        return {
          success: true,
          newState: {
            ...state,
            phase: 'GAME_OVER',
            players: playersAfterLynch,
            day: {
              ...state.day,
              eliminatedPlayerId: elimId,
              isTie: tally.isTie,
            },
            gameOverData: {
              winner: win.winner,
              reason: win.reason,
              nightsSurvived: state.roundNumber,
              roles: Object.fromEntries(
                playersAfterLynch.map((p) => [
                  p.id,
                  {
                    roleId: p.roleId || 'villager',
                    roleName: RoleRegistry.getInstance().get(p.roleId || 'villager')?.name || 'Villager',
                    alignment: p.alignment,
                    isAlive: p.isAlive,
                  },
                ])
              ),
            },
          },
        };
      }

      return {
        success: true,
        newState: {
          ...state,
          phase: 'DAY_EXECUTION',
          players: playersAfterLynch,
          day: {
            ...state.day,
            eliminatedPlayerId: elimId,
            isTie: tally.isTie,
          },
        },
      };
    }

    case 'DAY_PROCEED_TO_NIGHT': {
      const nextRound = state.roundNumber + 1;
      const queue = buildNightQueue(state.players);
      const firstStage = queue[0] || null;
      const now = Date.now();
      const durationMs = (firstStage?.durationSeconds || 15) * 1000;

      ctx.clearTimer();
      if (firstStage && durationMs > 0) {
        ctx.scheduleTimer(durationMs, `NIGHT_STAGE_${firstStage.roleId}`);
      }

      return {
        success: true,
        newState: {
          ...state,
          phase: 'NIGHT',
          roundNumber: nextRound,
          night: {
            queue,
            currentStageIndex: 0,
            currentStage: firstStage,
            stageStartedAt: now,
            stageEndsAt: durationMs > 0 ? now + durationMs : 0,
            actions: [],
            lastResolution: null,
          },
          day: {
            votes: {},
            eliminatedPlayerId: null,
            isTie: false,
          },
        },
      };
    }

    default:
      return { success: false, error: `Unhandled move: ${move.type}` };
  }
}
