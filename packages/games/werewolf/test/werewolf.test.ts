import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { werewolfGame, DEFAULT_WEREWOLF_SETTINGS, RoleRegistry } from '../src/index.js';
import { resolveNightActions } from '../src/engine/night-resolver.js';
import { checkWinConditions } from '../src/engine/win-conditions.js';
import { buildNightQueue } from '../src/engine/night-queue.js';
import { tallyDayVotes } from '../src/engine/day-engine.js';
import type { WerewolfPlayerState, GameContext } from '../src/index.js';

function createMockContext(players: { id: string; displayName: string }[]): GameContext {
  return {
    roomId: 'test-room',
    gameSessionId: 'test-session',
    players: players.map((p, i) => ({
      id: p.id,
      displayName: p.displayName,
      seatNumber: i + 1,
      isConnected: true,
    })),
    random: () => 0.5,
    broadcast: () => {},
    emitToPlayer: () => {},
    scheduleTimer: () => {},
    clearTimer: () => {},
  };
}

describe('Werewolf / Salem Engine Test Suite', () => {
  test('Initial setup creates ROLE_SELECTION phase with quotas', () => {
    const players = [
      { id: 'p1', displayName: 'Alice' },
      { id: 'p2', displayName: 'Bob' },
      { id: 'p3', displayName: 'Charlie' },
      { id: 'p4', displayName: 'David' },
    ];
    const ctx = createMockContext(players);
    const state = werewolfGame.setup(ctx, DEFAULT_WEREWOLF_SETTINGS);

    assert.equal(state.phase, 'ROLE_SELECTION');
    assert.equal(state.players.length, 4);
    assert.equal(state.allRolesSelected, false);
    assert.ok(state.availableRoles['werewolf'].maxCount >= 1);
    assert.ok(state.availableRoles['villager'].maxCount >= 1);
  });

  test('Players can choose roles and slot limits are strictly enforced', () => {
    const players = [
      { id: 'p1', displayName: 'Alice' },
      { id: 'p2', displayName: 'Bob' },
      { id: 'p3', displayName: 'Charlie' },
      { id: 'p4', displayName: 'David' },
    ];
    const ctx = createMockContext(players);
    let state = werewolfGame.setup(ctx, {
      ...DEFAULT_WEREWOLF_SETTINGS,
      roleCounts: { werewolf: 1, seer: 1, villager: 2 },
    });

    // p1 selects werewolf
    const res1 = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p1', payload: { roleId: 'werewolf' }, timestamp: Date.now() },
      ctx
    );
    assert.equal(res1.success, true);
    state = res1.newState!;
    assert.equal(state.players.find((p) => p.id === 'p1')?.roleId, 'werewolf');
    assert.equal(state.availableRoles['werewolf'].currentCount, 1);

    // p2 tries to select werewolf, should be rejected as quota is full
    const val2 = werewolfGame.validateMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p2', payload: { roleId: 'werewolf' }, timestamp: Date.now() },
      ctx
    );
    assert.equal(val2.valid, false);

    // p2 selects seer
    const res2 = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p2', payload: { roleId: 'seer' }, timestamp: Date.now() },
      ctx
    );
    state = res2.newState!;

    // Cannot start game until all players have chosen
    const valStart = werewolfGame.validateMove(
      state,
      { type: 'CONFIRM_START', playerId: 'p1', payload: {}, timestamp: Date.now() },
      ctx
    );
    assert.equal(valStart.valid, false);

    // p3 and p4 select villager
    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p3', payload: { roleId: 'villager' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p4', payload: { roleId: 'villager' }, timestamp: Date.now() },
      ctx
    ).newState!;

    assert.equal(state.allRolesSelected, true);

    // Now confirm start works and transitions to NIGHT
    const resStart = werewolfGame.processMove(
      state,
      { type: 'CONFIRM_START', playerId: 'p1', payload: {}, timestamp: Date.now() },
      ctx
    );
    assert.equal(resStart.success, true);
    assert.equal(resStart.newState!.phase, 'NIGHT');
  });

  test('Night queue builder orders by priority and skips inactive roles', () => {
    const players: WerewolfPlayerState[] = [
      { id: 'w1', displayName: 'Wolf', seatNumber: 1, isConnected: true, roleId: 'werewolf', alignment: 'EVIL', team: 'WEREWOLF', isAlive: true },
      { id: 's1', displayName: 'Seer', seatNumber: 2, isConnected: true, roleId: 'seer', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
      { id: 'v1', displayName: 'Villager', seatNumber: 3, isConnected: true, roleId: 'villager', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
      // Dead Witch:
      { id: 'wt1', displayName: 'Witch', seatNumber: 4, isConnected: true, roleId: 'witch', alignment: 'GOOD', team: 'VILLAGE', isAlive: false },
    ];

    const queue = buildNightQueue(players);
    // Should have Werewolf (prio 10) then Seer (prio 50). Villager has no night action. Witch is dead.
    assert.equal(queue.length, 2);
    assert.equal(queue[0]!.roleId, 'werewolf');
    assert.equal(queue[1]!.roleId, 'seer');
  });

  test('Defender protection prevents Werewolf kill', () => {
    const players: WerewolfPlayerState[] = [
      { id: 'wolf1', displayName: 'Wolf', seatNumber: 1, isConnected: true, roleId: 'werewolf', alignment: 'EVIL', team: 'WEREWOLF', isAlive: true },
      { id: 'def1', displayName: 'Defender', seatNumber: 2, isConnected: true, roleId: 'defender', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
      { id: 'vic1', displayName: 'Victim', seatNumber: 3, isConnected: true, roleId: 'villager', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
    ];

    const actions = [
      { playerId: 'wolf1', roleId: 'werewolf', actionType: 'KILL', targetPlayerId: 'vic1', timestamp: Date.now() },
      { playerId: 'def1', roleId: 'defender', actionType: 'PROTECT', targetPlayerId: 'vic1', timestamp: Date.now() },
    ];

    const res = resolveNightActions(players, actions);
    assert.equal(res.eliminatedPlayerIds.length, 0);
    assert.deepEqual(res.savedPlayerIds, ['vic1']);
  });

  test('Witch heal saves victim, and poison eliminates target', () => {
    const players: WerewolfPlayerState[] = [
      { id: 'wolf1', displayName: 'Wolf', seatNumber: 1, isConnected: true, roleId: 'werewolf', alignment: 'EVIL', team: 'WEREWOLF', isAlive: true },
      { id: 'witch1', displayName: 'Witch', seatNumber: 2, isConnected: true, roleId: 'witch', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
      { id: 'p3', displayName: 'P3', seatNumber: 3, isConnected: true, roleId: 'villager', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
      { id: 'p4', displayName: 'P4', seatNumber: 4, isConnected: true, roleId: 'villager', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
    ];

    // Wolf attacks p3, Witch heals p3 and poisons p4
    const actions = [
      { playerId: 'wolf1', roleId: 'werewolf', actionType: 'KILL', targetPlayerId: 'p3', timestamp: Date.now() },
      {
        playerId: 'witch1',
        roleId: 'witch',
        actionType: 'HEAL_POISON',
        isHeal: true,
        targetPlayerId: 'p3',
        isPoison: true,
        secondaryTargetPlayerId: 'p4',
        timestamp: Date.now(),
      },
    ];

    const res = resolveNightActions(players, actions);
    assert.deepEqual(res.savedPlayerIds, ['p3']);
    assert.deepEqual(res.eliminatedPlayerIds, ['p4']);
  });

  test('Seer inspection discovers alignment (GOOD vs EVIL)', () => {
    const players: WerewolfPlayerState[] = [
      { id: 'seer1', displayName: 'Seer', seatNumber: 1, isConnected: true, roleId: 'seer', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
      { id: 'wolf1', displayName: 'Wolf', seatNumber: 2, isConnected: true, roleId: 'werewolf', alignment: 'EVIL', team: 'WEREWOLF', isAlive: true },
      { id: 'vil1', displayName: 'Townie', seatNumber: 3, isConnected: true, roleId: 'villager', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
    ];

    const actions = [
      { playerId: 'seer1', roleId: 'seer', actionType: 'INVESTIGATE', targetPlayerId: 'wolf1', timestamp: Date.now() },
    ];

    const res = resolveNightActions(players, actions);
    assert.equal(res.investigations['seer1']?.revealedAlignment, 'EVIL');
  });

  test('Day voting tallies plurality votes and handles ties', () => {
    const players: WerewolfPlayerState[] = [
      { id: 'p1', displayName: 'P1', seatNumber: 1, isConnected: true, roleId: 'villager', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
      { id: 'p2', displayName: 'P2', seatNumber: 2, isConnected: true, roleId: 'villager', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
      { id: 'p3', displayName: 'P3', seatNumber: 3, isConnected: true, roleId: 'werewolf', alignment: 'EVIL', team: 'WEREWOLF', isAlive: true },
      { id: 'dead1', displayName: 'Dead', seatNumber: 4, isConnected: true, roleId: 'villager', alignment: 'GOOD', team: 'VILLAGE', isAlive: false },
    ];

    // Clear majority on p3:
    const votes1 = { p1: 'p3', p2: 'p3', p3: 'p1' };
    const tally1 = tallyDayVotes(players, votes1);
    assert.equal(tally1.eliminatedPlayerId, 'p3');
    assert.equal(tally1.isTie, false);

    // Tie between p1 and p3:
    const votes2 = { p1: 'p3', p2: 'p1' };
    const tally2 = tallyDayVotes(players, votes2);
    assert.equal(tally2.eliminatedPlayerId, null);
    assert.equal(tally2.isTie, true);
  });

  test('Win conditions evaluate correctly for Village and Werewolves', () => {
    // 1. All wolves dead -> Village wins
    const villageWinPlayers: WerewolfPlayerState[] = [
      { id: 'p1', displayName: 'Town', seatNumber: 1, isConnected: true, roleId: 'villager', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
      { id: 'w1', displayName: 'Wolf', seatNumber: 2, isConnected: true, roleId: 'werewolf', alignment: 'EVIL', team: 'WEREWOLF', isAlive: false },
    ];
    assert.equal(checkWinConditions(villageWinPlayers)?.winner, 'VILLAGE');

    // 2. Werewolves equal or outnumber town -> Werewolves win
    const wolfWinPlayers: WerewolfPlayerState[] = [
      { id: 'p1', displayName: 'Town', seatNumber: 1, isConnected: true, roleId: 'villager', alignment: 'GOOD', team: 'VILLAGE', isAlive: true },
      { id: 'w1', displayName: 'Wolf', seatNumber: 2, isConnected: true, roleId: 'werewolf', alignment: 'EVIL', team: 'WEREWOLF', isAlive: true },
    ];
    assert.equal(checkWinConditions(wolfWinPlayers)?.winner, 'WEREWOLF');
  });

  test('State masking (getPlayerView) conceals secret roles from non-authorized players', () => {
    const players = [
      { id: 'p1', displayName: 'Alice' },
      { id: 'p2', displayName: 'Bob' },
    ];
    const ctx = createMockContext(players);
    let state = werewolfGame.setup(ctx, DEFAULT_WEREWOLF_SETTINGS);

    // p1 chooses werewolf, p2 chooses seer
    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p1', payload: { roleId: 'werewolf' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p2', payload: { roleId: 'seer' }, timestamp: Date.now() },
      ctx
    ).newState!;

    // In ROLE_SELECTION, p1 should NOT see p2's role
    const p1View = werewolfGame.getPlayerView(state, 'p1', ctx);
    const p2InP1View = p1View.players.find((p) => p.id === 'p2');
    assert.equal(p2InP1View?.revealedRoleId, undefined);
    assert.equal(p2InP1View?.hasSelectedRole, true);
  });

  test('Host Mode: 1 Host acts as moderator, non-playing and controls progression', () => {
    const players = [
      { id: 'host-1', displayName: 'Moderator' },
      { id: 'p1', displayName: 'Alice' },
      { id: 'p2', displayName: 'Bob' },
      { id: 'p3', displayName: 'Charlie' },
      { id: 'p4', displayName: 'David' },
    ];
    const ctx = createMockContext(players);
    const settings = {
      ...DEFAULT_WEREWOLF_SETTINGS,
      hostMode: true,
      hostPlayerId: 'host-1',
    };
    let state = werewolfGame.setup(ctx, settings as any);

    // Host should have isHost: true, canPlay: false
    const hostPlayer = state.players.find((p) => p.id === 'host-1');
    assert.equal(hostPlayer?.isHost, true);
    assert.equal(hostPlayer?.canPlay, false);

    // Host view should show isHost: true
    const hostView = werewolfGame.getPlayerView(state, 'host-1', ctx);
    assert.equal(hostView.isHost, true);
    assert.equal(hostView.canPlay, false);

    // Host cannot select a player role
    const hostSelectValidation = werewolfGame.validateMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'host-1', payload: { roleId: 'werewolf' }, timestamp: Date.now() },
      ctx
    );
    assert.equal(hostSelectValidation.valid, false);

    // Non-host players select roles
    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p1', payload: { roleId: 'werewolf' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p2', payload: { roleId: 'seer' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p3', payload: { roleId: 'villager' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p4', payload: { roleId: 'villager' }, timestamp: Date.now() },
      ctx
    ).newState!;

    // All playing players have selected roles
    assert.equal(state.allRolesSelected, true);

    // Non-host cannot start game in host mode
    const p1Start = werewolfGame.validateMove(
      state,
      { type: 'CONFIRM_START', playerId: 'p1', payload: {}, timestamp: Date.now() },
      ctx
    );
    assert.equal(p1Start.valid, false);

    // Host CAN start the game
    const hostStart = werewolfGame.validateMove(
      state,
      { type: 'CONFIRM_START', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    );
    assert.equal(hostStart.valid, true);

    state = werewolfGame.processMove(
      state,
      { type: 'CONFIRM_START', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;
    assert.equal(state.phase, 'NIGHT');

    // Host is NOT in the night queue
    assert.ok(state.night.queue.every((q) => q.roleId !== 'host'));
  });

  test('Mode A (Physical / Board Game): Role config -> mobile card choice -> confirmation -> reveal -> night', () => {
    const players = [
      { id: 'host-1', displayName: 'Host' },
      { id: 'p1', displayName: 'Alice' },
      { id: 'p2', displayName: 'Bob' },
      { id: 'p3', displayName: 'Charlie' },
      { id: 'p4', displayName: 'David' },
    ];
    const ctx = createMockContext(players);
    let state = werewolfGame.setup(ctx, {
      ...DEFAULT_WEREWOLF_SETTINGS,
      hostMode: true,
      hostPlayerId: 'host-1',
      roleAssignmentMode: 'PHYSICAL',
      initialPhase: 'ROLE_CONFIGURATION',
      roleCounts: { werewolf: 1, seer: 1, villager: 2 },
    } as any);

    assert.equal(state.phase, 'ROLE_CONFIGURATION');
    assert.equal(state.roleAssignmentMode, 'PHYSICAL');

    // Host starts role setup
    const startSetupVal = werewolfGame.validateMove(
      state,
      { type: 'START_ROLE_SETUP', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    );
    assert.equal(startSetupVal.valid, true);

    state = werewolfGame.processMove(
      state,
      { type: 'START_ROLE_SETUP', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;
    assert.equal(state.phase, 'ROLE_ASSIGNMENT');

    // Host view in ROLE_ASSIGNMENT does NOT reveal players secret choices
    const hostViewDuringAssignment = werewolfGame.getPlayerView(state, 'host-1', ctx);
    assert.equal(hostViewDuringAssignment.players.find((p) => p.id === 'p1')?.revealedRoleId, undefined);

    // Players select roles
    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p1', payload: { roleId: 'werewolf' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = werewolfGame.processMove(
      state,
      { type: 'CONFIRM_ROLE', playerId: 'p1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;

    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p2', payload: { roleId: 'seer' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = werewolfGame.processMove(
      state,
      { type: 'CONFIRM_ROLE', playerId: 'p2', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;

    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p3', payload: { roleId: 'villager' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = werewolfGame.processMove(
      state,
      { type: 'CONFIRM_ROLE', playerId: 'p3', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;

    // Still in ROLE_ASSIGNMENT until p4 confirms
    assert.equal(state.phase, 'ROLE_ASSIGNMENT');

    state = werewolfGame.processMove(
      state,
      { type: 'SELECT_ROLE', playerId: 'p4', payload: { roleId: 'villager' }, timestamp: Date.now() },
      ctx
    ).newState!;
    state = werewolfGame.processMove(
      state,
      { type: 'CONFIRM_ROLE', playerId: 'p4', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;

    // Now advances to ROLE_REVEAL
    assert.equal(state.phase, 'ROLE_REVEAL');

    // In ROLE_REVEAL, player sees own card
    const p1View = werewolfGame.getPlayerView(state, 'p1', ctx);
    assert.equal(p1View.me.roleId, 'werewolf');
    // But other players roles are hidden
    assert.equal(p1View.players.find((p) => p.id === 'p2')?.revealedRoleId, undefined);

    // Players acknowledge role
    for (const pid of ['p1', 'p2', 'p3']) {
      state = werewolfGame.processMove(
        state,
        { type: 'ACKNOWLEDGE_ROLE', playerId: pid, payload: {}, timestamp: Date.now() },
        ctx
      ).newState!;
    }
    assert.equal(state.phase, 'ROLE_REVEAL');

    // Final player acknowledges -> auto starts Night 1
    state = werewolfGame.processMove(
      state,
      { type: 'ACKNOWLEDGE_ROLE', playerId: 'p4', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;
    assert.equal(state.phase, 'NIGHT');
    assert.equal(state.roundNumber, 1);
  });

  test('Mode B (Online Random): Server randomizes role distribution and transitions to reveal gate', () => {
    const players = [
      { id: 'host-1', displayName: 'Host' },
      { id: 'p1', displayName: 'Alice' },
      { id: 'p2', displayName: 'Bob' },
      { id: 'p3', displayName: 'Charlie' },
      { id: 'p4', displayName: 'David' },
    ];
    const ctx = createMockContext(players);
    let state = werewolfGame.setup(ctx, {
      ...DEFAULT_WEREWOLF_SETTINGS,
      hostMode: true,
      hostPlayerId: 'host-1',
      roleAssignmentMode: 'RANDOM',
      initialPhase: 'ROLE_CONFIGURATION',
      roleCounts: { werewolf: 1, seer: 1, villager: 2 },
    } as any);

    assert.equal(state.phase, 'ROLE_CONFIGURATION');
    assert.equal(state.roleAssignmentMode, 'RANDOM');

    // Start setup immediately assigns roles and jumps to ROLE_REVEAL
    state = werewolfGame.processMove(
      state,
      { type: 'START_ROLE_SETUP', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;

    assert.equal(state.phase, 'ROLE_REVEAL');
    const playingPlayers = state.players.filter((p) => !p.isHost && p.canPlay !== false);
    assert.equal(playingPlayers.length, 4);
    assert.ok(playingPlayers.every((p) => !!p.roleId));

    const wolfCount = playingPlayers.filter((p) => p.roleId === 'werewolf').length;
    const seerCount = playingPlayers.filter((p) => p.roleId === 'seer').length;
    const villagerCount = playingPlayers.filter((p) => p.roleId === 'villager').length;
    assert.equal(wolfCount, 1);
    assert.equal(seerCount, 1);
    assert.equal(villagerCount, 2);

    // Host can force start Night 1
    const hostNight1Val = werewolfGame.validateMove(
      state,
      { type: 'START_NIGHT_1', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    );
    assert.equal(hostNight1Val.valid, true);

    state = werewolfGame.processMove(
      state,
      { type: 'START_NIGHT_1', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;
    assert.equal(state.phase, 'NIGHT');
    assert.equal(state.roundNumber, 1);
  });

  test('Role Registry includes all 4 categories with modular definitions', () => {
    const registry = werewolfGame.defaultSettings ? RoleRegistry.getInstance() : RoleRegistry.getInstance();
    const villagers = registry.listByCategory('VILLAGER');
    const werewolves = registry.listByCategory('WEREWOLF');
    const neutrals = registry.listByCategory('NEUTRAL');
    const additionals = registry.listByCategory('ADDITIONAL');

    assert.ok(villagers.some((r) => r.id === 'villager'));
    assert.ok(villagers.some((r) => r.id === 'seer'));
    assert.ok(villagers.some((r) => r.id === 'doctor'));
    assert.ok(werewolves.some((r) => r.id === 'werewolf'));
    assert.ok(werewolves.some((r) => r.id === 'alpha_wolf'));
    assert.ok(neutrals.some((r) => r.id === 'tanner'));
    assert.ok(additionals.some((r) => r.id === 'cursed'));
  });

  test('Seer immediately receives investigation result and acknowledges before stage advances', () => {
    const players = [
      { id: 'host-1', displayName: 'Host' },
      { id: 'wolf1', displayName: 'Wolf' },
      { id: 'seer1', displayName: 'Seer' },
      { id: 'vil1', displayName: 'Villager 1' },
      { id: 'vil2', displayName: 'Villager 2' },
    ];
    const ctx = createMockContext(players);
    let state = werewolfGame.setup(ctx, {
      ...DEFAULT_WEREWOLF_SETTINGS,
      hostMode: true,
      hostPlayerId: 'host-1',
      roleAssignmentMode: 'PHYSICAL',
      initialPhase: 'ROLE_CONFIGURATION',
      roleCounts: { werewolf: 1, seer: 1, villager: 2 },
    } as any);

    state = werewolfGame.processMove(
      state,
      { type: 'START_ROLE_SETUP', playerId: 'host-1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;

    // Assign roles
    state = werewolfGame.processMove(state, { type: 'SELECT_ROLE', playerId: 'wolf1', payload: { roleId: 'werewolf' }, timestamp: Date.now() }, ctx).newState!;
    state = werewolfGame.processMove(state, { type: 'CONFIRM_ROLE', playerId: 'wolf1', payload: {}, timestamp: Date.now() }, ctx).newState!;

    state = werewolfGame.processMove(state, { type: 'SELECT_ROLE', playerId: 'seer1', payload: { roleId: 'seer' }, timestamp: Date.now() }, ctx).newState!;
    state = werewolfGame.processMove(state, { type: 'CONFIRM_ROLE', playerId: 'seer1', payload: {}, timestamp: Date.now() }, ctx).newState!;

    state = werewolfGame.processMove(state, { type: 'SELECT_ROLE', playerId: 'vil1', payload: { roleId: 'villager' }, timestamp: Date.now() }, ctx).newState!;
    state = werewolfGame.processMove(state, { type: 'CONFIRM_ROLE', playerId: 'vil1', payload: {}, timestamp: Date.now() }, ctx).newState!;

    state = werewolfGame.processMove(state, { type: 'SELECT_ROLE', playerId: 'vil2', payload: { roleId: 'villager' }, timestamp: Date.now() }, ctx).newState!;
    state = werewolfGame.processMove(state, { type: 'CONFIRM_ROLE', playerId: 'vil2', payload: {}, timestamp: Date.now() }, ctx).newState!;

    // Reveal phase -> Start Night 1
    state = werewolfGame.processMove(state, { type: 'START_NIGHT_1', playerId: 'host-1', payload: {}, timestamp: Date.now() }, ctx).newState!;
    assert.equal(state.phase, 'NIGHT');

    // Stage 1: Werewolf
    assert.equal(state.night.currentStage?.roleId, 'werewolf');
    state = werewolfGame.processMove(
      state,
      { type: 'NIGHT_ACTION', playerId: 'wolf1', payload: { targetPlayerId: 'vil1' }, timestamp: Date.now() },
      ctx
    ).newState!;

    // Stage 2: Seer
    assert.equal(state.night.currentStage?.roleId, 'seer');
    // Seer investigates the Werewolf
    state = werewolfGame.processMove(
      state,
      { type: 'NIGHT_ACTION', playerId: 'seer1', payload: { targetPlayerId: 'wolf1' }, timestamp: Date.now() },
      ctx
    ).newState!;

    // Must NOT automatically advance past Seer stage yet! Seer must see their result.
    assert.equal(state.night.currentStage?.roleId, 'seer');

    // Seer player view MUST have latestInvestigation populated
    const seerView = werewolfGame.getPlayerView(state, 'seer1', ctx);
    assert.ok(seerView.night?.latestInvestigation);
    assert.equal(seerView.night.latestInvestigation.targetPlayerId, 'wolf1');
    assert.equal(seerView.night.latestInvestigation.revealedAlignment, 'EVIL');

    // Other players cannot see this investigation
    const wolfView = werewolfGame.getPlayerView(state, 'wolf1', ctx);
    assert.equal(wolfView.night?.latestInvestigation, null);

    // Seer clicks Done (NIGHT_SKIP) -> advances stage to dawn
    state = werewolfGame.processMove(
      state,
      { type: 'NIGHT_SKIP', playerId: 'seer1', payload: {}, timestamp: Date.now() },
      ctx
    ).newState!;

    assert.equal(state.phase, 'DAY_ANNOUNCEMENT');
  });
});

