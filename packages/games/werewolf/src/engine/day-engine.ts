import type { WerewolfPlayerState } from '../types/index.js';

export interface VoteTallyResult {
  votesCount: Record<string, number>;
  eliminatedPlayerId: string | null;
  isTie: boolean;
  totalVotesCast: number;
}

export function tallyDayVotes(
  players: WerewolfPlayerState[],
  votes: Record<string, string>
): VoteTallyResult {
  const alivePlayerIds = new Set(players.filter((p) => p.isAlive).map((p) => p.id));
  const counts: Record<string, number> = {};
  let totalVotes = 0;

  for (const [voterId, targetId] of Object.entries(votes)) {
    if (!alivePlayerIds.has(voterId)) continue;
    if (targetId === 'SKIP' || alivePlayerIds.has(targetId)) {
      counts[targetId] = (counts[targetId] || 0) + 1;
      totalVotes++;
    }
  }

  let maxVotes = 0;
  let candidates: string[] = [];

  for (const [targetId, count] of Object.entries(counts)) {
    if (targetId === 'SKIP') continue;
    if (count > maxVotes) {
      maxVotes = count;
      candidates = [targetId];
    } else if (count === maxVotes) {
      candidates.push(targetId);
    }
  }

  const isTie = candidates.length > 1;
  const skipCount = counts['SKIP'] || 0;
  const eliminatedPlayerId =
    !isTie && candidates.length === 1 && maxVotes > skipCount ? candidates[0]! : null;

  return {
    votesCount: counts,
    eliminatedPlayerId,
    isTie,
    totalVotesCast: totalVotes,
  };
}
