import type { CodenamesPlayerView } from '@party/codenames';
import { TeamSetupScreen } from './TeamSetupScreen';
import { CodenamesBoard } from './CodenamesBoard';
import { ClueController } from './ClueController';
import { CodenamesGameOver } from './CodenamesGameOver';
import { TurnHistory } from './TurnHistory';
import { GameTimer } from '../spyfall/GameTimer';
import { Card } from '../../ui/Card';
import { Eye, Crosshair } from 'lucide-react';

interface Props {
  playerView: CodenamesPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
}

export function CodenamesGame({ playerView, onAction, onReturnLobby, onPlayAgain }: Props) {
  const isHost = !!playerView.me.isHost;
  const { phase, me, currentTeam, redRemaining, blueRemaining, cards } = playerView;

  if (phase === 'TEAM_SETUP') {
    return <TeamSetupScreen playerView={playerView} onAction={onAction} isHost={isHost} />;
  }

  if (phase === 'GAME_OVER') {
    return (
      <CodenamesGameOver
        playerView={playerView}
        onReturnLobby={onReturnLobby}
        onPlayAgain={onPlayAgain}
        isHost={isHost}
      />
    );
  }

  const isSpymaster = me.role === 'SPYMASTER';
  const isRedTurn = currentTeam === 'RED';

  // Stamped on the state by the server, so a client that reconnects mid-turn
  // shows the same remaining time as everyone else rather than restarting.
  const showTimer = playerView.turnExpiresAt != null && playerView.turnExpiresAt > 0;

  const handleSelectCard = (cardId: string) => {
    onAction('SELECT_CARD', { cardId });
  };

  const handleSubmitClue = (word: string, number: number) => {
    onAction('SUBMIT_CLUE', { word, number });
  };

  const handleEndGuessing = () => {
    onAction('END_GUESSING');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      {/* Top Match HUD */}
      {playerView.gameMode === 'TWO_PLAYER' ? (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-rule pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="border border-emerald-600 bg-emerald-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
                2-Player Cooperative
              </span>
              <span className="text-xs font-mono text-ink-muted">
                You are playing together
              </span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-ink">
              Your Team
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Found agents counter */}
            <div className="px-4 py-2 rounded-xs border-2 border-rule-strong bg-canvas-sunk text-center min-w-[100px]">
              <span className="text-[9px] font-mono uppercase font-bold text-ink-muted block">Agents Found</span>
              <span className="text-2xl font-black font-mono text-ink">
                {playerView.cooperativeScore?.found ?? (9 - redRemaining)} / 9
              </span>
            </div>

            {/* Remaining */}
            <div className="px-4 py-2 rounded-xs border border-rule text-center min-w-[80px]">
              <span className="text-[9px] font-mono uppercase font-bold text-ink-muted block">Remaining</span>
              <span className="text-2xl font-black font-mono text-ink">{redRemaining}</span>
            </div>

            {/* Mistakes */}
            <div className="px-4 py-2 rounded-xs border border-rule text-center min-w-[80px]">
              <span className="text-[9px] font-mono uppercase font-bold text-ink-muted block">Mistakes</span>
              <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {playerView.mistakesMade || 0}
              </span>
            </div>

            {/* Player's personal role */}
            <div className="border border-rule bg-canvas-sunk px-3 py-2 rounded-xs text-xs font-mono font-bold flex items-center gap-2">
              {isSpymaster ? <Eye size={16} /> : <Crosshair size={16} />}
              <div className="text-left">
                <span className="text-[9px] text-ink-muted block uppercase">Your Role</span>
                <span className="text-ink uppercase">{me.role}</span>
              </div>
            </div>

            {showTimer && (
              <div className="flex flex-col items-end gap-0.5">
                <GameTimer expiresAt={playerView.turnExpiresAt!} inline />
                <span className="text-[9px] font-mono uppercase font-bold text-ink-faint">
                  {playerView.timerKind === 'CLUE' ? 'To give a clue' : 'To guess'}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-rule pb-4">
          {/* Score Counters */}
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xs border-2 ${
              isRedTurn
                ? 'border-red-600 bg-red-600 text-white ring-2 ring-red-400'
                : 'border-red-600/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
            }`}>
              <span className="text-[9px] font-mono uppercase font-bold block opacity-80">Red Remaining</span>
              <span className="text-2xl font-black font-mono">{redRemaining}</span>
            </div>

            <span className="text-xs font-mono font-bold text-ink-faint">VS</span>

            <div className={`px-4 py-2 rounded-xs border-2 ${
              !isRedTurn
                ? 'border-blue-600 bg-blue-600 text-white ring-2 ring-blue-400'
                : 'border-blue-600/50 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400'
            }`}>
              <span className="text-[9px] font-mono uppercase font-bold block opacity-80">Blue Remaining</span>
              <span className="text-2xl font-black font-mono">{blueRemaining}</span>
            </div>
          </div>

          {/* Current Turn & Role Indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[9px] font-mono uppercase font-bold text-ink-muted block">
                Active Turn
              </span>
              <span className={`text-sm font-black uppercase font-mono px-2 py-0.5 rounded-xs border ${
                isRedTurn
                  ? 'border-red-600 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20'
                  : 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20'
              }`}>
                {currentTeam} Team Turn
              </span>
            </div>

            {me.team && (
              <div className="border border-rule bg-canvas-sunk px-3 py-1.5 rounded-xs text-xs font-mono font-bold flex items-center gap-1.5">
                {isSpymaster ? <Eye size={14} /> : <Crosshair size={14} />}
                <span>
                  {me.team} {me.role}
                </span>
              </div>
            )}

            {showTimer && (
              <div className="flex flex-col items-end gap-0.5">
                <GameTimer expiresAt={playerView.turnExpiresAt!} inline />
                <span className="text-[9px] font-mono uppercase font-bold text-ink-faint">
                  {playerView.timerKind === 'CLUE' ? 'To give a clue' : 'To guess'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clue Controller Form / Active Clue Banner */}
      <ClueController
        playerView={playerView}
        onSubmitClue={handleSubmitClue}
        onEndGuessing={handleEndGuessing}
      />

      {/* 5x5 Game Board */}
      <CodenamesBoard
        cards={cards}
        isSpymaster={isSpymaster}
        canGuess={me.canGuess}
        onSelectCard={handleSelectCard}
      />

      <div className="flex flex-wrap gap-x-6 gap-y-2 border border-rule rounded-xs bg-canvas px-4 py-3">
        {(['RED', 'BLUE'] as const).map((team) => (
          <div key={team} className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded-xs border ${
              team === 'RED'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-blue-600 text-blue-600 dark:text-blue-400'
            }`}>
              {team}
            </span>
            {playerView.players
              .filter((p) => p.team === team)
              .map((p) => (
                <span
                  key={p.id}
                  className={`text-[11px] font-mono uppercase ${
                    p.id === me.id ? 'text-ink font-bold' : 'text-ink-muted'
                  }`}
                >
                  {p.displayName}
                  <span className="text-ink-faint">
                    {' '}
                    {p.role === 'SPYMASTER' ? '(sm)' : p.role === 'OPERATIVE' ? '(op)' : ''}
                  </span>
                </span>
              ))}
          </div>
        ))}
      </div>

      <TurnHistory playerView={playerView} />
    </div>
  );
}
