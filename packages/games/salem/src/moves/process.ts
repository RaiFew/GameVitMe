import type { GameMove, GameContext, MoveResult } from '@party/game-engine';
import type { SalemMasterState, SalemPlayerState, NightAction, RoleAssignmentMode } from '../types/index.js';
import { SalemRoleRegistry } from '../roles/registry.js';
import { buildNightQueue } from '../engine/night-queue.js';
import { resolveNightActions } from '../engine/night-resolver.js';
import { checkWinConditions } from '../engine/win-conditions.js';
import { tallyDayVotes } from '../engine/day-engine.js';
import { assignRandomSalemRoles } from '../engine/role-assignment.js';

function startNight1(state: SalemMasterState, ctx: GameContext): SalemMasterState {
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

export function advanceNightStage(
  state: SalemMasterState,
  ctx: GameContext
): SalemMasterState {
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

  // Dawn Resolution
  ctx.clearTimer();
  const resolution = resolveNightActions(state.players, state.night.actions);

  const updatedPlayers = state.players.map((p) => {
    if (resolution.eliminatedPlayerIds.includes(p.id)) {
      return {
        ...p,
        isAlive: false,
        deathRound: state.roundNumber,
        deathReason: 'Witchcraft or Hemlock',
      };
    }
    return p;
  });

  const updatedInvestigations = { ...state.investigations };
  for (const [seerId, result] of Object.entries(resolution.investigationResults)) {
    if (!updatedInvestigations[seerId]) updatedInvestigations[seerId] = [];
    const alreadyPresent = updatedInvestigations[seerId]!.some(
      (inv) => inv.targetPlayerId === result.targetPlayerId && inv.revealedAlignment === result.revealedAlignment
    );
    if (!alreadyPresent) {
      updatedInvestigations[seerId]!.push({
        targetPlayerId: result.targetPlayerId,
        revealedAlignment: result.revealedAlignment as any,
      });
    }
  }

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
        roles: Object.fromEntries(
          updatedPlayers.map((p) => [
            p.id,
            {
              roleId: p.roleId || 'unknown',
              roleName: SalemRoleRegistry.getInstance().get(p.roleId || '')?.name || 'Citizen',
              alignment: p.alignment,
              isAlive: p.isAlive,
            },
          ])
        ),
        nightsSurvived: state.roundNumber,
      },
    };
  }

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

export function processSalemMove(
  state: SalemMasterState,
  move: GameMove,
  ctx: GameContext
): MoveResult<SalemMasterState> {
  const payload = (move.payload || {}) as Record<string, any>;

  switch (move.type) {
    case 'UPDATE_ROLE_CONFIG': {
      const mode = (payload.roleAssignmentMode as RoleAssignmentMode) || state.roleAssignmentMode;
      const roleCounts = (payload.roleCounts as Record<string, number>) || state.roleCounts;

      const updatedAvailable: SalemMasterState['availableRoles'] = {};
      const allRoles = SalemRoleRegistry.getInstance().list();
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
        const assignedPlayers = assignRandomSalemRoles(state.players, state.roleCounts);
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
      const registry = SalemRoleRegistry.getInstance();
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

      const intermediateState: SalemMasterState = {
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
      if (state.phase === 'ROLE_CONFIGURATION') {
        const assignedPlayers = assignRandomSalemRoles(state.players, state.roleCounts);
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

    case 'NIGHT_ACTION': {
      const stage = state.night.currentStage!;
      const isSkip = !!payload.isSkip;

      const action: NightAction = {
        playerId: move.playerId,
        roleId: stage.roleId,
        actionType: stage.actionType as any,
        targetPlayerId: payload.targetPlayerId,
        isHeal: !!payload.isHeal,
        isPoison: !!payload.isPoison,
        isSkip,
        timestamp: Date.now(),
      };

      const updatedPlayers = state.players.map((p) => {
        if (p.id === move.playerId) {
          if (stage.roleId === 'doctor') {
            return {
              ...p,
              doctorUsedHeal: p.doctorUsedHeal || !!payload.isHeal,
              doctorUsedPoison: p.doctorUsedPoison || !!payload.isPoison,
            };
          }
          if (stage.roleId === 'constable') {
            return {
              ...p,
              constableLastProtectedId: payload.targetPlayerId,
            };
          }
        }
        return p;
      });

      const filtered = state.night.actions.filter(
        (a) => !(a.playerId === move.playerId && a.roleId === stage.roleId)
      );
      const updatedActions = [...filtered, action];

      const intermediateState: SalemMasterState = {
        ...state,
        players: updatedPlayers,
        night: {
          ...state.night,
          actions: updatedActions,
        },
      };

      if (stage.roleId === 'town_crier' && payload.targetPlayerId) {
        const target = state.players.find((p) => p.id === payload.targetPlayerId);
        if (target) {
          const isWitch = target.team === 'WITCH' || target.roleId === 'witch';
          const newResult = {
            targetPlayerId: target.id,
            revealedAlignment: (isWitch ? 'EVIL' : 'GOOD') as any,
          };
          const currentList = intermediateState.investigations[move.playerId] || [];
          intermediateState.investigations = {
            ...intermediateState.investigations,
            [move.playerId]: [...currentList, newResult],
          };
        }
        return {
          success: true,
          newState: intermediateState,
        };
      }

      const stagePlayers = state.players.filter((p) => p.isAlive && p.roleId === stage.roleId);
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

    case 'NIGHT_SKIP': {
      const stage = state.night.currentStage!;
      const action: NightAction = {
        playerId: move.playerId,
        roleId: stage.roleId,
        actionType: stage.actionType as any,
        isSkip: true,
        timestamp: Date.now(),
      };

      const filtered = state.night.actions.filter(
        (a) => !(a.playerId === move.playerId && a.roleId === stage.roleId)
      );
      const updatedActions = [...filtered, action];

      const intermediateState: SalemMasterState = {
        ...state,
        night: {
          ...state.night,
          actions: updatedActions,
        },
      };

      return {
        success: true,
        newState: advanceNightStage(intermediateState, ctx),
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

      if (allVoted) {
        const tally = tallyDayVotes(state.players, updatedVotes);
        const elimId = tally.eliminatedPlayerId;

        const playersAfterLynch = state.players.map((p) => {
          if (elimId && p.id === elimId) {
            return {
              ...p,
              isAlive: false,
              deathRound: state.roundNumber,
              deathReason: 'Executed by town tribunal',
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
                roles: Object.fromEntries(
                  playersAfterLynch.map((p) => [
                    p.id,
                    {
                      roleId: p.roleId || 'unknown',
                      roleName: SalemRoleRegistry.getInstance().get(p.roleId || '')?.name || 'Citizen',
                      alignment: p.alignment,
                      isAlive: p.isAlive,
                    },
                  ])
                ),
                nightsSurvived: state.roundNumber,
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
            deathReason: 'Executed by town tribunal',
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
              roles: Object.fromEntries(
                playersAfterLynch.map((p) => [
                  p.id,
                  {
                    roleId: p.roleId || 'unknown',
                    roleName: SalemRoleRegistry.getInstance().get(p.roleId || '')?.name || 'Citizen',
                    alignment: p.alignment,
                    isAlive: p.isAlive,
                  },
                ])
              ),
              nightsSurvived: state.roundNumber,
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
