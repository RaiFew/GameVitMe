import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomManager } from '../src/rooms/room-manager.js';

let n = 0;
const user = () => ({ id: `u${++n}`, username: 'p', displayName: 'P' });
const makeRoom = () => roomManager.createRoom('host-' + Math.random(), { name: 'test' });

test('a dropped socket keeps its seat so a refresh rejoins as the same player', () => {
  const room = makeRoom();
  const u = user();
  const { player } = roomManager.joinRoom(room.id, u)!;

  roomManager.markDisconnected(room.id, u.id);

  assert.equal(player.connected, false);
  assert.equal(roomManager.getRoom(room.id)!.players.length, 1);
  assert.equal(roomManager.getRoomByPlayer(u.id)!.id, room.id);
});

test('an occupied room is not marked empty', () => {
  const room = makeRoom();
  const a = user();
  const b = user();
  roomManager.joinRoom(room.id, a);
  roomManager.joinRoom(room.id, b);

  roomManager.markDisconnected(room.id, a.id);
  assert.equal(roomManager.getRoom(room.id)!.emptySince, undefined);

  roomManager.markDisconnected(room.id, b.id);
  assert.ok(roomManager.getRoom(room.id)!.emptySince, 'nobody connected -> sweep can reclaim it');

  roomManager.joinRoom(room.id, a);
  assert.equal(roomManager.getRoom(room.id)!.emptySince, undefined, 'a reconnect clears the mark');
});

test('the last player leaving destroys the room and frees its code', () => {
  const room = makeRoom();
  const u = user();
  roomManager.joinRoom(room.id, u);

  roomManager.leaveRoom(room.id, u.id);

  assert.equal(roomManager.getRoom(room.id), undefined);
  assert.equal(roomManager.getRoomByCode(room.code), undefined);
  assert.equal(roomManager.getRoomByPlayer(u.id), undefined, 'no stale index entry');
});

test('reconnecting restores the seat without needing an explicit room:join', () => {
  const room = makeRoom();
  const u = user();
  const { player } = roomManager.joinRoom(room.id, u)!;

  roomManager.markDisconnected(room.id, u.id);
  assert.equal(player.connected, false);

  // A socket that drops and returns is a new object with empty data, so the
  // gateway calls this instead of replaying room:join. Without it the seat
  // stays disconnected and broadcastPlayerViews skips it forever.
  const restored = roomManager.reconnectPlayer(u.id);

  assert.equal(restored?.id, room.id, 'the gateway needs the room to rejoin its channel');
  assert.equal(player.connected, true);
  assert.equal(roomManager.getRoom(room.id)!.emptySince, undefined);
});

test('reconnecting does not hand out a seat to someone who never joined', () => {
  makeRoom();
  const stranger = user();

  assert.equal(roomManager.reconnectPlayer(stranger.id), undefined);
  assert.equal(roomManager.getRoomByPlayer(stranger.id), undefined);
});

test('a room whose only player reconnects is not swept away while they are away', () => {
  const room = makeRoom();
  const u = user();
  roomManager.joinRoom(room.id, u);

  roomManager.markDisconnected(room.id, u.id);
  const since = roomManager.getRoom(room.id)!.emptySince;
  assert.ok(since, 'the sweep is armed while nobody is connected');

  roomManager.reconnectPlayer(u.id);
  assert.equal(roomManager.getRoom(room.id)!.emptySince, undefined, 'the mark is disarmed');
});