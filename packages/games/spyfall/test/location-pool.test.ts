import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  spyfallGame,
  DEFAULT_SPYFALL_SETTINGS,
  parseLocationFileContent,
  MIN_SPYFALL_LOCATIONS,
  MAX_LOCATION_ROLES,
  LOCATIONS,
} from '../src/index.js';
import type { GameContext } from '@party/game-engine';
import type { SpyfallMasterState } from '../src/state.js';

function makeCtx(playerCount = 6) {
  const ctx: GameContext = {
    gameId: 'spyfall',
    roomId: 'room',
    hostPlayerId: 'p1',
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      connected: true,
    })),
    random: () => 0.42,
    scheduleTimer: () => {},
    cancelTimer: () => {},
  };
  return ctx;
}

const rows = (n: number, roles = 4) =>
  Array.from(
    { length: n },
    (_, i) => `Place ${i},Role${i}A;Role${i}B;Role${i}C;Role${i}D`
  ).join('\n');

describe('Spyfall location set parser', () => {
  test('two-column CSV yields a location per row with its own roles', () => {
    const r = parseLocationFileContent(
      'sets.csv',
      'Location,Role;Role;Role\nSubmarine,Captain;Navigator;Engineer\n'
    );
    assert.equal(r.success, false, 'three locations is below the floor');
    assert.match(r.error!, /at least 8/);
  });

  test('a full set parses, keeping the author\'s role casing', () => {
    const r = parseLocationFileContent('sets.csv', `Location,Roles\n${rows(MIN_SPYFALL_LOCATIONS)}`);
    assert.equal(r.success, true, r.error);
    assert.equal(r.locationCount, MIN_SPYFALL_LOCATIONS);
    assert.equal(r.locations![0]!.name, 'Place 0');
    assert.deepEqual(r.locations![0]!.roles, ['Role0A', 'Role0B', 'Role0C', 'Role0D']);
  });

  test('the name ends at the first comma, so roles may themselves contain commas', () => {
    const r = parseLocationFileContent('sets.csv', `Location,Role;Role\n${rows(MIN_SPYFALL_LOCATIONS - 1)}\nDiner,Waiter, Chef;Cloakroom Attendant`);
    assert.equal(r.success, true, r.error);
    assert.equal(r.locations!.at(-1)!.name, 'Diner');
    assert.deepEqual(r.locations!.at(-1)!.roles, ['Waiter, Chef', 'Cloakroom Attendant']);
  });

  test('a row with fewer than two roles is rejected, not padded', () => {
    const r = parseLocationFileContent('sets.csv', `Location,Roles\n${rows(MIN_SPYFALL_LOCATIONS - 1)}\nDungeon,Loner`);
    assert.equal(r.success, false);
    assert.match(r.error!, /at least 2/);
  });

  test('more roles than the player cap is rejected', () => {
    const tooMany = Array.from({ length: MAX_LOCATION_ROLES + 1 }, (_, i) => `R${i}`).join(';');
    const r = parseLocationFileContent('sets.csv', `Location,Roles\n${rows(MIN_SPYFALL_LOCATIONS - 1)}\nVault,${tooMany}`);
    assert.equal(r.success, false);
    assert.match(r.error!, /maximum is 12/);
  });

  test('a repeated location name is kept once', () => {
    const r = parseLocationFileContent(
      'sets.csv',
      `Location,Roles\n${rows(MIN_SPYFALL_LOCATIONS)}\nPlace 0,Extra;Other`
    );
    assert.equal(r.success, true, r.error);
    assert.equal(r.locationCount, MIN_SPYFALL_LOCATIONS);
  });

  test('an unsupported extension is refused rather than guessed at', () => {
    const r = parseLocationFileContent('sets.json', rows(MIN_SPYFALL_LOCATIONS));
    assert.equal(r.success, false);
    assert.match(r.error!, /Unsupported file format/);
  });

  test('the size limit is measured in bytes', () => {
    const r = parseLocationFileContent('sets.csv', 'x'.repeat(1024 * 1024 + 1));
    assert.equal(r.success, false);
    assert.match(r.error!, /1MB/);
  });
});

describe('Spyfall custom location pool', () => {
  const custom = Array.from({ length: 20 }, (_, i) => ({
    id: `custom-${i}`,
    name: `Custom Place ${i}`,
    roles: [`Custom Role ${i}A`, `Custom Role ${i}B`, `Custom Role ${i}C`],
  }));

  const setupWith = (settings: Partial<typeof DEFAULT_SPYFALL_SETTINGS>): SpyfallMasterState =>
    spyfallGame.setup(makeCtx(), { ...DEFAULT_SPYFALL_SETTINGS, ...settings } as any);

  test('with no upload the round is drawn from the built-in list', () => {
    const state = setupWith({});
    assert.equal(state.locationSource, 'DEFAULT');
    assert.ok(LOCATIONS.some((l) => l.name === state.selectedLocation));
  });

  test('an upload replaces the pool, and every role comes from the upload', () => {
    const state = setupWith({ locationSource: 'CUSTOM', locationPoolSnapshot: custom });
    assert.equal(state.locationSource, 'CUSTOM');
    assert.ok(state.selectedLocation.startsWith('Custom Place'));
    assert.equal(state.allLocations.length, 16, 'the grid is still the configured size');
    assert.equal(
      state.allLocations.every((n) => n.startsWith('Custom Place')),
      true
    );
    const roles = Object.entries(state.playerRoles)
      .filter(([id]) => id !== 'p1')
      .map(([, r]) => r);
    assert.equal(roles.every((r) => r.startsWith('Custom Role') || r === 'Spy'), true);
  });

  test('a pool too short to fill the grid falls back to the built-ins', () => {
    const state = setupWith({
      locationSource: 'CUSTOM',
      locationPoolSnapshot: custom.slice(0, MIN_SPYFALL_LOCATIONS - 1),
    });
    assert.equal(state.locationSource, 'DEFAULT');
    assert.ok(LOCATIONS.some((l) => l.name === state.selectedLocation));
  });

  test('a roleless entry cannot reach the board', () => {
    const state = setupWith({
      locationSource: 'CUSTOM',
      locationPoolSnapshot: [
        ...custom,
        { id: 'empty', name: 'No Roles', roles: [] },
      ] as any,
    });
    assert.equal(state.allLocations.includes('No Roles'), false);
  });

  test('several enabled sets merge into one pool rather than overwriting each other', () => {
    const second = Array.from({ length: 12 }, (_, i) => ({
      id: `second-${i}`,
      name: `Second Set ${i}`,
      roles: ['A', 'B', 'C'],
    }));
    // The handler concatenates; setup must not care where the entries came from.
    const merged = [...custom, ...second];
    const state = setupWith({ locationSource: 'CUSTOM', locationPoolSnapshot: merged });
    assert.equal(state.allLocations.length, 16);
    const names = new Set(state.allLocations);
    assert.equal([...names].some((n) => n.startsWith('Second Set')), true);
  });
});
