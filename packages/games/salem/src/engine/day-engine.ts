import type { SalemPlayerState } from '../types/index.js';

export interface DayTallyResult {
  eliminatedPlayerId: string | null;
  isTie: boolean;
  voteCounts: Record<string, number>;
}

export function tallyDayVotes(
  players: SalemPlayerState[],
  votes: Record<string, string>
): DayTallyResult {
  const livingPlayers = players.filter((p) => p.isAlive && p.canPlay !== false);
  const voteCounts: Record<string, number> = {};

  for (const voterId of Object.keys(votes)) {
    const targetId = votes[voterId];
    if (!targetId || targetId === 'SKIP') continue;
    const voter = livingPlayers.find((p) => p.id === voterId);
    if (!voter) continue;
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  }

  let maxVotes = 0;
  let topCandidateId: string | null = null;
  let isTie = false;

  for (const [candidateId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      topCandidateId = candidateId;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  }

  return {
    eliminatedPlayerId: isTie ? null : topCandidateId,
    isTie,
    voteCounts,
  };
}
