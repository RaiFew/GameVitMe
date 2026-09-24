import type { CodenamesPlayerView } from '@party/codenames';
import { TeamSetupScreen } from './TeamSetupScreen';
import { CodenamesBoard } from './CodenamesBoard';
import { ClueController } from './ClueController';
import { CodenamesGameOver } from './CodenamesGameOver';
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="border border-emerald-600 bg-emerald-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider rounded-xs">
                2-Player Cooperative
              </span>
              <span className="text-xs font-mono text-zinc-500">
                You are playing together
              </span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
              Your Team
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Found agents counter */}
            <div className="px-4 py-2 rounded-xs border-2 border-black dark:border-white bg-zinc-50 dark:bg-zinc-900 text-center min-w-[100px]">
              <span className="text-[9px] font-mono uppercase font-bold text-zinc-500 block">Agents Found</span>
              <span className="text-2xl font-black font-mono text-black dark:text-white">
                {playerView.cooperativeScore?.found ?? (9 - redRemaining)} / 9
              </span>
            </div>

            {/* Remaining */}
            <div className="px-4 py-2 rounded-xs border border-zinc-300 dark:border-zinc-700 text-center min-w-[80px]">
              <span className="text-[9px] font-mono uppercase font-bold text-zinc-500 block">Remaining</span>
              <span className="text-2xl font-black font-mono text-black dark:text-white">{redRemaining}</span>
            </div>

            {/* Mistakes */}
            <div className="px-4 py-2 rounded-xs border border-zinc-300 dark:border-zinc-700 text-center min-w-[80px]">
              <span className="text-[9px] font-mono uppercase font-bold text-zinc-500 block">Mistakes</span>
              <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {playerView.mistakesMade || 0}
              </span>
            </div>

            {/* Player's personal role */}
            <div className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 px-3 py-2 rounded-xs text-xs font-mono font-bold flex items-center gap-2">
              {isSpymaster ? <Eye size={16} /> : <Crosshair size={16} />}
              <div className="text-left">
                <span className="text-[9px] text-zinc-500 block uppercase">Your Role</span>
                <span className="text-black dark:text-white uppercase">{me.role}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
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

            <span className="text-xs font-mono font-bold text-zinc-400">VS</span>

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
              <span className="text-[9px] font-mono uppercase font-bold text-zinc-500 block">
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
              <div className="border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-xs text-xs font-mono font-bold flex items-center gap-1.5">
                {isSpymaster ? <Eye size={14} /> : <Crosshair size={14} />}
                <span>
                  {me.team} {me.role}
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
    </div>
  );
}
