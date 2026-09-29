import { NIGHT_ROLE, type SalemMasterState, type SalemPlayerView } from '../types/index.js';

/**
 * The only data a client ever receives. Both night targets live in master
 * state and are copied in here for the player who holds the claim — so the
 * Witch's target, the Constable's target, and both claim tokens are invisible
 * to everyone else, the Host included.
 */
export function projectSalemPlayerView(
  state: SalemMasterState,
  playerId: string
): SalemPlayerView {
  const me = state.players.find((p) => p.id === playerId);

  const view: SalemPlayerView = {
    phase: state.phase,
    roundNumber: state.roundNumber,
    isHost: !!me?.isHost,
    canPlay: !!me && !me.isHost && me.isAlive,
    me: {
      id: me?.id ?? playerId,
      displayName: me?.displayName ?? 'Player',
      isAlive: me?.isAlive ?? false,
    },
    players: state.players.map((p) => ({
      id: p.id,
      seatNumber: p.seatNumber,
      displayName: p.displayName,
      isAlive: p.isAlive,
      isConnected: p.isConnected,
      isHost: p.isHost,
      canPlay: p.canPlay,
    })),
  };

  const actingRole = NIGHT_ROLE[state.phase];
  if (actingRole) {
    const claim = state.night.claims[actingRole];
    const iAmTheActor = claim?.playerId === playerId;
    const targetId =
      actingRole === 'WITCH'
        ? state.night.witchTargetPlayerId
        : state.night.constableProtectionPlayerId;

    view.night = {
      actingRole,
      claimed: !!claim,
      iHaveClaimed: iAmTheActor,
      hasActed: iAmTheActor && targetId !== null,
      myTargetId: iAmTheActor ? targetId : null,
    };
  }

  if (
    state.phase === 'MORNING' ||
    state.phase === 'CONFESSION' ||
    state.phase === 'RESOLUTION'
  ) {
    view.outcome = { result: state.night.result, deadPlayerIds: state.night.deadPlayerIds };
  }

  if (state.phase === 'GAME_OVER' && state.gameOverData) {
    view.gameOverData = state.gameOverData;
  }

  return view;
}
