import { useState, useEffect } from 'react';
import type { RPSPlayerView, RPSChoice } from '@party/rock-paper-scissors';
import { Swords, RotateCcw, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '../../ui/Button';

interface Props {
  playerView: RPSPlayerView;
  onNextRound: () => void;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
}

function getChoiceEmoji(choice: RPSChoice | null): string {
  switch (choice) {
    case 'ROCK':
      return '🪨';
    case 'PAPER':
      return '📄';
    case 'SCISSORS':
      return '✂️';
    default:
      return '❓';
  }
}

function getChoiceLabel(choice: RPSChoice | null): string {
  switch (choice) {
    case 'ROCK':
      return 'ROCK / ค้อน';
    case 'PAPER':
      return 'PAPER / กระดาษ';
    case 'SCISSORS':
      return 'SCISSORS / กรรไกร';
    default:
      return 'READY';
  }
}

export function RPSFightingScreen({
  playerView,
  onNextRound,
  onReturnLobby,
  onPlayAgain,
}: Props) {
  const {
    phase,
    roundNumber,
    targetScore,
    roundExpiresAt,
    players,
    lastRoundOutcome,
    winnerIds,
    winReason,
  } = playerView;

  const player1 = players[0];
  const player2 = players[1];

  const p1Score = player1?.score || 0;
  const p2Score = player2?.score || 0;

  // Local timer calculation
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!roundExpiresAt || phase !== 'CHOOSING') {
      setSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const remainingMs = Math.max(0, roundExpiresAt - Date.now());
      setSecondsRemaining(Math.ceil(remainingMs / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [roundExpiresAt, phase]);

  const isChoosing = phase === 'CHOOSING';
  const isGameOver = phase === 'GAME_OVER';
  const isTie = lastRoundOutcome?.isTie;

  const p1WonRound = !isChoosing && lastRoundOutcome?.winnerIds.includes(player1?.id || '');
  const p2WonRound = !isChoosing && lastRoundOutcome?.winnerIds.includes(player2?.id || '');

  const p1Choice = player1?.choice || null;
  const p2Choice = player2?.choice || null;

  return (
    <div className="relative min-h-[580px] w-full bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white rounded-xs border-2 border-zinc-800 shadow-2xl overflow-hidden flex flex-col justify-between p-4 sm:p-6 select-none font-sans">
      {/* Background Fighting Grid Pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Top Arcade Header Bar */}
      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500 text-black font-black font-mono text-[10px] uppercase tracking-widest rounded-xs shadow-xs">
              TV STAGE
            </span>
            <span className="text-zinc-400 font-mono text-xs font-bold uppercase tracking-wider">
              ARCADE DUEL • 1 ON 1
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-zinc-400 font-bold uppercase">
              First to <span className="text-amber-400 font-black">{targetScore}</span> Wins
            </span>
            <span className="px-2 py-0.5 border border-zinc-700 bg-zinc-800/80 rounded-xs text-[10px] text-zinc-300">
              Host Screen
            </span>
          </div>
        </div>

        {/* Health & Score HUD */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-center pt-2">
          {/* Player 1 Health & Round Circles */}
          <div className="col-span-3 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-black text-sm sm:text-base tracking-wider uppercase text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] truncate">
                {player1?.displayName || 'PLAYER 1'}
              </span>
              <span className="font-mono font-black text-xs text-zinc-400">
                P1
              </span>
            </div>

            {/* Health / Score Bar */}
            <div className="h-4 sm:h-5 bg-zinc-950 border border-cyan-500/50 rounded-xs overflow-hidden p-0.5 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-white rounded-xs transition-all duration-500"
                style={{ width: `${Math.min(100, (p1Score / targetScore) * 100)}%` }}
              />
            </div>

            {/* Round Win Circles ("แต้มแบบ กลม ๆ") */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase mr-1">
                WINS:
              </span>
              {Array.from({ length: targetScore }).map((_, i) => {
                const isWon = i < p1Score;
                return (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                      isWon
                        ? 'border-amber-400 bg-amber-400 shadow-[0_0_10px_#f59e0b] scale-110'
                        : 'border-zinc-700 bg-zinc-900/90'
                    }`}
                  >
                    {isWon && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center VS & Timer */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            {secondsRemaining !== null && isChoosing ? (
              <div className="flex flex-col items-center">
                <div
                  className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 flex items-center justify-center font-mono font-black text-lg sm:text-xl shadow-lg transition-all ${
                    secondsRemaining <= 3
                      ? 'border-red-500 bg-red-950/80 text-red-400 animate-pulse ring-4 ring-red-500/30'
                      : 'border-amber-500 bg-zinc-900 text-amber-400'
                  }`}
                >
                  {secondsRemaining}
                </div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase mt-0.5">
                  TIME
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-amber-500 bg-zinc-950 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                  <Swords className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                </div>
                <span className="text-[9px] font-mono font-black text-amber-400 uppercase mt-0.5">
                  R{roundNumber}
                </span>
              </div>
            )}
          </div>

          {/* Player 2 Health & Round Circles */}
          <div className="col-span-3 space-y-1.5 text-right">
            <div className="flex items-baseline justify-between flex-row-reverse">
              <span className="font-black text-sm sm:text-base tracking-wider uppercase text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)] truncate">
                {player2?.displayName || 'PLAYER 2'}
              </span>
              <span className="font-mono font-black text-xs text-zinc-400">
                P2
              </span>
            </div>

            {/* Health / Score Bar */}
            <div className="h-4 sm:h-5 bg-zinc-950 border border-rose-500/50 rounded-xs overflow-hidden p-0.5 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
              <div
                className="h-full bg-gradient-to-l from-rose-600 via-rose-400 to-white rounded-xs transition-all duration-500 ml-auto"
                style={{ width: `${Math.min(100, (p2Score / targetScore) * 100)}%` }}
              />
            </div>

            {/* Round Win Circles ("แต้มแบบ กลม ๆ") */}
            <div className="flex items-center justify-end gap-1.5 pt-0.5">
              {Array.from({ length: targetScore }).map((_, i) => {
                const isWon = i < p2Score;
                return (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                      isWon
                        ? 'border-amber-400 bg-amber-400 shadow-[0_0_10px_#f59e0b] scale-110'
                        : 'border-zinc-700 bg-zinc-900/90'
                    }`}
                  >
                    {isWon && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </div>
                );
              })}
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase ml-1">
                :WINS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Clash Stage (Center Fighting Arena) */}
      <div className="relative z-10 my-auto py-6">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
          {/* Fighter 1 Stance Box */}
          <div className="md:col-span-3 flex flex-col items-center">
            <div
              className={`w-40 h-40 sm:w-48 sm:h-48 rounded-xs border-2 transition-all duration-500 flex flex-col items-center justify-center relative ${
                p1WonRound
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_30px_rgba(34,211,238,0.4)] scale-105'
                  : 'border-zinc-700 bg-zinc-900/60'
              }`}
            >
              {p1WonRound && (
                <span className="absolute -top-3 px-2 py-0.5 bg-cyan-500 text-black font-mono font-black text-[10px] uppercase tracking-widest rounded-xs shadow-md">
                  ROUND WINNER ⚡
                </span>
              )}

              {isChoosing ? (
                player1?.hasChosen ? (
                  <div className="flex flex-col items-center animate-pulse">
                    <div className="w-16 h-16 rounded-full border-2 border-cyan-400 bg-cyan-500/20 flex items-center justify-center text-cyan-300 text-2xl font-black font-mono">
                      ✓
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-400 mt-2 uppercase tracking-widest">
                      LOCKED IN
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-600 flex items-center justify-center text-zinc-500 text-2xl animate-spin">
                      ⚡
                    </div>
                    <span className="text-xs font-mono font-bold text-zinc-500 mt-2 uppercase tracking-widest">
                      CHARGING...
                    </span>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-6xl sm:text-7xl drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-bounce">
                    {getChoiceEmoji(p1Choice)}
                  </span>
                  <span className="text-xs font-mono font-black text-cyan-300 mt-3 uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded-xs border border-cyan-500/40">
                    {getChoiceLabel(p1Choice)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Center Dynamic Collision Badge */}
          <div className="md:col-span-1 flex flex-col items-center justify-center text-center">
            {isChoosing ? (
              <div className="flex flex-col items-center space-y-1">
                <span className="text-2xl sm:text-3xl animate-pulse">⚡</span>
                <span className="font-mono font-black text-[10px] uppercase tracking-widest text-zinc-400">
                  CHOOSE!
                </span>
              </div>
            ) : isTie ? (
              <div className="flex flex-col items-center space-y-1">
                <span className="text-3xl animate-bounce">🤝</span>
                <span className="font-mono font-black text-xs uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-xs border border-amber-500">
                  DRAW!
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-1">
                <span className="text-3xl sm:text-4xl animate-pulse">💥</span>
                <span className="font-mono font-black text-xs uppercase tracking-widest text-amber-400 bg-black/80 px-2 py-0.5 rounded-xs border border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                  CLASH!
                </span>
              </div>
            )}
          </div>

          {/* Fighter 2 Stance Box */}
          <div className="md:col-span-3 flex flex-col items-center">
            <div
              className={`w-40 h-40 sm:w-48 sm:h-48 rounded-xs border-2 transition-all duration-500 flex flex-col items-center justify-center relative ${
                p2WonRound
                  ? 'border-rose-400 bg-rose-950/40 shadow-[0_0_30px_rgba(251,113,133,0.4)] scale-105'
                  : 'border-zinc-700 bg-zinc-900/60'
              }`}
            >
              {p2WonRound && (
                <span className="absolute -top-3 px-2 py-0.5 bg-rose-500 text-black font-mono font-black text-[10px] uppercase tracking-widest rounded-xs shadow-md">
                  ROUND WINNER ⚡
                </span>
              )}

              {isChoosing ? (
                player2?.hasChosen ? (
                  <div className="flex flex-col items-center animate-pulse">
                    <div className="w-16 h-16 rounded-full border-2 border-rose-400 bg-rose-500/20 flex items-center justify-center text-rose-300 text-2xl font-black font-mono">
                      ✓
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-400 mt-2 uppercase tracking-widest">
                      LOCKED IN
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-600 flex items-center justify-center text-zinc-500 text-2xl animate-spin">
                      ⚡
                    </div>
                    <span className="text-xs font-mono font-bold text-zinc-500 mt-2 uppercase tracking-widest">
                      CHARGING...
                    </span>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-6xl sm:text-7xl drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-bounce">
                    {getChoiceEmoji(p2Choice)}
                  </span>
                  <span className="text-xs font-mono font-black text-rose-300 mt-3 uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded-xs border border-rose-500/40">
                    {getChoiceLabel(p2Choice)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Outcome Banner at Center Stage */}
        {!isChoosing && lastRoundOutcome && (
          <div className="mt-6 text-center space-y-1">
            <div className="inline-block px-4 py-2 rounded-xs border-2 border-amber-500/80 bg-zinc-950/90 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-amber-300">
                {lastRoundOutcome.description}
              </h3>
            </div>
          </div>
        )}

        {/* Game Over Banner */}
        {isGameOver && (
          <div className="mt-6 text-center space-y-2">
            <div className="inline-block px-6 py-3 rounded-xs border-2 border-amber-400 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black font-black text-xl sm:text-2xl uppercase tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-pulse">
              🏆 {winnerIds.includes(player1?.id || '') ? player1?.displayName : player2?.displayName} IS THE CHAMPION! 🏆
            </div>
            {winReason && (
              <p className="text-xs font-mono font-bold text-zinc-400">
                {winReason}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Host TV Bottom Control Bar */}
      <div className="relative z-10 border-t border-zinc-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/80 px-3 py-2 rounded-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
            Host Moderator TV Broadcast Active
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isGameOver ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={onReturnLobby}
                className="text-xs font-bold uppercase tracking-wider flex-1 sm:flex-initial"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Return to Lobby
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={onPlayAgain}
                className="text-xs font-bold uppercase tracking-wider flex-1 sm:flex-initial"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Rematch
              </Button>
            </>
          ) : (
            <>
              {phase === 'ROUND_RESULT' && (
                <Button
                  size="sm"
                  onClick={onNextRound}
                  className="text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black w-full sm:w-auto shadow-md"
                >
                  Next Round →
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={onReturnLobby}
                className="text-xs font-bold uppercase tracking-wider w-full sm:w-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Lobby
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
