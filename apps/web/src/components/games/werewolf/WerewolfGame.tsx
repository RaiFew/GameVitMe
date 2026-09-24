import type { WerewolfPlayerView } from '@party/werewolf';
import { RoleConfigurationScreen } from './RoleConfigurationScreen';
import { PhysicalRoleSelectionScreen } from './PhysicalRoleSelectionScreen';
import { RoleRevealScreen } from './RoleRevealScreen';
import { RoleSelectionScreen } from './RoleSelectionScreen';
import { NightPhaseScreen } from './NightPhaseScreen';
import { DayPhaseScreen } from './DayPhaseScreen';
import { DayVotingScreen } from './DayVotingScreen';
import { ExecutionScreen } from './ExecutionScreen';
import { WerewolfGameOver } from './WerewolfGameOver';

interface WerewolfGameProps {
  playerView: WerewolfPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
}

export function WerewolfGame({
  playerView,
  onAction,
  onReturnLobby,
  onPlayAgain,
}: WerewolfGameProps) {
  const isHost = !!playerView.isHost;

  switch (playerView.phase) {
    case 'ROLE_CONFIGURATION':
      return (
        <RoleConfigurationScreen
          playerView={playerView}
          onAction={onAction}
          isHost={isHost}
        />
      );

    case 'ROLE_ASSIGNMENT':
      return (
        <PhysicalRoleSelectionScreen
          playerView={playerView}
          onAction={onAction}
          isHost={isHost}
        />
      );

    case 'ROLE_REVEAL':
      return (
        <RoleRevealScreen
          playerView={playerView}
          onAction={onAction}
          isHost={isHost}
        />
      );

    case 'ROLE_SELECTION':
      return (
        <RoleSelectionScreen
          playerView={playerView}
          onAction={onAction}
          isHost={isHost}
        />
      );

    case 'NIGHT':
      return (
        <NightPhaseScreen
          playerView={playerView}
          onAction={onAction}
          isHost={isHost}
        />
      );

    case 'DAY_ANNOUNCEMENT':
    case 'DAY_DISCUSSION':
      return (
        <DayPhaseScreen
          playerView={playerView}
          onAction={onAction}
          isHost={isHost}
        />
      );

    case 'DAY_VOTING':
      return (
        <DayVotingScreen
          playerView={playerView}
          onAction={onAction}
          isHost={isHost}
        />
      );

    case 'DAY_EXECUTION':
      return (
        <ExecutionScreen
          playerView={playerView}
          onAction={onAction}
          isHost={isHost}
        />
      );

    case 'GAME_OVER':
      return (
        <WerewolfGameOver
          playerView={playerView}
          onReturnLobby={onReturnLobby}
          onPlayAgain={onPlayAgain}
          isHost={isHost}
        />
      );

    default:
      return (
        <div className="p-8 text-center text-xs font-mono text-zinc-500">
          Unknown phase: {playerView.phase}
        </div>
      );
  }
}
