import type { SpyfallMasterState, SpyfallPlayerView, SpyfallPlayerViewVoting } from './state.js';
import { SpyfallPhase } from './state.js';
import type { GameContext } from '@party/game-engine';

/**
 * Project master state into a per-player view.
 * This is the CRITICAL anti-cheat layer:
 * - The spy must never see the location during the game.
 * - Non-spies (and the Host!) must never see the spy's identity until game over.
 */
export function projectPlayerView(
  state: SpyfallMasterState,
  playerId: string,
  ctx: GameContext,
): SpyfallPlayerView {
  const isSpy = state.spyPlayerId === playerId;
  const isGameOver = state.phase === SpyfallPhase.GAME_OVER;
  const isHost = state.hostMode && state.hostPlayerId === playerId;
  const canPlay = !isHost;

  // Build player list with display names from context
  const currentVoterId = state.voting
    ? state.voting.order[state.voting.currentVoterIndex] ?? null
    : null;

  const players = state.playerOrder.map((pid) => {
    const contextPlayer = ctx.players.find((p) => p.id === pid);
    const isThisHost = state.hostMode && pid === state.hostPlayerId;
    return {
      id: pid,
      displayName: contextPlayer?.displayName ?? 'Player',
      isConnected: contextPlayer?.isConnected ?? true,
      hasVoted: state.voting ? state.voting.votes[pid] !== undefined : false,
      isCurrentVoter: pid === currentVoterId,
      isHost: isThisHost,
      canPlay: !isThisHost,
    };
  });

  const voting: SpyfallPlayerViewVoting | null = state.voting
    ? {
        accusedPlayerId: state.voting.accusedPlayerId,
        currentVoterId,
        currentVoterIndex: state.voting.currentVoterIndex,
        totalVoters: state.voting.order.length,
        votesCount: Object.keys(state.voting.votes).length,
        hasVoted: state.voting.votes[playerId] !== undefined,
        voterOrder: state.voting.order,
      }
    : null;

  return {
    phase: state.phase,
    hostMode: state.hostMode,
    isHost,
    canPlay,
    isSpy,
    // CRITICAL: Spy and Host (during game) do not see the location
    location: (isSpy || (isHost && !isGameOver)) ? null : state.selectedLocation,
    // Host has 'Host' role; Spy has 'Spy' role
    myRole: isHost ? 'Host' : isSpy ? 'Spy' : (state.playerRoles[playerId] ?? 'Player'),
    allLocations: state.allLocations,
    currentQuestionerId: state.currentQuestionerId,
    currentAnswererId: state.currentAnswererId,
    previousQuestionerId: state.previousQuestionerId,
    roundStartedAt: state.roundStartedAt,
    roundExpiresAt: state.roundExpiresAt,
    accuserId: state.accuserId,
    accusedPlayerId: state.accusedPlayerId,
    hasUsedIndictment: !!state.indictmentUsed[playerId],
    voting,
    players,
    gameOverData: isGameOver ? state.gameOverData : null,
  };
}
