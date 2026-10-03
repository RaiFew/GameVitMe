import type { RPSBracket, RPSChoice, RPSMatch, RPSMatchLeg, RPSMasterState } from '../types/index.js';

/**
 * Single-elimination bracket.
 *
 * Matches are played strictly in bracket order -- only one is LIVE at a time --
 * so every client can show the same "up next" without negotiating whose turn it
 * is. An odd entrant gets a BYE: the match is recorded and the seated player
 * advances untouched, so they are not charged a life for a match they never threw.
 */

let matchCounter = 0;
const nextMatchId = () => `m${++matchCounter}`;

/**
 * Standard recursive bracket seeding, so the strongest seed meets the weakest
 * as late as possible rather than in the first round.
 */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const span = order.length * 2;
    const next: number[] = [];
    for (const s of order) {
      next.push(s, span + 1 - s);
    }
    order = next;
  }
  return order;
}

function makeMatch(
  roundIndex: number,
  playerAId: string | null,
  playerBId: string | null
): RPSMatch {
  return {
    id: nextMatchId(),
    roundIndex,
    playerAId,
    playerBId,
    legs: [],
    // One empty slot is a BYE; two empty slots would be a match nobody can
    // fill, which only happens in a bracket fed from a dead end.
    status: !playerAId || !playerBId ? 'BYE' : 'PENDING',
    winnerId: null,
  };
}

/** Settles every BYE in a round and returns the ids advancing out of it. */
export function resolveByes(matches: RPSMatch[]): string[] {
  for (const m of matches) {
    if (m.status === 'BYE') {
      m.winnerId = m.playerAId ?? m.playerBId ?? null;
    }
  }
  return matches.map((m) => m.winnerId).filter((id): id is string => !!id);
}

export function buildFirstRound(playerIds: string[], roundIndex = 0): RPSMatch[] {
  // Seeding needs a power of two; padding with nulls is what produces the BYEs,
  // so an entrant is never handed a walkover they did not earn by being seeded
  // past the field size.
  const size = Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, playerIds.length))));
  const slots: (string | null)[] = new Array(size).fill(null);
  playerIds.forEach((id, i) => {
    slots[seedOrder(size)[i]! - 1] = id;
  });

  const matches: RPSMatch[] = [];
  for (let i = 0; i < size; i += 2) {
    matches.push(makeMatch(roundIndex, slots[i] ?? null, slots[i + 1] ?? null));
  }
  return matches;
}

export function buildNextRound(advancingIds: string[], roundIndex: number): RPSMatch[] {
  const matches: RPSMatch[] = [];
  for (let i = 0; i < advancingIds.length; i += 2) {
    matches.push(makeMatch(roundIndex, advancingIds[i] ?? null, advancingIds[i + 1] ?? null));
  }
  return matches;
}

export function isRoundComplete(matches: RPSMatch[]): boolean {
  return matches.every((m) => m.status === 'DONE' || m.status === 'BYE');
}

export function findMatch(state: RPSMasterState): RPSMatch | null {
  if (!state.bracket || !state.currentMatchId) return null;
  for (const round of state.bracket.rounds) {
    for (const m of round) {
      if (m.id === state.currentMatchId) return m;
    }
  }
  return null;
}

export function recordLeg(
  match: RPSMatch,
  choices: Record<string, RPSChoice>,
  winnerId: string | null
): RPSMatchLeg {
  return {
    index: match.legs.length,
    choices,
    winnerId,
    isTie: winnerId === null,
  };
}

/**
 * Applies a thrown leg: a loss costs a life, and a player out of lives loses
 * the match. A tie costs nothing and the match simply throws again.
 */
export function applyLegOutcome(
  state: RPSMasterState,
  match: RPSMatch,
  leg: RPSMatchLeg
): { state: RPSMasterState; matchOver: boolean } {
  const players = { ...state.players };

  if (leg.winnerId) {
    const loserId = match.playerAId === leg.winnerId ? match.playerBId : match.playerAId;
    if (loserId && players[loserId]) {
      players[loserId] = { ...players[loserId]!, lives: Math.max(0, players[loserId]!.lives - 1) };
    }
  }

  const matchOver =
    !!leg.winnerId &&
    [match.playerAId, match.playerBId].some(
      (id) => !!id && players[id]!.lives <= 0
    );

  return {
    state: { ...state, players },
    matchOver,
  };
}

/**
 * Rolls the winners of a finished round into the next round, or crowns the
 * champion. The caller marks the match it just settled as DONE, so this only
 * acts once the whole round really is over.
 */
export function advanceBracket(state: RPSMasterState): RPSBracket {
  const bracket = state.bracket!;
  const rounds = bracket.rounds.map((r) => r.map((m) => ({ ...m })));
  const currentRound = rounds[bracket.currentRoundIndex]!;

  if (!isRoundComplete(currentRound)) return bracket;

  const advancing = resolveByes(currentRound);

  // One entrant left standing ends the tournament; a round that advances nobody
  // (everyone knocked out in the same round) is treated the same way so the room
  // cannot hang on an unfinishable bracket.
  if (advancing.length <= 1) {
    return { ...bracket, rounds, championId: advancing[0] ?? null };
  }

  rounds.push(buildNextRound(advancing, bracket.currentRoundIndex + 1));
  return { ...bracket, rounds, currentRoundIndex: bracket.currentRoundIndex + 1, championId: null };
}

/** Moves the bracket onto the next match to play, or crowns a champion. */
export function startNextMatch(state: RPSMasterState): RPSMasterState {
  const bracket = state.bracket!;
  const rounds = bracket.rounds.map((r) => r.map((m) => ({ ...m })));

  // Resolve the live match inside the clone -- mutating the pre-clone matches
  // would leave the stored bracket with nothing marked LIVE.
  const live =
    (rounds[bracket.currentRoundIndex] ?? []).find((m) => m.status === 'PENDING') ?? null;
  if (live) live.status = 'LIVE';

  const updated: RPSBracket = {
    ...bracket,
    rounds,
    championId: bracket.championId,
  };

  return {
    ...state,
    bracket: updated,
    currentMatchId: live ? live.id : null,
    phase: live ? 'CHOOSING' : 'GAME_OVER',
  };
}

/** Both fighters of the live match, in seat order. */
export function currentMatchPlayers(state: RPSMasterState): string[] {
  const m = findMatch(state);
  if (!m) return [];
  return [m.playerAId, m.playerBId].filter((id): id is string => !!id);
}

export function resetMatchCounter(): void {
  matchCounter = 0;
}
