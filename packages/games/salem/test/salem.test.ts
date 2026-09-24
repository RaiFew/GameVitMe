import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { GameContext } from '@party/game-engine';
import { salemGame, DEFAULT_SALEM_SETTINGS } from '../src/index.js';
import type { SalemPlayerState, SalemMasterState } from '../src/types/index.js';
import { buildNightQueue } from '../src/engine/night-queue.js';
import { resolveNightActions } from '../src/engine/night-resolver.js';
import { checkWinConditions } from '../src/engine/win-conditions.js';
import { tallyDayVotes } from '../src/engine/day-engine.js';

function createMockContext(players: { id: string; displayName: string }[]): GameContext {
  return {
    roomId: 'room-salem-1',
    sessionId: 'session-salem-1',
    players: players.map((p, i) => ({
      id: p.id,
      seatNumber: i + 1,
      displayName: p.displayName,
      isConnected: true,
    })),
    broadcast: () => {},
    emitToPlayer: () => {},
    scheduleTimer: () => {},
    clearTimer: () => {},
    getMetadata: () => ({}),
    setMetadata: () => {},
  };
}

describe('Salem 1692 Engine & 1-Host Test Suite', () => {
  test('Initial setup enforces Host Mode and creates ROLE_SELECTION phase', () => {
    const players = [
      { id: 'host-1', displayName: 'Salem Magistrate (Host)' },
      { id: 'p1', displayName: 'Goodman Proctor' },
      { id: 'p2', displayName: 'Goody Nurse' },
      { id: 'p3', displayName: 'Giles Corey' },
      { id: 'p4', displayName: 'Abigail Williams' },
    ];
    const ctx = createMockContext(players);
    const settings = {
      ...DEFAULT_SALEM_SETTINGS,
      hostPlayerId: 'host-1',
      hostMode: true,
    };
    const state = salemGame.setup(ctx, settings as any);

    assert.equal(state.phase, 'ROLE_SELECTION');
    assert.equal(state.hostMode, true);
    assert.equal(state.hostPlayerId, 'host-1');

    const host = state.players.find((p) => p.id === 'host-1');
    assert.equal(host?.isHost, true);
    assert.equal(host?.canPlay, false);

    // Host cannot select a role
    const hostRoleVal = salemGame.validateMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'host-1', payload: { roleId: 'witch' }, timestamp: Date.now() },
      ctx
    );
    assert.equal(hostRoleVal.valid, false);
  });

  test('All citizens select roles, Host begins night, and Host is not in night queue', () => {
    const players = [
      { id: 'host-1', displayName: 'Host' },
      { id: 'p1', displayName: 'Alice' },
      { id: 'p2', displayName: 'Bob' },
      { id: 'p3', displayName: 'Charlie' },
      { id: 'p4', displayName: 'David' },
    ];
    const ctx = createMockContext(players);
    let state = salemGame.setup(ctx, { ...DEFAULT_SALEM_SETTINGS, hostPlayerId: 'host-1' } as any);

    state = salemGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p1', payload: { roleId: 'witch' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = salemGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p2', payload: { roleId: 'town_crier' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = salemGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p3', payload: { roleId: 'constable' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = salemGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p4', payload: { roleId: 'puritan' }, timestamp: Date.now() },
      ctx
    ).newState!;

    assert.equal(state.allRolesSelected, true);

    // Non-host cannot start game
    assert.equal(
      salemGame.validateMove(state, { type: 'CONFIRM_START', playerId: 'p1', payload: {}, timestamp: Date.now() }, ctx).valid,
      false
    );

    // Host starts game
    state = salemGame.processMove(
      state,
      { type: 'CONFIRM_START', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;

    assert.equal(state.phase, 'NIGHT');
    assert.ok(state.night.queue.every((q) => q.roleId !== 'host'));
    assert.equal(state.night.currentStage?.roleId, 'witch');
  });

  test('Constable mallet protection prevents Witch coven curse', () => {
    const players: SalemPlayerState[] = [
      { id: 'w1', displayName: 'Witch', seatNumber: 1, isConnected: true, roleId: 'witch', alignment: 'EVIL', team: 'WITCH', isAlive: true, canPlay: true },
      { id: 'c1', displayName: 'Constable', seatNumber: 2, isConnected: true, roleId: 'constable', alignment: 'GOOD', team: 'TOWN', isAlive: true, canPlay: true },
      { id: 'v1', displayName: 'Victim', seatNumber: 3, isConnected: true, roleId: 'puritan', alignment: 'GOOD', team: 'TOWN', isAlive: true, canPlay: true },
    ];

    const actions = [
      { playerId: 'w1', roleId: 'witch', actionType: 'GROUP_TARGET' as const, targetPlayerId: 'v1', timestamp: 1 },
      { playerId: 'c1', roleId: 'constable', actionType: 'PROTECT' as const, targetPlayerId: 'v1', timestamp: 2 },
    ];

    const result = resolveNightActions(players, actions);
    assert.deepEqual(result.eliminatedPlayerIds, []);
    assert.deepEqual(result.savedPlayerIds, ['v1']);
  });

  test('Town Crier discovers Witch alignment as EVIL and Puritan as GOOD', () => {
    const players: SalemPlayerState[] = [
      { id: 'tc', displayName: 'Crier', seatNumber: 1, isConnected: true, roleId: 'town_crier', alignment: 'GOOD', team: 'TOWN', isAlive: true, canPlay: true },
      { id: 'w1', displayName: 'Witch', seatNumber: 2, isConnected: true, roleId: 'witch', alignment: 'EVIL', team: 'WITCH', isAlive: true, canPlay: true },
    ];

    const actions = [
      { playerId: 'tc', roleId: 'town_crier', actionType: 'INVESTIGATE' as const, targetPlayerId: 'w1', timestamp: 1 },
    ];

    const result = resolveNightActions(players, actions);
    assert.equal(result.investigationResults['tc']?.revealedAlignment, 'EVIL');
  });

  test('Win conditions evaluate correctly for Town and Witches', () => {
    const townWin: SalemPlayerState[] = [
      { id: 'p1', displayName: 'P1', seatNumber: 1, isConnected: true, roleId: 'puritan', alignment: 'GOOD', team: 'TOWN', isAlive: true, canPlay: true },
      { id: 'w1', displayName: 'W1', seatNumber: 2, isConnected: true, roleId: 'witch', alignment: 'EVIL', team: 'WITCH', isAlive: false, canPlay: true },
    ];
    assert.equal(checkWinConditions(townWin)?.winner, 'TOWN');

    const witchWin: SalemPlayerState[] = [
      { id: 'p1', displayName: 'P1', seatNumber: 1, isConnected: true, roleId: 'puritan', alignment: 'GOOD', team: 'TOWN', isAlive: true, canPlay: true },
      { id: 'w1', displayName: 'W1', seatNumber: 2, isConnected: true, roleId: 'witch', alignment: 'EVIL', team: 'WITCH', isAlive: true, canPlay: true },
    ];
    assert.equal(checkWinConditions(witchWin)?.winner, 'WITCH');
  });

  test('Salem Mode A (Physical): Host configures slots -> citizens confirm cards -> reveal gate -> Night 1', () => {
    const players = [
      { id: 'host-1', displayName: 'Moderator' },
      { id: 'p1', displayName: 'Abigail' },
      { id: 'p2', displayName: 'John' },
      { id: 'p3', displayName: 'Mary' },
      { id: 'p4', displayName: 'Giles' },
    ];
    const ctx = createMockContext(players);
    let state = salemGame.setup(ctx, {
      ...DEFAULT_SALEM_SETTINGS,
      hostPlayerId: 'host-1',
      roleAssignmentMode: 'PHYSICAL',
      initialPhase: 'ROLE_CONFIGURATION',
      roleCounts: { witch: 1, town_crier: 1, puritan: 2 },
    } as any);

    assert.equal(state.phase, 'ROLE_CONFIGURATION');
    assert.equal(state.roleAssignmentMode, 'PHYSICAL');

    // Host starts setup
    state = salemGame.processMove(
      state,
      { type: 'START_ROLE_SETUP', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;
    assert.equal(state.phase, 'ROLE_ASSIGNMENT');

    // Citizens pick and confirm
    for (const [pid, roleId] of [
      ['p1', 'witch'],
      ['p2', 'town_crier'],
      ['p3', 'puritan'],
      ['p4', 'puritan'],
    ]) {
      state = salemGame.processMove(
        state,
        { type: 'SELECT_ROLE', playerId: pid, payload: { roleId }, timestamp: Date.now() },
        ctx
      ).newState!;
      state = salemGame.processMove(
        state,
        { type: 'CONFIRM_ROLE', playerId: pid, payload: {}, timestamp: Date.now() },
        ctx
      ).newState!;
    }

    assert.equal(state.phase, 'ROLE_REVEAL');

    // Acknowledge role cards
    for (const pid of ['p1', 'p2', 'p3', 'p4']) {
      state = salemGame.processMove(
        state,
        { type: 'ACKNOWLEDGE_ROLE', playerId: pid, payload: {}, timestamp: Date.now() },
        ctx
      ).newState!;
    }

    assert.equal(state.phase, 'NIGHT');
    assert.equal(state.roundNumber, 1);
  });

  test('Salem Mode B (Random): Server randomizes role cards and enters common reveal gate', () => {
    const players = [
      { id: 'host-1', displayName: 'Moderator' },
      { id: 'p1', displayName: 'Abigail' },
      { id: 'p2', displayName: 'John' },
      { id: 'p3', displayName: 'Mary' },
      { id: 'p4', displayName: 'Giles' },
    ];
    const ctx = createMockContext(players);
    let state = salemGame.setup(ctx, {
      ...DEFAULT_SALEM_SETTINGS,
      hostPlayerId: 'host-1',
      roleAssignmentMode: 'RANDOM',
      initialPhase: 'ROLE_CONFIGURATION',
      roleCounts: { witch: 1, town_crier: 1, puritan: 2 },
    } as any);

    assert.equal(state.phase, 'ROLE_CONFIGURATION');
    assert.equal(state.roleAssignmentMode, 'RANDOM');

    // Host starts setup
    state = salemGame.processMove(
      state,
      { type: 'START_ROLE_SETUP', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;
    assert.equal(state.phase, 'ROLE_REVEAL');

    const playing = state.players.filter((p) => !p.isHost && p.canPlay !== false);
    assert.equal(playing.length, 4);
    assert.ok(playing.every((p) => !!p.roleId));

    // Host starts Night 1
    state = salemGame.processMove(
      state,
      { type: 'START_NIGHT_1', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;
    assert.equal(state.phase, 'NIGHT');
  });

  test('Town Crier immediately receives investigation result and acknowledges with NIGHT_SKIP', () => {
    const players = [
      { id: 'host-1', displayName: 'Magistrate' },
      { id: 'w1', displayName: 'Witch' },
      { id: 'tc1', displayName: 'Town Crier' },
      { id: 'p1', displayName: 'Puritan 1' },
      { id: 'p2', displayName: 'Puritan 2' },
    ];
    const ctx = createMockContext(players);
    let state = salemGame.setup(ctx, {
      ...DEFAULT_SALEM_SETTINGS,
      hostPlayerId: 'host-1',
      roleAssignmentMode: 'PHYSICAL',
      initialPhase: 'ROLE_CONFIGURATION',
      roleCounts: { witch: 1, town_crier: 1, puritan: 2 },
    } as any);

    state = salemGame.processMove(state, { type: 'START_ROLE_SETUP', playerId: 'host-1', payload: {}, timestamp: Date.now() }, ctx).newState!;

    state = salemGame.processMove(state, { type: 'SELECT_ROLE', playerId: 'w1', payload: { roleId: 'witch' }, timestamp: Date.now() }, ctx).newState!;
    state = salemGame.processMove(state, { type: 'CONFIRM_ROLE', playerId: 'w1', payload: {}, timestamp: Date.now() }, ctx).newState!;

    state = salemGame.processMove(state, { type: 'SELECT_ROLE', playerId: 'tc1', payload: { roleId: 'town_crier' }, timestamp: Date.now() }, ctx).newState!;
    state = salemGame.processMove(state, { type: 'CONFIRM_ROLE', playerId: 'tc1', payload: {}, timestamp: Date.now() }, ctx).newState!;

    state = salemGame.processMove(state, { type: 'SELECT_ROLE', playerId: 'p1', payload: { roleId: 'puritan' }, timestamp: Date.now() }, ctx).newState!;
    state = salemGame.processMove(state, { type: 'CONFIRM_ROLE', playerId: 'p1', payload: {}, timestamp: Date.now() }, ctx).newState!;

    state = salemGame.processMove(state, { type: 'SELECT_ROLE', playerId: 'p2', payload: { roleId: 'puritan' }, timestamp: Date.now() }, ctx).newState!;
    state = salemGame.processMove(state, { type: 'CONFIRM_ROLE', playerId: 'p2', payload: {}, timestamp: Date.now() }, ctx).newState!;

    state = salemGame.processMove(state, { type: 'START_NIGHT_1', playerId: 'host-1', payload: {}, timestamp: Date.now() }, ctx).newState!;
    assert.equal(state.phase, 'NIGHT');

    // Stage 1: Witch Coven
    assert.equal(state.night.currentStage?.roleId, 'witch');
    state = salemGame.processMove(
      state,
      { type: 'NIGHT_ACTION', playerId: 'w1', payload: { targetPlayerId: 'p1' }, timestamp: Date.now() },
      ctx
    ).newState!;

    // Stage 2: Town Crier
    assert.equal(state.night.currentStage?.roleId, 'town_crier');
    // Town Crier inspects Witch
    state = salemGame.processMove(
      state,
      { type: 'NIGHT_ACTION', playerId: 'tc1', payload: { targetPlayerId: 'w1' }, timestamp: Date.now() },
      ctx
    ).newState!;

    // Stage must not advance automatically!
    assert.equal(state.night.currentStage?.roleId, 'town_crier');

    // PlayerView of Town Crier must contain investigation result
    const tcView = salemGame.getPlayerView(state, 'tc1', ctx);
    assert.ok(tcView.night?.latestInvestigation);
    assert.equal(tcView.night.latestInvestigation.targetPlayerId, 'w1');
    assert.equal(tcView.night.latestInvestigation.revealedAlignment, 'EVIL');

    // Other player cannot see it
    const witchView = salemGame.getPlayerView(state, 'w1', ctx);
    assert.equal(witchView.night?.latestInvestigation, null);

    // Town Crier clicks Done (NIGHT_SKIP) -> advances stage
    state = salemGame.processMove(
      state,
      { type: 'NIGHT_SKIP', playerId: 'tc1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;

    // Since there are no more night stages, advances to DAY_ANNOUNCEMENT
    assert.equal(state.phase, 'DAY_ANNOUNCEMENT');
  });
});

