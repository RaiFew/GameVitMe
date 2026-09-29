import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { GameContext, GamePlayer } from '@party/game-engine';
import { salemGame, DEFAULT_SALEM_SETTINGS } from '../src/index.js';
import type { SalemMasterState, SalemPlayerView } from '../src/types/index.js';
import { resolveNight } from '../src/engine/night-resolution.js';

const PLAYERS: GamePlayer[] = [
  { id: 'host', seatNumber: 1, displayName: 'Magistrate', isConnected: true },
  { id: 'abigail', seatNumber: 2, displayName: 'Abigail', isConnected: true },
  { id: 'john', seatNumber: 3, displayName: 'John', isConnected: true },
  { id: 'mary', seatNumber: 4, displayName: 'Mary', isConnected: true },
  { id: 'giles', seatNumber: 5, displayName: 'Giles', isConnected: true },
];

interface Harness {
  ctx: GameContext;
  /** Events the plugin pushed down the per-player private channel. */
  privateEvents: { playerId: string; event: string; payload: any }[];
}

function harness(): Harness {
  const privateEvents: Harness['privateEvents'] = [];
  const ctx: GameContext = {
    roomId: 'room-salem',
    gameSessionId: 'session-salem',
    players: PLAYERS,
    random: () => 0.5,
    broadcast: () => {},
    emitToPlayer: (playerId, event, payload) => privateEvents.push({ playerId, event, payload }),
    scheduleTimer: () => {},
    clearTimer: () => {},
  };
  return { ctx, privateEvents };
}

function start(): { ctx: GameContext; h: Harness; state: SalemMasterState } {
  const h = harness();
  let state = salemGame.setup(h.ctx, { ...DEFAULT_SALEM_SETTINGS, hostPlayerId: 'host' } as any);

  // LOBBY -> NIGHT_WITCH
  state = play(state, h.ctx, 'host', 'HOST_ADVANCE');
  return { ctx: h.ctx, h, state };
}

function play(
  state: SalemMasterState,
  ctx: GameContext,
  playerId: string,
  type: string,
  payload: Record<string, unknown> = {}
): SalemMasterState {
  const move = { type, playerId, payload, timestamp: Date.now() };
  const check = salemGame.validateMove(state, move, ctx);
  assert.equal(check.valid, true, `${playerId} ${type} rejected: ${check.reason}`);
  const result = salemGame.processMove(state, move, ctx);
  assert.equal(result.success, true, `${playerId} ${type} failed: ${result.error}`);
  return result.newState!;
}

function tryPlay(
  state: SalemMasterState,
  ctx: GameContext,
  playerId: string,
  type: string,
  payload: Record<string, unknown> = {}
): { valid: boolean; reason?: string } {
  return salemGame.validateMove(state, { type, playerId, payload, timestamp: Date.now() }, ctx);
}

function view(state: SalemMasterState, playerId: string, ctx: GameContext): SalemPlayerView {
  return salemGame.getPlayerView(state, playerId, ctx);
}

/** Walks the whole flow: claim, act, advance through to RESOLUTION. */
function playNight(
  state: SalemMasterState,
  ctx: GameContext,
  h: Harness,
  opts: { witchTarget?: string | null; constableTarget?: string | null; passphrase?: string } = {}
) {
  const passphrase = opts.passphrase ?? 'gallows-song';
  let s = play(state, ctx, 'abigail', 'CLAIM_ROLE', { passphrase });
  const witchToken = h.privateEvents.at(-1)!.payload.token;
  if (opts.witchTarget !== null) {
    s = play(s, ctx, 'abigail', 'NIGHT_ACTION', { token: witchToken, targetPlayerId: opts.witchTarget ?? 'giles' });
  }
  s = play(s, ctx, 'host', 'HOST_ADVANCE'); // -> NIGHT_CONSTABLE

  s = play(s, ctx, 'john', 'CLAIM_ROLE', { passphrase });
  const constableToken = h.privateEvents.at(-1)!.payload.token;
  if (opts.constableTarget !== null) {
    s = play(s, ctx, 'john', 'NIGHT_ACTION', { token: constableToken, targetPlayerId: opts.constableTarget ?? 'giles' });
  }
  s = play(s, ctx, 'host', 'HOST_ADVANCE'); // -> MORNING (resolves)
  return s;
}

describe('Salem — resolution', () => {
  test('witch target dies when the constable protected someone else', () => {
    assert.deepEqual(resolveNight('giles', 'mary'), {
      result: 'WITCH_TARGET_DIES',
      deadPlayerIds: ['giles'],
    });
  });

  test('witch target survives when the constable protected them', () => {
    assert.deepEqual(resolveNight('giles', 'giles'), { result: 'NO_DEATH', deadPlayerIds: [] });
  });

  test('no witch target means no night kill', () => {
    assert.deepEqual(resolveNight(null, 'giles'), { result: null, deadPlayerIds: [] });
    assert.deepEqual(resolveNight(null, null), { result: null, deadPlayerIds: [] });
  });

  test('at most one player dies per night', () => {
    assert.equal(resolveNight('giles', 'mary').deadPlayerIds.length, 1);
  });
});

describe('Salem — setup', () => {
  test('setup opens LOBBY with no role assigned to anyone', () => {
    const h = harness();
    const state = salemGame.setup(h.ctx, { ...DEFAULT_SALEM_SETTINGS, hostPlayerId: 'host' } as any);

    assert.equal(state.phase, 'LOBBY');
    assert.equal(state.roundNumber, 0);
    assert.equal(state.hostPlayerId, 'host');
    assert.equal(state.hostMode, true);
    assert.equal(state.players.find((p) => p.id === 'host')?.canPlay, false);
    // No roleId, no roleCounts, no "select your role" state anywhere.
    assert.equal(JSON.stringify(state).includes('roleId'), false);
    assert.equal(JSON.stringify(state).includes('puritan'), false);
  });

  test('salem has no configurable role slots', () => {
    assert.deepEqual(salemGame.settingsFields, []);
  });

  test('a player cannot act before the trial starts', () => {
    const h = harness();
    const state = salemGame.setup(h.ctx, { ...DEFAULT_SALEM_SETTINGS, hostPlayerId: 'host' } as any);
    assert.equal(tryPlay(state, h.ctx, 'abigail', 'CLAIM_ROLE', { passphrase: 'secret' }).valid, false);
  });
});

describe('Salem — phases', () => {
  test('host advances LOBBY -> NIGHT_WITCH -> NIGHT_CONSTABLE -> MORNING -> CONFESSION -> RESOLUTION', () => {
    const { ctx, h, state: s0 } = start();
    assert.equal(s0.phase, 'NIGHT_WITCH');
    assert.equal(s0.roundNumber, 1);

    const s1 = play(s0, ctx, 'host', 'HOST_ADVANCE');
    assert.equal(s1.phase, 'NIGHT_CONSTABLE');
    const s2 = play(s1, ctx, 'host', 'HOST_ADVANCE');
    assert.equal(s2.phase, 'MORNING');
    const s3 = play(s2, ctx, 'host', 'HOST_ADVANCE');
    assert.equal(s3.phase, 'CONFESSION');
    const s4 = play(s3, ctx, 'host', 'HOST_ADVANCE');
    assert.equal(s4.phase, 'RESOLUTION');
  });

  test('only the host advances phases', () => {
    const { ctx, state } = start();
    assert.equal(tryPlay(state, ctx, 'abigail', 'HOST_ADVANCE').valid, false);
  });

  test('a new night increments the round and clears the last night', () => {
    const { ctx, h, state: s0 } = start();
    const s1 = playNight(s0, ctx, h, { witchTarget: 'giles', constableTarget: 'mary' });
    assert.equal(s1.night.result, 'WITCH_TARGET_DIES');
    assert.equal(s1.players.find((p) => p.id === 'giles')?.isAlive, false);

    const s2 = play(play(s1, ctx, 'host', 'HOST_ADVANCE'), ctx, 'host', 'HOST_ADVANCE');
    assert.equal(s2.phase, 'RESOLUTION');
    const s3 = play(s2, ctx, 'host', 'HOST_ADVANCE');
    assert.equal(s3.phase, 'NIGHT_WITCH');
    assert.equal(s3.roundNumber, 2);
    assert.deepEqual(s3.night, {
      witchTargetPlayerId: null,
      constableProtectionPlayerId: null,
      claims: {},
      result: null,
      deadPlayerIds: [],
    });
  });

  test('END_GAME closes the trial and only from RESOLUTION', () => {
    const { ctx, h, state: s0 } = start();
    assert.equal(tryPlay(s0, ctx, 'host', 'END_GAME').valid, false);
    const s1 = playNight(s0, ctx, h, { constableTarget: null });
    const s2 = play(play(s1, ctx, 'host', 'HOST_ADVANCE'), ctx, 'host', 'HOST_ADVANCE');
    assert.equal(s2.phase, 'RESOLUTION');
    assert.equal(tryPlay(s2, ctx, 'abigail', 'END_GAME').valid, false);
    const s3 = play(s2, ctx, 'host', 'END_GAME');
    assert.equal(s3.phase, 'GAME_OVER');
    assert.equal(salemGame.checkGameEnd(s3, ctx)?.isEnded, true);
  });
});

describe('Salem — private role actions', () => {
  test('one claim per role per round; the second is refused', () => {
    const { ctx, state } = start();
    const s1 = play(state, ctx, 'abigail', 'CLAIM_ROLE', { passphrase: 'gallows-song' });
    assert.equal(tryPlay(s1, ctx, 'mary', 'CLAIM_ROLE', { passphrase: 'gallows-song' }).valid, false);
  });

  test('the holder can re-claim to recover their token after a refresh', () => {
    const { ctx, h, state: s0 } = start();
    const s1 = play(s0, ctx, 'abigail', 'CLAIM_ROLE', { passphrase: 'gallows-song' });
    const firstToken = h.privateEvents.at(-1)!.payload.token;

    const s2 = play(s1, ctx, 'abigail', 'CLAIM_ROLE', { passphrase: 'gallows-song' });
    const secondToken = h.privateEvents.at(-1)!.payload.token;
    assert.equal(s2.night.claims.WITCH?.playerId, 'abigail');
    assert.equal(secondToken, firstToken);
    assert.equal(tryPlay(s2, ctx, 'abigail', 'NIGHT_ACTION', { token: secondToken, targetPlayerId: 'giles' }).valid, true);
  });

  test('a passphrase is required to claim', () => {
    const { ctx, state } = start();
    assert.equal(tryPlay(state, ctx, 'abigail', 'CLAIM_ROLE', { passphrase: '' }).valid, false);
    assert.equal(tryPlay(state, ctx, 'abigail', 'CLAIM_ROLE', {}).valid, false);
  });

  test('the host cannot claim a card', () => {
    const { ctx, state } = start();
    assert.equal(tryPlay(state, ctx, 'host', 'CLAIM_ROLE', { passphrase: 'gallows' }).valid, false);
  });

  test('the dead cannot claim or act', () => {
    const { ctx, h, state: s0 } = start();
    const s1 = playNight(s0, ctx, h, { witchTarget: 'mary', constableTarget: 'giles' });
    const s2 = play(play(s1, ctx, 'host', 'HOST_ADVANCE'), ctx, 'host', 'HOST_ADVANCE');
    const s3 = play(s2, ctx, 'host', 'HOST_ADVANCE'); // -> NIGHT_WITCH, round 2
    assert.equal(tryPlay(s3, ctx, 'mary', 'CLAIM_ROLE', { passphrase: 'gallows-song' }).valid, false);
  });

  test('acting without the matching token is refused', () => {
    const { ctx, h, state: s0 } = start();
    const s1 = play(s0, ctx, 'abigail', 'CLAIM_ROLE', { passphrase: 'gallows-song' });
    assert.equal(tryPlay(s1, ctx, 'abigail', 'NIGHT_ACTION', { token: 'forged', targetPlayerId: 'giles' }).valid, false);
    assert.equal(tryPlay(s1, ctx, 'abigail', 'NIGHT_ACTION', { targetPlayerId: 'giles' }).valid, false);
    // A different player cannot borrow the Witch's claim.
    assert.equal(tryPlay(s1, ctx, 'mary', 'NIGHT_ACTION', { token: h.privateEvents.at(-1)!.payload.token, targetPlayerId: 'giles' }).valid, false);
  });

  test('the token is pushed only to the claiming socket', () => {
    const { ctx, h, state: s0 } = start();
    play(s0, ctx, 'abigail', 'CLAIM_ROLE', { passphrase: 'gallows-song' });
    assert.equal(h.privateEvents.length, 1);
    assert.equal(h.privateEvents[0]!.playerId, 'abigail');
    assert.equal(h.privateEvents[0]!.event, 'salem:role_token');
  });

  test('dead players and the host cannot be targeted', () => {
    const { ctx, h, state: s0 } = start();
    const s1 = play(s0, ctx, 'abigail', 'CLAIM_ROLE', { passphrase: 'gallows-song' });
    const token = h.privateEvents.at(-1)!.payload.token;
    assert.equal(tryPlay(s1, ctx, 'abigail', 'NIGHT_ACTION', { token, targetPlayerId: 'host' }).valid, false);
    assert.equal(tryPlay(s1, ctx, 'abigail', 'NIGHT_ACTION', { token, targetPlayerId: 'nobody' }).valid, false);
  });
});

describe('Salem — privacy', () => {
  test('the witch target is readable by nobody but the witch', () => {
    const { ctx, h, state: s0 } = start();
    const s1 = play(s0, ctx, 'abigail', 'CLAIM_ROLE', { passphrase: 'gallows-song' });
    const token = h.privateEvents.at(-1)!.payload.token;
    const s2 = play(s1, ctx, 'abigail', 'NIGHT_ACTION', { token, targetPlayerId: 'giles' });

    assert.equal(view(s2, 'abigail', ctx).night?.myTargetId, 'giles');
    for (const watcher of ['host', 'john', 'mary', 'giles']) {
      const v = view(s2, watcher, ctx);
      assert.equal(v.night?.myTargetId, null, `${watcher} can read the witch target`);
      assert.equal(
        JSON.stringify(v).includes('TargetPlayerId'),
        false,
        `${watcher} view leaks a target field`
      );
    }
  });

  test('the constable cannot see the witch target and the witch cannot see the protection', () => {
    const { ctx, h, state: s0 } = start();
    const s1 = play(s0, ctx, 'abigail', 'CLAIM_ROLE', { passphrase: 'gallows-song' });
    const witchToken = h.privateEvents.at(-1)!.payload.token;
    const s2 = play(s1, ctx, 'abigail', 'NIGHT_ACTION', { token: witchToken, targetPlayerId: 'giles' });
    const s3 = play(s2, ctx, 'host', 'HOST_ADVANCE');
    const s4 = play(s3, ctx, 'john', 'CLAIM_ROLE', { passphrase: 'gallows-song' });
    const constableToken = h.privateEvents.at(-1)!.payload.token;
    const s5 = play(s4, ctx, 'john', 'NIGHT_ACTION', { token: constableToken, targetPlayerId: 'mary' });

    assert.equal(view(s5, 'john', ctx).night?.myTargetId, 'mary');
    assert.equal(view(s5, 'john', ctx).night?.myTargetId === 'giles', false);
    assert.equal(view(s5, 'abigail', ctx).night?.myTargetId, null, 'witch sees the protection');
    assert.equal(view(s5, 'host', ctx).night?.myTargetId, null, 'host sees a target');
  });

  test('no claim token ever reaches a player view', () => {
    const { ctx, h, state: s0 } = start();
    const s1 = playNight(s0, ctx, h, { witchTarget: 'giles', constableTarget: 'mary' });
    const tokens = h.privateEvents.map((e) => e.payload.token);
    for (const playerId of PLAYERS.map((p) => p.id)) {
      const serialised = JSON.stringify(view(s1, playerId, ctx));
      for (const token of tokens) {
        assert.equal(serialised.includes(token), false, `${playerId} view contains a token`);
      }
    }
  });

  test('claiming reveals that a role was called for, never who claimed it', () => {
    const { ctx, state: s0 } = start();
    const s1 = play(s0, ctx, 'abigail', 'CLAIM_ROLE', { passphrase: 'gallows-song' });

    assert.equal(view(s1, 'abigail', ctx).night?.iHaveClaimed, true);
    for (const watcher of ['host', 'john', 'mary', 'giles']) {
      const v = view(s1, watcher, ctx);
      assert.equal(v.night?.claimed, true);
      assert.equal(v.night?.iHaveClaimed, false);
    }
  });

  test('the outcome is public from MORNING, the result is fixed once', () => {
    const { ctx, h, state: s0 } = start();
    const s1 = playNight(s0, ctx, h, { witchTarget: 'giles', constableTarget: 'mary' });
    assert.equal(s1.phase, 'MORNING');

    for (const playerId of PLAYERS.map((p) => p.id)) {
      const v = view(s1, playerId, ctx);
      assert.equal(v.outcome?.result, 'WITCH_TARGET_DIES');
      assert.deepEqual(v.outcome?.deadPlayerIds, ['giles']);
    }

    // The host can keep advancing, but the outcome never changes.
    const s2 = play(play(s1, ctx, 'host', 'HOST_ADVANCE'), ctx, 'host', 'HOST_ADVANCE');
    assert.equal(s2.night.result, 'WITCH_TARGET_DIES');
    assert.equal(s2.night.witchTargetPlayerId, 'giles');
  });

  test('no target is exposed before morning', () => {
    const { ctx, state: s0 } = start();
    assert.equal(view(s0, 'host', ctx).outcome, undefined);
    assert.equal(JSON.stringify(view(s0, 'host', ctx)).includes('targetPlayerId'), false);
  });
});
