import type { SalemPlayerView } from '@party/salem';
import { SalemRoleConfigurationScreen } from './SalemRoleConfigurationScreen';
import { SalemPhysicalRoleSelectionScreen } from './SalemPhysicalRoleSelectionScreen';
import { SalemRoleRevealScreen } from './SalemRoleRevealScreen';
import { SalemRoleSelectionScreen } from './SalemRoleSelectionScreen';
import { SalemNightPhaseScreen } from './SalemNightPhaseScreen';
import { SalemDayPhaseScreen } from './SalemDayPhaseScreen';
import { SalemDayVotingScreen } from './SalemDayVotingScreen';
import { SalemExecutionScreen } from './SalemExecutionScreen';
import { SalemGameOverScreen } from './SalemGameOver';

interface Props {
  playerView: SalemPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
}

export function SalemGame({ playerView, onAction, onReturnLobby, onPlayAgain }: Props) {
  const isHost = !!playerView.isHost;

  switch (playerView.phase) {
    case 'ROLE_CONFIGURATION':
      return <SalemRoleConfigurationScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
    case 'ROLE_ASSIGNMENT':
      return <SalemPhysicalRoleSelectionScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
    case 'ROLE_REVEAL':
      return <SalemRoleRevealScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
    case 'ROLE_SELECTION':
      return <SalemRoleSelectionScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
    case 'NIGHT':
      return <SalemNightPhaseScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
    case 'DAY_ANNOUNCEMENT':
    case 'DAY_DISCUSSION':
      return <SalemDayPhaseScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
    case 'DAY_VOTING':
      return <SalemDayVotingScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
    case 'DAY_EXECUTION':
      return <SalemExecutionScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
    case 'GAME_OVER':
      return <SalemGameOverScreen playerView={playerView} onReturnLobby={onReturnLobby} onPlayAgain={onPlayAgain} isHost={isHost} />;
    default:
      return null;
  }
}
