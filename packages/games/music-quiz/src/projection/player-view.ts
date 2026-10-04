import type { MusicQuizMasterState, MusicQuizPlayerView } from '../types/index.js';

/**
 * The whole point of the projection: while a round is ANSWERING, the view names
 * the track's *provider id* — the key the client needs to fetch the audio — and
 * nothing else. No title, no artist, no index. The question is unanswerable
 * from the view; it can only be answered by listening.
 *
 * The title and artist appear at REVEAL, and `correctIndex` never appears before
 * it either, so a client that reads the whole view mid-round still learns nothing
 * beyond "there is a clip to play".
 */
export function projectMusicQuizPlayerView(
  state: MusicQuizMasterState,
  playerId: string,
  nowMs: number
): MusicQuizPlayerView {
  const me = state.players[playerId];
  const revealed = state.phase === 'REVEAL';

  return {
    roomId: state.roomId,
    phase: state.phase,
    roundNumber: state.roundNumber,
    totalRounds: state.totalRounds,
    serverNow: nowMs,
    questionType: state.settings.questionType,
    excerptSeconds: state.settings.excerptSeconds,
    choices: state.round.choices,
    playbackStartAtMs: state.round.playbackStartAtMs,
    questionDeadlineMs: state.round.questionDeadlineMs,
    audio: {
      provider: state.round.track.provider,
      providerId: state.round.track.providerId,
    },
    myAnswerIndex: state.round.answers[playerId]?.index ?? null,
    myScore: me?.score ?? 0,
    scoreboard: Object.values(state.players)
      .map((p) => ({
        playerId: p.playerId,
        displayName: p.displayName,
        score: p.score,
        correctCount: p.correctCount,
      }))
      .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName)),
    revealed: revealed
      ? {
          correctIndex: state.round.correctIndex,
          title: state.round.track.title,
          artist: state.round.track.artist,
          fastestPlayerId: state.round.fastestPlayerId,
        }
      : null,
    winners: state.winnerPlayerIds,
  };
}
