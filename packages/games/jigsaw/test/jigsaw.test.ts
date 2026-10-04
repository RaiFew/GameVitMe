import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { GameContext, GameMove, GamePlayer } from '@party/game-engine';
import {
  jigsawGame,
  DEFAULT_JIGSAW_SETTINGS,
  computeGridLayout,
  buildBoundaries,
  tabPoints,
  seamPaths,
  pieceOutlinePath,
  pieceEdgesFor,
  tabAmplitude,
  traySlotOf,
  clusterOf,
  PIECES_BY_DIFFICULTY,
} from '../src/index.js';
import type { JigsawMasterState } from '../src/types/index.js';

const PLAYERS: GamePlayer[] = [
  { id: 'ana', seatNumber: 1, displayName: 'Ana', isConnected: true },
  { id: 'bo', seatNumber: 2, displayName: 'Bo', isConnected: true },
];

const IMAGE = { imageWidth: 1600, imageHeight: 900, pieceCount: 12 };

/**
 * Deterministic PRNG. A constant `random` would hand every piece the same
 * starting rotation, and a piece can only solve at `rot === 0` — so a constant
 * stream makes the puzzle impossible and every "solved" assertion vacuous.
 */
function harness(seed = 12345): GameContext {
  let n = seed;
  return {
    roomId: 'room-jigsaw',
    gameSessionId: 'session-jigsaw',
    players: PLAYERS,
    random: () => ((n = (n * 9301 + 49297) % 233280) / 233280),
    broadcast: () => {},
    emitToPlayer: () => {},
    scheduleTimer: () => {},
    clearTimer: () => {},
  };
}

function start(ctx = harness()): JigsawMasterState {
  return jigsawGame.setup(ctx, { ...DEFAULT_JIGSAW_SETTINGS, ...IMAGE, imageId: 'img-1' });
}

function move(state: JigsawMasterState, ctx: GameContext, playerId: string, type: string, payload: any = {}): JigsawMasterState {
  const m: GameMove = { type, playerId, payload, timestamp: Date.now() };
  const v = jigsawGame.validateMove(state, m, ctx);
  assert.ok(v.valid, `expected ${type} to be valid, got: ${v.reason}`);
  const r = jigsawGame.processMove(state, m, ctx);
  assert.ok(r.success && r.newState);
  return r.newState;
}

/** Turns a piece until it is the right way up. A piece only solves at `rot === 0`. */
function unrotate(state: JigsawMasterState, ctx: GameContext, pieceId: string, by = 'ana'): JigsawMasterState {
  let s = state;
  const turns = (4 - s.pieces[pieceId]!.rot) % 4;
  for (let i = 0; i < turns; i++) s = move(s, ctx, by, 'ROTATE_PIECE', { pieceId });
  assert.equal(s.pieces[pieceId]!.rot, 0);
  return s;
}

function beginPlaying(ctx = harness()): { ctx: GameContext; state: JigsawMasterState } {
  let state = start(ctx);
  state = move(state, ctx, 'ana', 'READY_UP');
  state = move(state, ctx, 'bo', 'READY_UP');
  assert.equal(state.phase, 'PLAYING');
  assert.ok(state.startedAtMs);
  return { ctx, state };
}

describe('computeGridLayout', () => {
  test('hits the exact piece count and closest aspect', () => {
    const cases: [number, number, number, number, number][] = [
      // imageW, imageH, target, cols, rows
      [4000, 300, 96, 32, 3],
      [4000, 300, 12, 12, 1],
      [1000, 1000, 12, 4, 3],
      [1600, 900, 48, 8, 6],
    ];
    for (const [w, h, n, cols, rows] of cases) {
      const got = computeGridLayout(w, h, n);
      assert.equal(got.cols * got.rows, n, `${w}x${h}@${n} must yield exactly ${n} pieces`);
      assert.deepEqual(got, { cols, rows });
    }
  });

  test('never loses a piece, even for extreme aspects', () => {
    for (const [w, h] of [[10000, 100], [100, 10000], [997, 991]]) {
      for (const n of Object.values(PIECES_BY_DIFFICULTY)) {
        assert.equal(computeGridLayout(w, h, n).cols * computeGridLayout(w, h, n).rows, n);
      }
    }
  });

  test('the Master tier is a real 192, not an approximation', () => {
    assert.equal(PIECES_BY_DIFFICULTY.MASTER, 192);
    for (const [w, h] of [[1600, 900], [1000, 1000], [900, 1600], [4000, 300]]) {
      const { cols, rows } = computeGridLayout(w, h, 192);
      assert.equal(cols * rows, 192, `${w}x${h} must cut exactly 192`);
    }
  });
});

describe('edge geometry', () => {
  const CELL_W = 100;
  const CELL_H = 60;
  const AMP = 10;

  /** Same curve walked from opposite ends: exact up to float rounding. */
  function assertSameCurve(actual: readonly (readonly [number, number])[], expected: readonly (readonly [number, number])[]) {
    assert.equal(actual.length, expected.length);
    actual.forEach(([ax, ay], i) => {
      const [ex, ey] = expected[i];
      assert.ok(Math.abs(ax - ex) < 1e-9 && Math.abs(ay - ey) < 1e-9, `point ${i}: ${ax},${ay} vs ${ex},${ey}`);
    });
  }

  test('two neighbours trace the identical shared curve, so the pieces tile', () => {
    const b = buildBoundaries(3, 4, 12345);

    // Cell (1,1)'s right edge and cell (1,2)'s left edge are one boundary walked
    // in opposite directions — a closed outline leaves no other choice. Shifting
    // the first into the second's local space must reproduce it point for point,
    // or the pieces overlap on the tab and leave a gap beside it.
    const rightEdge = tabPoints([AMP + CELL_W, AMP], [AMP + CELL_W, AMP + CELL_H], b.vertical[1][1], AMP, 1, 0);
    const leftEdge = tabPoints([AMP, AMP + CELL_H], [AMP, AMP], b.vertical[1][1], AMP, 1, 0);

    assertSameCurve(
      rightEdge.map(([x, y]) => [x - CELL_W, y] as const),
      [...leftEdge].reverse()
    );
    // It really is a bump, not a straight edge.
    assert.ok(Math.max(...rightEdge.map((p) => p[0])) > AMP + CELL_W + 0.01);
  });

  test('the same holds horizontally, between the piece above and below', () => {
    const b = buildBoundaries(4, 4, 24680);
    const tab = b.horizontal[1][2];

    const above = tabPoints([AMP, AMP], [AMP + CELL_W, AMP], tab, AMP, 0, 1);
    const below = tabPoints([AMP + CELL_W, AMP + CELL_H], [AMP, AMP + CELL_H], tab, AMP, 0, 1);

    assertSameCurve(
      [...above].reverse(),
      below.map(([x, y]) => [x, y - CELL_H] as const)
    );
    assert.ok(Math.max(...above.map((p) => p[1])) > AMP + 0.01);
  });

  test('a tab never crosses its own peak, which would reverse the curve', () => {
    for (let seed = 0; seed < 200; seed++) {
      const b = buildBoundaries(4, 4, seed * 7919);
      for (const tab of [...b.vertical.flat(), ...b.horizontal.flat()]) {
        assert.ok(tab.k > 0.25 && tab.k < 0.5, `k ${tab.k} must keep ts increasing`);
        assert.ok(tab.depth > 0 && tab.depth <= 1);
      }
    }
  });

  test('every tab curve is single-valued along its edge', () => {
    for (let seed = 0; seed < 50; seed++) {
      const b = buildBoundaries(4, 4, seed * 104729);
      for (const tab of [...b.vertical.flat(), ...b.horizontal.flat()]) {
        const along = tabPoints([0, 0], [0, 100], tab, 10, 1, 0).map((p) => p[1]);
        assert.ok(along.every((y, i) => i === 0 || y > along[i - 1]), 'y must increase monotonically');
        const across = tabPoints([0, 0], [0, 100], tab, 10, 1, 0).map((p) => p[0]);
        assert.ok(across.every((x) => x >= 0), 'a tab must never cross back over the line');
      }
    }
  });

  test('tabs start and end exactly on the boundary line', () => {
    const b = buildBoundaries(3, 3, 999);
    // A vertical boundary line at x = 100, running y = 0..50, bulging in +x.
    const pts = tabPoints([100, 0], [100, 50], b.vertical[1][0], 8, 1, 0);
    assert.deepEqual(pts[0], [100, 0]);
    assert.deepEqual(pts[6], [100, 50]);
    // The along-edge coordinate never reverses, so the curve is single-valued.
    assert.ok(pts.every((_, i) => i === 0 || pts[i][1] >= pts[i - 1][1]));
    // And the amplitude stays within its bound.
    assert.ok(Math.max(...pts.map((p) => p[0])) - 100 <= 0.22 * Math.min(CELL_W, CELL_H));
  });

  test('seam overlay follows real curves, not straight lines', () => {
    const seams = seamPaths(3, 3, CELL_W, CELL_H, AMP, buildBoundaries(3, 3, 4242));
    assert.equal(seams.length, (3 - 1) * 3 + (3 - 1) * 3);

    for (const d of seams) {
      const coords = (d.match(/-?[\d.]+/g) || []).map(Number);
      // A boundary whose normal was parallel to it collapses to `M..L..` with
      // only four numbers; a real tab varies well beyond that.
      assert.ok(coords.length > 8, `seam has too few points to be a curve: ${d}`);
      assert.ok(new Set(coords).size > 6, `seam is effectively a straight line: ${d}`);
    }
  });

  test('same seed reproduces the same puzzle outline on every client', () => {
    const b = buildBoundaries(3, 4, 777);
    const a = pieceOutlinePath(pieceEdgesFor(b, 1, 1, 3, 4), 100, 60, 10);
    const again = pieceOutlinePath(pieceEdgesFor(buildBoundaries(3, 4, 777), 1, 1, 3, 4), 100, 60, 10);
    assert.equal(a, again);
  });

  test('a corner piece has exactly two straight edges, an interior piece none', () => {
    const b = buildBoundaries(4, 4, 31337);
    assert.deepEqual(
      Object.values(pieceEdgesFor(b, 0, 0, 4, 4)).filter((e) => e === null).length,
      2
    );
    assert.deepEqual(
      Object.values(pieceEdgesFor(b, 2, 2, 4, 4)).filter((e) => e === null).length,
      0
    );
    // And a piece's own edges are its neighbours' mating edges.
    assert.deepEqual(pieceEdgesFor(b, 2, 2, 4, 4).right, pieceEdgesFor(b, 2, 3, 4, 4).left);
    assert.deepEqual(pieceEdgesFor(b, 2, 2, 4, 4).bottom, pieceEdgesFor(b, 3, 2, 4, 4).top);
  });

  test('every outline parses as SVG path data, whatever the cell size', () => {
    // The bug this guards: `M33 33` was emitted straight into `33 33C…`, which a
    // real parser reads as one number run and rejects — so the clip path drew
    // nothing and the piece was invisible. It only showed up once a picture made
    // the amplitude a whole number, which is why string equality missed it.
    const cases: [number, number][] = [
      [100, 60], // amplitude 10
      [150, 200], // amplitude 33 — a 1200x600 picture cut 8x3
      [96, 96],
      [1400 / 7, 900 / 7],
    ];
    for (const [w, h] of cases) {
      const amp = tabAmplitude(w, h);
      const d = pieceOutlinePath(pieceEdgesFor(buildBoundaries(3, 3, 99), 1, 1, 3, 3), w, h, amp);
      assert.ok(parsesAsPathData(d), `unparseable outline at cell ${w}x${h}: ${d.slice(0, 60)}`);
    }
  });
});

/**
 * Strict path-data parser: every command must have exactly its operands, each a
 * standalone number. `node:test` has no SVG engine, so this stands in for the one
 * that would have caught the bad outline.
 */
function parsesAsPathData(d: string): boolean {
  const arity: Record<string, number> = { M: 2, L: 2, C: 6, Z: 0 };
  let i = 0;
  while (i < d.length) {
    const cmd = d[i]!;
    if (!(cmd in arity)) return false;
    i++;
    for (let n = arity[cmd]!; n > 0; n--) {
      while (d[i] === ' ') i++;
      const num = /^-?\d+(\.\d+)?/.exec(d.slice(i));
      if (!num) return false;
      i += num[0].length;
    }
  }
  return i === d.length;
}

describe('setup', () => {
  test('piece ids are in shuffled order, not solution order', () => {
    const ctx = harness();
    let n = 0;
    const state = jigsawGame.setup(
      { ...ctx, random: () => ((n = (n * 9301 + 49297) % 233280) / 233280) },
      { ...DEFAULT_JIGSAW_SETTINGS, ...IMAGE, imageId: 'img-1' }
    );
    const ids = Object.values(state.pieces).sort((a, b) => traySlotOf(a.id) - traySlotOf(b.id));
    const solutionOrder = ids.every((p, i) => p.id === `p${i}`);
    assert.ok(solutionOrder, 'ids must be numbered in tray order');
    const isIdentity = ids.every((p, i) => p.row === Math.floor(i / state.cols) && p.col === i % state.cols);
    assert.ok(!isIdentity, 'p<i> must NOT be cell <i>, or the view leaks the solution');
  });

  test('pieces start turned, and not in a pattern the id reveals', () => {
    const state = start();
    const rots = new Set(Object.values(state.pieces).map((p) => p.rot));
    assert.ok(rots.size > 1, 'every piece must not start the same way up');
    for (const p of Object.values(state.pieces)) {
      assert.ok(p.rot >= 0 && p.rot <= 3 && Number.isInteger(p.rot));
    }
    // A turn derived from the cell would let a client read the solution off the
    // id, so a different shuffle must not hand the same cell the same turn.
    const other = start(harness(777));
    const turnOf = (s: JigsawMasterState, row: number, col: number) =>
      Object.values(s.pieces).find((p) => p.row === row && p.col === col)!.rot;
    assert.notEqual(turnOf(state, 0, 0), turnOf(other, 0, 0));
  });
});

describe('anti-leak projection', () => {
  test('view contains no solution coordinates', () => {
    const { ctx, state } = beginPlaying();
    const json = JSON.stringify(jigsawGame.getPlayerView(state, 'ana', ctx));
    assert.ok(!json.includes('"row"'), 'view leaked a piece row');
    assert.ok(!json.includes('"col"'), 'view leaked a piece column');
  });

  test('every player sees the same pieces', () => {
    const { ctx, state } = beginPlaying();
    const a = jigsawGame.getPlayerView(state, 'ana', ctx);
    const b = jigsawGame.getPlayerView(state, 'bo', ctx);
    assert.deepEqual(Object.keys(a.pieces), Object.keys(b.pieces));
    assert.equal(a.edgeSeed, b.edgeSeed);
    assert.equal(a.pieceCount, 12);
  });
});

describe('READY_UP', () => {
  test('the last player in starts the clock', () => {
    const ctx = harness();
    let state = start(ctx);
    assert.equal(state.phase, 'READY');
    state = move(state, ctx, 'ana', 'READY_UP');
    assert.equal(state.phase, 'READY');
    assert.equal(state.startedAtMs, null);
    state = move(state, ctx, 'bo', 'READY_UP');
    assert.equal(state.phase, 'PLAYING');
    assert.ok(state.startedAtMs);
  });

  test('a second ready-up is rejected', () => {
    const ctx = harness();
    const state = move(start(ctx), ctx, 'ana', 'READY_UP');
    const v = jigsawGame.validateMove(state, { type: 'READY_UP', playerId: 'ana', payload: {}, timestamp: 1 }, ctx);
    assert.equal(v.valid, false);
  });
});

describe('PLACE_PIECE', () => {
  /** Places a piece and leaves it unrotated, so it can actually solve. */
  const placeSolved = (s: JigsawMasterState, ctx: GameContext, p: JigsawMasterState['pieces'][string], by = 'ana') => {
    const turned = unrotate(s, ctx, p.id, by);
    return move(turned, ctx, by, 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', row: p.row, col: p.col });
  };

  test('a correct drop solves; a wrong drop moves without solving', () => {
    const { ctx, state } = beginPlaying();
    const target = Object.values(state.pieces).find((p) => p.row === 2 && p.col === 3)!;

    let s = move(state, ctx, 'ana', 'PLACE_PIECE', { pieceId: target.id, zone: 'BOARD', row: 1, col: 1 });
    assert.equal(s.pieces[target.id].zone, 'BOARD');
    assert.equal(s.pieces[target.id].solved, false);
    assert.deepEqual(s.pieces[target.id].at, { r: 1, c: 1 });
    assert.equal(s.solvedCount, 0);

    s = placeSolved(s, ctx, target);
    assert.equal(s.pieces[target.id].solved, true);
    assert.equal(s.pieces[target.id].rot, 0);
    assert.equal(s.solvedCount, 1);
    assert.equal(s.players.ana.piecesPlaced, 1);
  });

  test('back to the tray un-solves the piece', () => {
    const { ctx, state } = beginPlaying();
    const p = Object.values(state.pieces).find((x) => !(x.row === 0 && x.col === 0))!;
    const wrong = { row: p.row === 0 ? 1 : 0, col: p.col === 0 ? 1 : 0 };

    let s = move(state, ctx, 'ana', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', ...wrong });
    assert.equal(s.pieces[p.id].solved, false);
    s = placeSolved(s, ctx, p);
    assert.equal(s.solvedCount, 1);

    s = move(s, ctx, 'bo', 'PLACE_PIECE', { pieceId: p.id, zone: 'TRAY' });
    assert.equal(s.pieces[p.id].zone, 'TRAY');
    assert.equal(s.pieces[p.id].at, null);
    assert.equal(s.pieces[p.id].solved, false);
    assert.equal(s.solvedCount, 0);
  });

  test('a solved piece can be picked up again — the count goes back down', () => {
    const { ctx, state } = beginPlaying();
    const p = Object.values(state.pieces).find((x) => x.row === 0 && x.col === 0)!;
    const s = placeSolved(state, ctx, p);
    assert.equal(s.solvedCount, 1);

    const moved = move(s, ctx, 'bo', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', row: 2, col: 2 });
    assert.equal(moved.pieces[p.id].solved, false);
    assert.equal(moved.solvedCount, 0);
    assert.deepEqual(moved.pieces[p.id].at, { r: 2, c: 2 });
    // The piece still counts for whoever placed it. Re-solving is not re-scoring.
    assert.equal(moved.players.ana.piecesPlaced, 1);

    const back = move(moved, ctx, 'bo', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', row: p.row, col: p.col });
    assert.equal(back.solvedCount, 1, 'solving twice is still one solved piece');
    assert.equal(back.players.bo.piecesPlaced, 1);
  });

  test('a second player taking a solved piece away is not rejected', () => {
    // The old engine refused this, which is what made a mistaken placement
    // permanent. Cluster movement depends on it being allowed.
    const { ctx, state } = beginPlaying();
    const p = Object.values(state.pieces).find((x) => x.row === 1 && x.col === 1)!;
    const solved = placeSolved(state, ctx, p);
    const v = jigsawGame.validateMove(solved, {
      type: 'PLACE_PIECE', playerId: 'bo', timestamp: 1,
      payload: { pieceId: p.id, zone: 'BOARD', row: 0, col: 3 },
    }, ctx);
    assert.equal(v.valid, true);
  });

  test('rejects: out-of-range cell, non-integer, unknown piece, bad zone, wrong phase', () => {
    const { ctx, state } = beginPlaying();
    const target = Object.values(state.pieces).find((p) => p.row === 0 && p.col === 0)!;

    const bad = [
      [state, { pieceId: target.id, zone: 'BOARD', row: 99, col: 0 }, 'ana'],
      [state, { pieceId: target.id, zone: 'BOARD', row: -1, col: 0 }, 'ana'],
      [state, { pieceId: target.id, zone: 'BOARD', row: 1.5, col: 0 }, 'ana'],
      [state, { pieceId: 'pZZ', zone: 'TRAY' }, 'ana'],
      [state, { pieceId: target.id, zone: 'FLOOR' }, 'ana'],
      [start(ctx), { pieceId: target.id, zone: 'TRAY' }, 'ana'],
    ] as const;

    for (const [s, payload, playerId] of bad) {
      const v = jigsawGame.validateMove(s, { type: 'PLACE_PIECE', playerId, payload, timestamp: 1 }, ctx);
      assert.equal(v.valid, false, `should have rejected ${JSON.stringify(payload)}`);
    }
  });

  test('an unknown player cannot move', () => {
    const { ctx, state } = beginPlaying();
    const v = jigsawGame.validateMove(state, { type: 'PLACE_PIECE', playerId: 'ghost', payload: {}, timestamp: 1 }, ctx);
    assert.equal(v.valid, false);
  });
});

describe('clusters', () => {
  /** Solves the pieces whose home cells are in `cells`, in one pass. */
  const solveCells = (s: JigsawMasterState, ctx: GameContext, cells: [number, number][]) => {
    let next = s;
    for (const [row, col] of cells) {
      const p = Object.values(next.pieces).find((x) => x.row === row && x.col === col)!;
      next = unrotate(next, ctx, p.id);
      next = move(next, ctx, 'ana', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', row, col });
    }
    return next;
  };

  test('orthogonal solved pieces cluster; a diagonal pair does not', () => {
    const { ctx, state } = beginPlaying();
    const s = solveCells(state, ctx, [[1, 1], [1, 2]]);
    const [a, b] = Object.values(s.pieces).filter((p) => p.solved);
    assert.equal(new Set(clusterOf(s, a.id)).size, 2);
    assert.deepEqual(new Set(clusterOf(s, b.id)), new Set(clusterOf(s, a.id)));

    const d = solveCells(state, ctx, [[0, 0], [1, 1]]);
    const [x, y] = Object.values(d.pieces).filter((p) => p.solved);
    assert.deepEqual(clusterOf(d, x.id), [x.id], 'a shared corner is not a join');
    assert.deepEqual(clusterOf(d, y.id), [y.id]);
  });

  test('a rotated piece is out of its cluster', () => {
    const { ctx, state } = beginPlaying();
    let s = solveCells(state, ctx, [[1, 1], [1, 2]]);
    const [a] = Object.values(s.pieces).filter((p) => p.solved && p.at!.c === 1);
    s = move(s, ctx, 'bo', 'ROTATE_PIECE', { pieceId: a.id });
    assert.equal(s.pieces[a.id].solved, false);
    assert.deepEqual(clusterOf(s, a.id), [a.id]);
    const other = Object.values(s.pieces).find((p) => p.solved)!;
    assert.deepEqual(clusterOf(s, other.id), [other.id], 'the rest stays together');
  });

  test('grabbing one piece of a cluster moves the whole cluster', () => {
    const { ctx, state } = beginPlaying();
    let s = solveCells(state, ctx, [[1, 1], [1, 2], [2, 1]]);
    assert.equal(s.solvedCount, 3);

    const grabbed = Object.values(s.pieces).find((p) => p.solved && p.at!.r === 1 && p.at!.c === 1)!;
    s = move(s, ctx, 'bo', 'PLACE_PIECE', { pieceId: grabbed.id, zone: 'BOARD', row: 0, col: 1 });

    const at = (r: number, c: number) => {
      const p = Object.values(s.pieces).find((x) => x.at?.r === r && x.at?.c === c)!;
      return p;
    };
    assert.deepEqual(at(0, 1).at, { r: 0, c: 1 });
    assert.equal(at(0, 1).id, Object.values(s.pieces).find((x) => x.row === 1 && x.col === 1)!.id);
    assert.equal(at(0, 2).id, Object.values(s.pieces).find((x) => x.row === 1 && x.col === 2)!.id);
    assert.equal(at(1, 1).id, Object.values(s.pieces).find((x) => x.row === 2 && x.col === 1)!.id);
    // Shifted a cell up, so nothing in it is home any more.
    assert.equal(s.solvedCount, 0);
  });

  test('a cluster that would hang off the board is refused whole', () => {
    const { ctx, state } = beginPlaying();
    const s = solveCells(state, ctx, [[0, 0], [1, 0], [2, 0]]);
    const grabbed = Object.values(s.pieces).find((p) => p.solved && p.at!.r === 1)!;
    // Dropping the middle piece one row down would push the bottom one off a
    // 3-row board. Half a cluster has nowhere to go, so the drop is refused.
    const v = jigsawGame.validateMove(s, {
      type: 'PLACE_PIECE', playerId: 'bo', timestamp: 1,
      payload: { pieceId: grabbed.id, zone: 'BOARD', row: 2, col: 0 },
    }, ctx);
    assert.equal(v.valid, false, 'half a cluster would have nowhere to go');
  });

  test('undo puts a whole cluster back at once', () => {
    const { ctx, state } = beginPlaying();
    let s = solveCells(state, ctx, [[1, 1], [1, 2]]);
    const grabbed = Object.values(s.pieces).find((p) => p.solved && p.at!.c === 1)!;
    const pair = new Set(clusterOf(s, grabbed.id));

    s = move(s, ctx, 'bo', 'PLACE_PIECE', { pieceId: grabbed.id, zone: 'BOARD', row: 0, col: 1 });
    s = move(s, ctx, 'bo', 'UNDO');

    for (const id of pair) {
      assert.equal(s.pieces[id].solved, true, `${id} should be solved again`);
    }
    assert.equal(s.solvedCount, 2);
  });

  test('a cluster is never named in a view — membership is the solution', () => {
    const { ctx, state } = beginPlaying();
    const s = solveCells(state, ctx, [[1, 1], [1, 2]]);
    const json = JSON.stringify(jigsawGame.getPlayerView(s, 'ana', ctx));
    for (const leak of ['cluster', 'members', 'group']) {
      assert.equal(json.includes(leak), false, `view leaked ${leak}`);
    }
  });
});

describe('ROTATE_PIECE', () => {
  test('rot cycles 0,1,2,3 and a rotated piece cannot be solved', () => {
    const { ctx, state } = beginPlaying();
    const p = Object.values(state.pieces)[0]!;
    let s = unrotate(state, ctx, p.id);
    s = move(s, ctx, 'ana', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', row: p.row, col: p.col });
    assert.equal(s.pieces[p.id].solved, true, 'home cell, right way up');

    // Three quarter turns: home cell, wrong way up, never solved.
    for (let i = 1; i <= 3; i++) {
      s = move(s, ctx, 'ana', 'ROTATE_PIECE', { pieceId: p.id });
      assert.equal(s.pieces[p.id].rot, i);
      assert.equal(s.pieces[p.id].solved, false, 'at its home cell but turned is not solved');
    }
    assert.equal(s.solvedCount, 0);
    s = move(s, ctx, 'ana', 'ROTATE_PIECE', { pieceId: p.id });
    assert.equal(s.pieces[p.id].rot, 0);
    assert.equal(s.pieces[p.id].solved, true, 'turning it back re-solves it where it stands');
    assert.equal(s.solvedCount, 1);
  });

  test('rotating a piece out of a cluster unsolves it and drops the count', () => {
    const { ctx, state } = beginPlaying();
    let s = state;
    for (const [row, col] of [[1, 1], [1, 2]]) {
      const p = Object.values(s.pieces).find((x) => x.row === row && x.col === col)!;
      s = unrotate(s, ctx, p.id);
      s = move(s, ctx, 'ana', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', row, col });
    }
    assert.equal(s.solvedCount, 2);

    const a = Object.values(s.pieces).find((p) => p.solved && p.at!.c === 1)!;
    s = move(s, ctx, 'ana', 'ROTATE_PIECE', { pieceId: a.id });
    assert.equal(s.solvedCount, 1);
    assert.equal(s.pieces[a.id].solved, false);
  });

  test('rotation is refused before the clock starts, and for an unknown piece', () => {
    const ctx = harness();
    const state = start(ctx);
    const p = Object.values(state.pieces)[0]!;
    assert.equal(jigsawGame.validateMove(state, { type: 'ROTATE_PIECE', playerId: 'ana', payload: { pieceId: p.id }, timestamp: 1 }, ctx).valid, false);
    const { ctx: c2, state: playing } = beginPlaying(ctx);
    assert.equal(jigsawGame.validateMove(playing, { type: 'ROTATE_PIECE', playerId: 'ana', payload: { pieceId: 'pZZ' }, timestamp: 1 }, c2).valid, false);
  });
});

describe('UNDO', () => {
  const wrongCell = (p: JigsawMasterState['pieces'][string]) =>
    p.row === 2 && p.col === 2 ? { row: 0, col: 0 } : { row: 2, col: 2 };

  test('undo puts a wrongly-placed piece back where it came from', () => {
    const { ctx, state } = beginPlaying();
    const p = Object.values(state.pieces).find((x) => x.row === 0 && x.col === 3)!;
    const cell = wrongCell(p);

    let s = move(state, ctx, 'ana', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', ...cell });
    assert.equal(s.pieces[p.id].zone, 'BOARD');
    assert.equal(s.pieces[p.id].at!.r, cell.row);

    s = move(s, ctx, 'ana', 'UNDO');
    assert.equal(s.pieces[p.id].zone, 'TRAY');
    assert.equal(s.pieces[p.id].at, null);
    assert.equal(s.history.length, 0);
  });

  test('undo takes back a correctly-placed piece — solving is no longer a dead end', () => {
    const { ctx, state } = beginPlaying();
    const p = Object.values(state.pieces).find((x) => x.row === 1 && x.col === 1)!;
    let s = move(state, ctx, 'ana', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', row: 0, col: 0 });
    s = unrotate(s, ctx, p.id);
    s = move(s, ctx, 'ana', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', row: 1, col: 1 });
    assert.equal(s.pieces[p.id].solved, true);
    assert.equal(s.solvedCount, 1);

    s = move(s, ctx, 'ana', 'UNDO');
    assert.deepEqual(s.pieces[p.id].at, { r: 0, c: 0 }, 'back to where the mistake was');
    assert.equal(s.pieces[p.id].solved, false);
    assert.equal(s.solvedCount, 0);
  });

  test('undo is per-player: one player cannot take back another player\'s move', () => {
    const { ctx, state } = beginPlaying();
    const p = Object.values(state.pieces).find((x) => x.row === 0 && x.col === 3)!;
    const cell = wrongCell(p);
    const s = move(state, ctx, 'ana', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', ...cell });

    assert.equal(jigsawGame.validateMove(s, { type: 'UNDO', playerId: 'bo', timestamp: 1 }, ctx).valid, false);
    const boView = jigsawGame.getPlayerView(s, 'bo', ctx);
    const anaView = jigsawGame.getPlayerView(s, 'ana', ctx);
    assert.equal(boView.canUndo, false);
    assert.equal(anaView.canUndo, true);
  });

  test('undo walks back through the mover\'s own moves, newest first', () => {
    const { ctx, state } = beginPlaying();
    const a = Object.values(state.pieces).find((x) => x.row === 0 && x.col === 3)!;
    const b = Object.values(state.pieces).find((x) => x.row === 2 && x.col === 0)!;

    let s = move(state, ctx, 'ana', 'PLACE_PIECE', { pieceId: a.id, zone: 'BOARD', ...wrongCell(a) });
    s = move(s, ctx, 'ana', 'PLACE_PIECE', { pieceId: b.id, zone: 'BOARD', ...wrongCell(b) });
    assert.equal(s.history.length, 2);

    s = move(s, ctx, 'ana', 'UNDO');
    assert.equal(s.pieces[b.id].zone, 'TRAY', 'the newest move is taken back');
    assert.equal(s.pieces[a.id].zone, 'BOARD', 'the older one is untouched');

    s = move(s, ctx, 'ana', 'UNDO');
    assert.equal(s.pieces[a.id].zone, 'TRAY');
    assert.equal(jigsawGame.validateMove(s, { type: 'UNDO', playerId: 'ana', timestamp: 1 }, ctx).valid, false);
  });

  test('an entry that is no longer undoable is skipped, not applied wrongly', () => {
    const { ctx, state } = beginPlaying();
    const p = Object.values(state.pieces).find((x) => x.row === 0 && x.col === 3)!;
    // Ana drops it wrong; Bo then picks it up and puts it back in the tray, so
    // Ana's entry describes a position the piece is no longer in.
    let s = move(state, ctx, 'ana', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', ...wrongCell(p) });
    s = move(s, ctx, 'bo', 'PLACE_PIECE', { pieceId: p.id, zone: 'TRAY' });
    assert.equal(jigsawGame.validateMove(s, { type: 'UNDO', playerId: 'ana', timestamp: 1 }, ctx).valid, false);
  });

  test('the history itself never reaches a client', () => {
    const { ctx, state } = beginPlaying();
    const p = Object.values(state.pieces).find((x) => x.row === 0 && x.col === 3)!;
    const s = move(state, ctx, 'ana', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', ...wrongCell(p) });
    const view = jigsawGame.getPlayerView(s, 'ana', ctx);
    assert.equal(JSON.stringify(view).includes('history'), false);
    assert.equal(view.canUndo, true);
  });

  test('undo is refused before the clock starts', () => {
    const ctx = harness();
    const state = start(ctx);
    assert.equal(jigsawGame.validateMove(state, { type: 'UNDO', playerId: 'ana', timestamp: 1 }, ctx).valid, false);
  });
});

describe('completion', () => {
  test('only the completing move ends the game, and the clock starts at READY', () => {
    const ctx = harness();
    const started = Date.now();
    const { state: playing } = beginPlaying(ctx);
    let state = playing;

    for (const p of Object.values(state.pieces)) {
      if (state.phase !== 'PLAYING') break;
      state = unrotate(state, ctx, p.id);
      state = move(state, ctx, 'ana', 'PLACE_PIECE', { pieceId: p.id, zone: 'BOARD', row: p.row, col: p.col });
    }

    assert.equal(state.phase, 'COMPLETED');
    assert.equal(state.solvedCount, 12);
    assert.ok(state.finishedAtMs! >= started);
    assert.ok(state.result);
    assert.equal(state.result!.elapsedMs, state.finishedAtMs! - state.startedAtMs!);

    const end = jigsawGame.checkGameEnd(state, ctx);
    assert.ok(end);
    assert.deepEqual(end!.winners.sort(), ['ana', 'bo']);
  });

  test('checkGameEnd is null while still playing', () => {
    const { ctx, state } = beginPlaying();
    assert.equal(jigsawGame.checkGameEnd(state, ctx), null);
  });
});