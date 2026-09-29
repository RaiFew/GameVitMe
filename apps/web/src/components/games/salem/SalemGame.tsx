import type { SalemPlayerView } from '@party/salem';
import { SalemSetupScreen } from './SalemSetupScreen';
import { SalemNightScreen } from './SalemNightScreen';
import { SalemDaylightScreen } from './SalemDaylightScreen';
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
    case 'LOBBY':
      return <SalemSetupScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
    case 'NIGHT_WITCH':
    case 'NIGHT_CONSTABLE':
      return <SalemNightScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
    case 'MORNING':
    case 'CONFESSION':
    case 'RESOLUTION':
      return <SalemDaylightScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
    case 'GAME_OVER':
      return (
        <SalemGameOverScreen
          playerView={playerView}
          onReturnLobby={onReturnLobby}
          onPlayAgain={onPlayAgain}
          isHost={isHost}
        />
      );
    default:
      return null;
  }
}
