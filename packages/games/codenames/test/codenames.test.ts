import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { GameContext } from '@party/game-engine';
import {
  codenamesGame,
  DEFAULT_CODENAMES_SETTINGS,
  parseWordFileContent,
  generateCodenamesBoard,
} from '../src/index.js';

function createMockContext(players: { id: string; displayName: string }[]): GameContext {
  let rngSeed = 42;
  return {
    roomId: 'test-room',
    gameSessionId: 'test-session',
    players: players.map((p, idx) => ({
      id: p.id,
      seatNumber: idx + 1,
      displayName: p.displayName,
      isConnected: true,
    })),
    random: () => {
      rngSeed = (rngSeed * 9301 + 49297) % 233280;
      return rngSeed / 233280;
    },
    broadcast: () => {},
    emitToPlayer: () => {},
    scheduleTimer: () => {},
    clearTimer: () => {},
  };
}

describe('Codenames Engine & Word File System', () => {
  describe('Word File Parser', () => {
    test('parses valid TXT format with normalization and deduplication', () => {
      const txtContent = `
        apple
        BANANA
        Apple
        cherry
        date
        elderberry
        fig
        grape
        honeydew
        kiwi
        lemon
        mango
        nectarine
        orange
        papaya
        quince
        raspberry
        strawberry
        tangerine
        ugli
        vanilla
        watermelon
        xigua
        yam
        zucchini
        extra_word
      `;

      const result = parseWordFileContent('fruits.txt', txtContent);
      assert.equal(result.success, true);
      assert.equal(result.format, 'TXT');
      assert.ok(result.wordCount && result.wordCount >= 25);
      // Apple and apple should be deduplicated to one APPLE
      const appleCount = result.words?.filter((w) => w === 'APPLE').length;
      assert.equal(appleCount, 1);
    });

    test('parses valid CSV format', () => {
      const words = Array.from({ length: 30 }, (_, i) => `WORD_${i}`);
      const csvContent = words.join(', ');

      const result = parseWordFileContent('dictionary.csv', csvContent);
      assert.equal(result.success, true);
      assert.equal(result.format, 'CSV');
      assert.equal(result.wordCount, 30);
    });

    test('parses valid JSON array or object format', () => {
      const words = Array.from({ length: 28 }, (_, i) => `ITEM_${i}`);
      const jsonContent = JSON.stringify({ words });

      const result = parseWordFileContent('custom.json', jsonContent);
      assert.equal(result.success, true);
      assert.equal(result.format, 'JSON');
      assert.equal(result.wordCount, 28);
    });

    test('rejects unsupported file extensions', () => {
      const result = parseWordFileContent('words.pdf', 'some content');
      assert.equal(result.success, false);
      assert.match(result.error || '', /Unsupported file format/);
    });

    test('rejects empty files or files with insufficient words (< 25)', () => {
      const smallContent = 'ONE\nTWO\nTHREE';
      const result = parseWordFileContent('too_small.txt', smallContent);
      assert.equal(result.success, false);
      assert.match(result.error || '', /at least 25 are required/);
    });
  });

  describe('Board Generator', () => {
    test('generates exactly 25 cards with 9/8/7/1 distribution', () => {
      const words = Array.from({ length: 50 }, (_, i) => `CARD_WORD_${i}`);
      const board = generateCodenamesBoard(words, () => 0.2);

      assert.equal(board.cards.length, 25);

      const redCount = board.cards.filter((c) => c.color === 'RED').length;
      const blueCount = board.cards.filter((c) => c.color === 'BLUE').length;
      const neutralCount = board.cards.filter((c) => c.color === 'NEUTRAL').length;
      const assassinCount = board.cards.filter((c) => c.color === 'ASSASSIN').length;

      assert.equal(neutralCount, 7);
      assert.equal(assassinCount, 1);

      if (board.startingTeam === 'RED') {
        assert.equal(redCount, 9);
        assert.equal(blueCount, 8);
      } else {
        assert.equal(blueCount, 9);
        assert.equal(redCount, 8);
      }

      // All card words must be unique
      const uniqueWords = new Set(board.cards.map((c) => c.word));
      assert.equal(uniqueWords.size, 25);
    });
  });

  describe('Game Lifecycle & Flow', () => {
    const playerList = [
      { id: 'host-1', displayName: 'Host / Red Spymaster' },
      { id: 'p1', displayName: 'Red Operative' },
      { id: 'p2', displayName: 'Blue Spymaster' },
      { id: 'p3', displayName: 'Blue Operative' },
    ];

    test('Setup enters TEAM_SETUP and allows role assignment', () => {
      const ctx = createMockContext(playerList);
      let state = codenamesGame.setup(ctx, {
        ...DEFAULT_CODENAMES_SETTINGS,
        hostPlayerId: 'host-1',
      });

      assert.equal(state.phase, 'TEAM_SETUP');
      assert.equal(state.players.length, 4);

      // Assign teams and roles
      state = codenamesGame.processMove(
        state,
        { type: 'ASSIGN_TEAM_ROLE', playerId: 'host-1', payload: { targetPlayerId: 'host-1', team: 'RED', role: 'SPYMASTER' }, timestamp: Date.now() },
        ctx
      ).newState!;
      state = codenamesGame.processMove(
        state,
        { type: 'ASSIGN_TEAM_ROLE', playerId: 'p1', payload: { targetPlayerId: 'p1', team: 'RED', role: 'OPERATIVE' }, timestamp: Date.now() },
        ctx
      ).newState!;
      state = codenamesGame.processMove(
        state,
        { type: 'ASSIGN_TEAM_ROLE', playerId: 'p2', payload: { targetPlayerId: 'p2', team: 'BLUE', role: 'SPYMASTER' }, timestamp: Date.now() },
        ctx
      ).newState!;
      state = codenamesGame.processMove(
        state,
        { type: 'ASSIGN_TEAM_ROLE', playerId: 'p3', payload: { targetPlayerId: 'p3', team: 'BLUE', role: 'OPERATIVE' }, timestamp: Date.now() },
        ctx
      ).newState!;

      // Verify cannot assign two spymasters to the same team
      const duplicateSpymasterRes = codenamesGame.validateMove(
        state,
        { type: 'ASSIGN_TEAM_ROLE', playerId: 'p1', payload: { targetPlayerId: 'p1', team: 'RED', role: 'SPYMASTER' }, timestamp: Date.now() },
        ctx
      );
      assert.equal(duplicateSpymasterRes.valid, false);

      // Host starts match
      const startRes = codenamesGame.processMove(
        state,
        { type: 'START_MATCH', playerId: 'host-1', payload: {}, timestamp: Date.now() },
        ctx
      );
      assert.equal(startRes.success, true);
      state = startRes.newState!;

      assert.equal(state.phase, 'CLUE');
      assert.equal(state.cards.length, 25);
    });

    test('Anti-Cheat State Masking: Spymaster sees colors, Operatives do not until revealed', () => {
      const ctx = createMockContext(playerList);
      let state = codenamesGame.setup(ctx, { ...DEFAULT_CODENAMES_SETTINGS, hostPlayerId: 'host-1' });

      // Assign and start
      state.players[0]!.team = 'RED'; state.players[0]!.role = 'SPYMASTER';
      state.players[1]!.team = 'RED'; state.players[1]!.role = 'OPERATIVE';
      state.players[2]!.team = 'BLUE'; state.players[2]!.role = 'SPYMASTER';
      state.players[3]!.team = 'BLUE'; state.players[3]!.role = 'OPERATIVE';

      state = codenamesGame.processMove(state, { type: 'START_MATCH', playerId: 'host-1', payload: {}, timestamp: Date.now() }, ctx).newState!;

      // 1. Spymaster view
      const spymasterView = codenamesGame.getPlayerView(state, 'host-1', ctx);
      assert.ok(spymasterView.cards.every((c) => c.color !== undefined));

      // 2. Operative view (ALL unrevealed cards MUST have undefined color)
      const operativeView = codenamesGame.getPlayerView(state, 'p1', ctx);
      assert.ok(operativeView.cards.every((c) => c.color === undefined));
    });

    test('Clue submission and Operative guessing mechanics', () => {
      const ctx = createMockContext(playerList);
      let state = codenamesGame.setup(ctx, { ...DEFAULT_CODENAMES_SETTINGS, hostPlayerId: 'host-1' });

      state.players[0]!.team = 'RED'; state.players[0]!.role = 'SPYMASTER';
      state.players[1]!.team = 'RED'; state.players[1]!.role = 'OPERATIVE';
      state.players[2]!.team = 'BLUE'; state.players[2]!.role = 'SPYMASTER';
      state.players[3]!.team = 'BLUE'; state.players[3]!.role = 'OPERATIVE';

      state = codenamesGame.processMove(state, { type: 'START_MATCH', playerId: 'host-1', payload: {}, timestamp: Date.now() }, ctx).newState!;

      // Force startingTeam to RED for deterministic testing
      state.startingTeam = 'RED';
      state.currentTeam = 'RED';
      state.phase = 'CLUE';

      // 1. Spymaster gives clue: "OCEAN", 2
      const clueRes = codenamesGame.processMove(
        state,
        { type: 'SUBMIT_CLUE', playerId: 'host-1', payload: { word: 'OCEAN', number: 2 }, timestamp: Date.now() },
        ctx
      );
      assert.equal(clueRes.success, true);
      state = clueRes.newState!;

      assert.equal(state.phase, 'GUESSING');
      assert.equal(state.currentClue?.word, 'OCEAN');
      assert.equal(state.guessesRemaining, 3); // 2 + 1 bonus guess

      // Find a RED card, a NEUTRAL card, and an ASSASSIN card
      const redCard = state.cards.find((c) => c.color === 'RED')!;
      const neutralCard = state.cards.find((c) => c.color === 'NEUTRAL')!;
      const assassinCard = state.cards.find((c) => c.color === 'ASSASSIN')!;

      // 2. Red Operative guesses correctly
      const guess1 = codenamesGame.processMove(
        state,
        { type: 'SELECT_CARD', playerId: 'p1', payload: { cardId: redCard.id }, timestamp: Date.now() },
        ctx
      );
      assert.equal(guess1.success, true);
      state = guess1.newState!;

      // Card is now revealed
      assert.equal(state.cards.find((c) => c.id === redCard.id)?.revealed, true);
      assert.equal(state.phase, 'GUESSING'); // Continues turn because it was correct
      assert.equal(state.guessesRemaining, 2);

      // In Operative view, the revealed card NOW has color, while others still do not!
      const opViewAfterReveal = codenamesGame.getPlayerView(state, 'p1', ctx);
      const revealedCardInView = opViewAfterReveal.cards.find((c) => c.id === redCard.id)!;
      assert.equal(revealedCardInView.color, 'RED');
      const unrevealedCardInView = opViewAfterReveal.cards.find((c) => c.id === neutralCard.id)!;
      assert.equal(unrevealedCardInView.color, undefined);

      // 3. Operative guesses NEUTRAL -> Turn ends immediately!
      const guess2 = codenamesGame.processMove(
        state,
        { type: 'SELECT_CARD', playerId: 'p1', payload: { cardId: neutralCard.id }, timestamp: Date.now() },
        ctx
      );
      assert.equal(guess2.success, true);
      state = guess2.newState!;

      assert.equal(state.phase, 'CLUE');
      assert.equal(state.currentTeam, 'BLUE'); // Switched to opposing team

      // 4. Blue Spymaster gives clue
      state = codenamesGame.processMove(
        state,
        { type: 'SUBMIT_CLUE', playerId: 'p2', payload: { word: 'SKY', number: 1 }, timestamp: Date.now() },
        ctx
      ).newState!;
      assert.equal(state.phase, 'GUESSING');

      // 5. Blue Operative hits ASSASSIN -> Immediate loss! Red wins!
      const assassinGuess = codenamesGame.processMove(
        state,
        { type: 'SELECT_CARD', playerId: 'p3', payload: { cardId: assassinCard.id }, timestamp: Date.now() },
        ctx
      );
      assert.equal(assassinGuess.success, true);
      state = assassinGuess.newState!;

      assert.equal(state.phase, 'GAME_OVER');
      assert.equal(state.winner, 'RED');
      assert.equal(state.winReason, 'ASSASSIN_TRIGGERED');

      // In GAME_OVER, all cards are unmasked for all players
      const finalView = codenamesGame.getPlayerView(state, 'p3', ctx);
      assert.ok(finalView.cards.every((c) => c.color !== undefined));
    });
  });

  describe('2-Player Cooperative Mode', () => {
    const twoPlayers = [
      { id: 'player-a', displayName: 'Player A' },
      { id: 'player-b', displayName: 'Player B' },
    ];

    test('Setup initializes players on RED team and supports SWAP_ROLES', () => {
      const ctx = createMockContext(twoPlayers);
      let state = codenamesGame.setup(ctx, {
        ...DEFAULT_CODENAMES_SETTINGS,
        gameMode: 'TWO_PLAYER',
        hostPlayerId: 'player-a',
      });

      assert.equal(state.gameMode, 'TWO_PLAYER');
      assert.equal(state.phase, 'TEAM_SETUP');
      assert.equal(state.players.length, 2);
      assert.equal(state.players[0]?.role, 'SPYMASTER');
      assert.equal(state.players[1]?.role, 'OPERATIVE');
      assert.equal(state.players[0]?.team, 'RED');
      assert.equal(state.players[1]?.team, 'RED');

      // Swap roles
      const swapRes = codenamesGame.processMove(
        state,
        { type: 'SWAP_ROLES', playerId: 'player-a', timestamp: Date.now() },
        ctx
      );
      assert.equal(swapRes.success, true);
      state = swapRes.newState!;
      assert.equal(state.players[0]?.role, 'OPERATIVE');
      assert.equal(state.players[1]?.role, 'SPYMASTER');

      // Swap back
      state = codenamesGame.processMove(
        state,
        { type: 'SWAP_ROLES', playerId: 'player-b', timestamp: Date.now() },
        ctx
      ).newState!;
      assert.equal(state.players[0]?.role, 'SPYMASTER');
      assert.equal(state.players[1]?.role, 'OPERATIVE');
    });

    test('START_MATCH validates player count and role completeness', () => {
      // 1 player cannot start
      const ctx1 = createMockContext([{ id: 'p1', displayName: 'Solo' }]);
      const state1 = codenamesGame.setup(ctx1, {
        ...DEFAULT_CODENAMES_SETTINGS,
        gameMode: 'TWO_PLAYER',
      });
      const check1 = codenamesGame.validateMove(state1, { type: 'START_MATCH', playerId: 'p1', timestamp: Date.now() }, ctx1);
      assert.equal(check1.valid, false);

      // 3 players cannot start 2-player mode
      const ctx3 = createMockContext([
        { id: 'p1', displayName: 'P1' },
        { id: 'p2', displayName: 'P2' },
        { id: 'p3', displayName: 'P3' },
      ]);
      const state3 = codenamesGame.setup(ctx3, {
        ...DEFAULT_CODENAMES_SETTINGS,
        gameMode: 'TWO_PLAYER',
      });
      const check3 = codenamesGame.validateMove(state3, { type: 'START_MATCH', playerId: 'p1', timestamp: Date.now() }, ctx3);
      assert.equal(check3.valid, false);
      assert.match(check3.error || '', /requires exactly 2 players/);
    });

    test('Full cooperative turn flow, mistakes, pass, and win condition', () => {
      const ctx = createMockContext(twoPlayers);
      let state = codenamesGame.setup(ctx, {
        ...DEFAULT_CODENAMES_SETTINGS,
        gameMode: 'TWO_PLAYER',
        hostPlayerId: 'player-a',
      });

      // Start match
      const startRes = codenamesGame.processMove(
        state,
        { type: 'START_MATCH', playerId: 'player-a', timestamp: Date.now() },
        ctx
      );
      assert.equal(startRes.success, true);
      state = startRes.newState!;

      assert.equal(state.phase, 'CLUE');
      assert.equal(state.currentTeam, 'RED');
      assert.equal(state.redRemaining, 9);
      assert.equal(state.mistakesMade, 0);

      // Information hiding: Operative sees undefined colors, Spymaster sees full solution
      const opView = codenamesGame.getPlayerView(state, 'player-b', ctx);
      assert.equal(opView.gameMode, 'TWO_PLAYER');
      assert.ok(opView.cards.every((c) => c.color === undefined));
      assert.deepEqual(opView.cooperativeScore, { found: 0, total: 9, mistakes: 0, remaining: 9 });

      const spyView = codenamesGame.getPlayerView(state, 'player-a', ctx);
      assert.ok(spyView.cards.every((c) => c.color !== undefined));

      // 1. Spymaster submits clue
      const clueRes = codenamesGame.processMove(
        state,
        { type: 'SUBMIT_CLUE', playerId: 'player-a', payload: { word: 'OCEAN', number: 2 }, timestamp: Date.now() },
        ctx
      );
      assert.equal(clueRes.success, true);
      state = clueRes.newState!;
      assert.equal(state.phase, 'GUESSING');
      assert.equal(state.guessesRemaining, 3); // N + 1

      // 2. Operative guesses friendly card
      const friendlyCard = state.cards.find((c) => c.color === 'RED')!;
      const guess1 = codenamesGame.processMove(
        state,
        { type: 'SELECT_CARD', playerId: 'player-b', payload: { cardId: friendlyCard.id }, timestamp: Date.now() },
        ctx
      );
      assert.equal(guess1.success, true);
      state = guess1.newState!;
      assert.equal(state.redRemaining, 8);
      assert.equal(state.phase, 'GUESSING');
      assert.equal(state.guessesRemaining, 2);

      const opViewMid = codenamesGame.getPlayerView(state, 'player-b', ctx);
      assert.equal(opViewMid.cooperativeScore?.found, 1);
      assert.equal(opViewMid.cooperativeScore?.remaining, 8);

      // 3. Operative passes turn
      const passRes = codenamesGame.processMove(
        state,
        { type: 'END_GUESSING', playerId: 'player-b', timestamp: Date.now() },
        ctx
      );
      assert.equal(passRes.success, true);
      state = passRes.newState!;
      // Remains on RED team, goes to CLUE for the same Spymaster!
      assert.equal(state.phase, 'CLUE');
      assert.equal(state.currentTeam, 'RED');

      // 4. Spymaster gives next clue
      state = codenamesGame.processMove(
        state,
        { type: 'SUBMIT_CLUE', playerId: 'player-a', payload: { word: 'FOREST', number: 1 }, timestamp: Date.now() },
        ctx
      ).newState!;
      assert.equal(state.phase, 'GUESSING');

      // 5. Operative guesses neutral card -> mistake! ends turn, back to CLUE on RED
      const neutralCard = state.cards.find((c) => c.color === 'NEUTRAL' && !c.revealed)!;
      state = codenamesGame.processMove(
        state,
        { type: 'SELECT_CARD', playerId: 'player-b', payload: { cardId: neutralCard.id }, timestamp: Date.now() },
        ctx
      ).newState!;
      assert.equal(state.phase, 'CLUE');
      assert.equal(state.currentTeam, 'RED');
      assert.equal(state.mistakesMade, 1);

      // 6. Spymaster gives next clue
      state = codenamesGame.processMove(
        state,
        { type: 'SUBMIT_CLUE', playerId: 'player-a', payload: { word: 'SPACE', number: 1 }, timestamp: Date.now() },
        ctx
      ).newState!;

      // 7. Operative guesses opposing decoy card (BLUE) -> mistake! decrements blue, ends turn, back to CLUE on RED
      const blueCard = state.cards.find((c) => c.color === 'BLUE' && !c.revealed)!;
      state = codenamesGame.processMove(
        state,
        { type: 'SELECT_CARD', playerId: 'player-b', payload: { cardId: blueCard.id }, timestamp: Date.now() },
        ctx
      ).newState!;
      assert.equal(state.phase, 'CLUE');
      assert.equal(state.currentTeam, 'RED');
      assert.equal(state.mistakesMade, 2);
      assert.equal(state.blueRemaining, 7);

      // 8. Find all remaining friendly cards to verify cooperative victory
      const unrevealedFriendly = state.cards.filter((c) => c.color === 'RED' && !c.revealed);
      for (const card of unrevealedFriendly) {
        // Spymaster submits clue with enough guesses
        state = codenamesGame.processMove(
          state,
          { type: 'SUBMIT_CLUE', playerId: 'player-a', payload: { word: 'TARGET', number: 1 }, timestamp: Date.now() },
          ctx
        ).newState!;

        state = codenamesGame.processMove(
          state,
          { type: 'SELECT_CARD', playerId: 'player-b', payload: { cardId: card.id }, timestamp: Date.now() },
          ctx
        ).newState!;

        if (state.phase === 'GUESSING') {
          state = codenamesGame.processMove(
            state,
            { type: 'END_GUESSING', playerId: 'player-b', timestamp: Date.now() },
            ctx
          ).newState!;
        }
      }

      assert.equal(state.redRemaining, 0);
      assert.equal(state.phase, 'GAME_OVER');
      assert.equal(state.winner, 'RED');
      assert.equal(state.winReason, 'ALL_CARDS_FOUND');

      const endResult = codenamesGame.checkGameEnd(state, ctx);
      assert.ok(endResult);
      assert.equal(endResult.isEnded, true);
      assert.deepEqual(endResult.winners, ['player-a', 'player-b']);
      assert.equal(endResult.data?.isWon, true);
    });

    test('Assassin card triggers immediate cooperative loss', () => {
      const ctx = createMockContext(twoPlayers);
      let state = codenamesGame.setup(ctx, {
        ...DEFAULT_CODENAMES_SETTINGS,
        gameMode: 'TWO_PLAYER',
        hostPlayerId: 'player-a',
      });

      state = codenamesGame.processMove(
        state,
        { type: 'START_MATCH', playerId: 'player-a', timestamp: Date.now() },
        ctx
      ).newState!;

      state = codenamesGame.processMove(
        state,
        { type: 'SUBMIT_CLUE', playerId: 'player-a', payload: { word: 'DANGER', number: 1 }, timestamp: Date.now() },
        ctx
      ).newState!;

      const assassinCard = state.cards.find((c) => c.color === 'ASSASSIN')!;
      const guessRes = codenamesGame.processMove(
        state,
        { type: 'SELECT_CARD', playerId: 'player-b', payload: { cardId: assassinCard.id }, timestamp: Date.now() },
        ctx
      );
      assert.equal(guessRes.success, true);
      state = guessRes.newState!;

      assert.equal(state.phase, 'GAME_OVER');
      assert.equal(state.winReason, 'ASSASSIN_TRIGGERED');
      assert.equal(state.winner, null);

      const endResult = codenamesGame.checkGameEnd(state, ctx);
      assert.ok(endResult);
      assert.equal(endResult.isEnded, true);
      assert.deepEqual(endResult.winners, []);
      assert.equal(endResult.data?.isWon, false);
    });
  });
});
