import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { roomManager } from '../src/rooms/room-manager.js';
import { RoomRunner, GameRegistry } from '@party/game-engine';
import SpyfallPlugin from '@party/spyfall';

GameRegistry.getInstance().register(SpyfallPlugin);

/**
 * The Play Again bug: after a rematch, mobile players never saw the new round.
 *
 * `game:start` feeds each seat's `connected` flag into the runner, and
 * `RoomRunner.broadcastPlayerViews` skips anyone flagged disconnected. A player
 * whose socket had dropped sat at `connected: false` forever — nothing but an
 * explicit `room:join` ever cleared it, and a rematch does not send one. The
 * host's Start genuinely worked; the mobile client just never received it.
 */

const HOST = { id: 'host-1', username: 'host', displayName: 'Host' };
const MOBILE = { id: 'mobile-1', username: 'mob', displayName: 'Mobile' };

// Spyfall's setup arms a real `setTimeout` for the round timer. The runner is
// the only thing that clears it, so every runner has to be destroyed between
// tests or the test process never exits.
const runners: RoomRunner[] = [];
afterEach(() => {
  runners.splice(0).forEach((r) => r.destroy());
});

/** Records which player ids a broadcast actually reached. */
function makeRunner(roomId: string) {
  const delivered = new Set<string>();
  const runner = new RoomRunner('spyfall', roomId, 'session-1');
  runner.setEmitToPlayer((playerId, event) => {
    if (event === 'game:state') delivered.add(playerId);
  });
  runner.setBroadcast(() => {});
  runners.push(runner);
  return { runner, delivered };
}

const syncTo = (runner: RoomRunner, playerId: string) => {
  const seen: unknown[] = [];
  runner.setEmitToPlayer((id, event, payload) => {
    if (event === 'game:state' && id === playerId) seen.push(payload);
  });
  runner.emitPlayerView(playerId);
  return seen;
};

test('a rematch reaches a player whose socket had dropped, once they are back', () => {
  const room = roomManager.createRoom(HOST.id, { name: 'play-again', gameType: 'spyfall' });
  roomManager.joinRoom(room.id, HOST);
  roomManager.joinRoom(room.id, MOBILE);

  const startGame = () => {
    const { runner, delivered } = makeRunner(room.id);
    runner.setPlayers(
      roomManager
        .getRoom(room.id)!
        .players.map((p) => ({
          id: p.id,
          seatNumber: p.seatNumber,
          displayName: p.displayName,
          isConnected: p.connected,
        }))
    );
    runner.setup({ hostMode: false, roundDurationSeconds: 480, locationCount: 16 });
    runner.broadcastPlayerViews();
    return { runner, delivered };
  };

  // Round 1: everyone is here.
  const first = startGame();
  assert.ok(first.delivered.has(MOBILE.id), 'round 1 reaches the mobile player');

  // The mobile client's transport drops — the tab is backgrounded.
  roomManager.markDisconnected(room.id, MOBILE.id);

  // The host hits Play Again. The mobile seat is still flagged disconnected,
  // so the broadcast skips it: this is the bug, reproduced.
  const broken = startGame();
  assert.equal(
    broken.delivered.has(MOBILE.id),
    false,
    'reproduces the bug: a stale disconnected seat is skipped by the broadcast'
  );

  // They come back. This is the only thing that clears the flag.
  const restored = roomManager.reconnectPlayer(MOBILE.id);
  assert.equal(restored?.id, room.id);

  // The host starts the next round for real.
  const third = startGame();
  assert.ok(third.delivered.has(MOBILE.id), 'rematch reaches the mobile player once restored');
  assert.ok(third.delivered.has(HOST.id), 'and the host still gets it');
});

test('a returning player can pull the ongoing round with game:sync even while flagged disconnected', () => {
  const room = roomManager.createRoom(HOST.id, { name: 'sync', gameType: 'spyfall' });
  roomManager.joinRoom(room.id, HOST);
  roomManager.joinRoom(room.id, MOBILE);

  const { runner } = makeRunner(room.id);
  runner.setPlayers(
    roomManager
      .getRoom(room.id)!
      .players.map((p) => ({
        id: p.id,
        seatNumber: p.seatNumber,
        displayName: p.displayName,
        isConnected: p.connected,
      }))
  );
  runner.setup({ hostMode: false, roundDurationSeconds: 480, locationCount: 16 });

  roomManager.markDisconnected(room.id, MOBILE.id);

  // game:sync is the rescue path for someone still away: it must not consult
  // the connected flag, or a returning player would be stuck.
  const views = syncTo(runner, MOBILE.id);
  assert.equal(views.length, 1);
  assert.ok(views[0], 'a private view is produced for the absent player');
  assert.ok(
    (views[0] as { phase?: string }).phase,
    'the view carries the real phase, so they land mid-round rather than in a fresh lobby'
  );
});

test('every player in a rematch gets their own private view, not a shared one', () => {
  const room = roomManager.createRoom(HOST.id, { name: 'private', gameType: 'spyfall' });
  roomManager.joinRoom(room.id, HOST);
  roomManager.joinRoom(room.id, MOBILE);

  const { runner } = makeRunner(room.id);
  runner.setPlayers(
    roomManager
      .getRoom(room.id)!
      .players.map((p) => ({
        id: p.id,
        seatNumber: p.seatNumber,
        displayName: p.displayName,
        isConnected: true,
      }))
  );
  runner.setup({ hostMode: false, roundDurationSeconds: 480, locationCount: 16 });

  const hostView = syncTo(runner, HOST.id)[0] as Record<string, unknown>;
  const mobileView = syncTo(runner, MOBILE.id)[0] as Record<string, unknown>;

  assert.notDeepEqual(hostView, mobileView, 'each socket gets its own projection');
});
