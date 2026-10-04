import { useEffect, useRef, useState } from 'react';
import type { MusicQuizPlayerView } from '@party/music-quiz';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Play, RefreshCw, Music4, Volume2 } from 'lucide-react';
import { useClipPlayer } from './useClipPlayer';

interface Props {
  playerView: MusicQuizPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  onReturnLobby: () => void;
  onPlayAgain: () => void;
}

const QUESTION_PROMPTS = {
  TITLE: 'Which song is this?',
  ARTIST: 'Who sings this?',
  BOTH: 'Which song and artist is this?',
} as const;

export function MusicQuizGame({ playerView, onAction, onReturnLobby, onPlayAgain }: Props) {
  const { phase, choices, roundNumber, totalRounds, revealed, myAnswerIndex, serverNow } = playerView;
  const { state, error, peaks, needsGesture, play, retry } = useClipPlayer(playerView);

  // `serverNow` is frozen at the last broadcast, so the skew is captured once
  // per broadcast and the countdown runs off the local clock from there.
  const skew = useRef(0);
  useEffect(() => {
    skew.current = serverNow - Date.now();
  }, [serverNow]);

  const [, tick] = useState(0);
  useEffect(() => {
    if (phase === 'GAME_OVER') return;
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [phase]);

  const msLeft = Math.max(0, playerView.questionDeadlineMs - (Date.now() + skew.current));
  const secondsLeft = Math.ceil(msLeft / 1000);
  const revealLeft = Math.max(
    0,
    (playerView.revealEndsAtMs ?? 0) - (Date.now() + skew.current)
  );
  const answered = myAnswerIndex !== null;
  const canAdvance = answered || msLeft <= 0;

  if (phase === 'GAME_OVER') {
    return (
      <Results
        playerView={playerView}
        onPlayAgain={onPlayAgain}
        onReturnLobby={onReturnLobby}
      />
    );
  }

  return (
    <div
      className="flex-1 flex flex-col items-center gap-4 p-3 sm:p-5 max-w-2xl mx-auto w-full font-mono select-none"
      data-clip={state}
    >
      <div className="w-full flex items-center justify-between gap-2 border-b border-rule pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-xs border border-rule-strong bg-ink text-canvas">
            {roundNumber}/{totalRounds}
          </span>
          <span className="text-xs font-bold text-ink-muted">{playerView.myScore} pts</span>
        </div>
        {phase === 'ANSWERING' && (
          <span
            className={`text-sm font-black tabular-nums ${secondsLeft <= 5 ? 'text-red-600 dark:text-red-400' : 'text-ink'}`}
          >
            {secondsLeft}s
          </span>
        )}
        {phase === 'REVEAL' && (
          <span
            data-testid="music-quiz-reveal-countdown"
            className="text-sm font-black tabular-nums text-ink"
          >
            {Math.ceil(revealLeft / 1000)}
          </span>
        )}
      </div>

      <Card className="w-full p-5 border border-rule space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
              {QUESTION_PROMPTS[playerView.questionType]}
            </span>
            <p className="text-[10px] font-mono text-ink-faint mt-0.5">
              {playerView.excerptSeconds}s clip, then answer
            </p>
          </div>
          <button
            type="button"
            onClick={retry}
            disabled={phase !== 'ANSWERING' || state === 'playing' || state === 'loading'}
            title="Play from the start"
            data-testid="music-quiz-replay"
            className="shrink-0 border border-rule rounded-xs p-2 text-ink-muted hover:border-ink/40 hover:text-ink disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <Waveform peaks={peaks} state={state} />

        {error && (
          <div className="border border-red-500/40 bg-red-500/5 rounded-xs p-2.5 flex items-center justify-between gap-2">
            <p className="text-[10px] font-mono text-red-600 dark:text-red-400">{error}</p>
            <Button size="sm" variant="secondary" className="text-[10px]" onClick={retry}>
              <Play size={11} /> Retry
            </Button>
          </div>
        )}

        {needsGesture && phase === 'ANSWERING' && !error && (
          <Button
            className="w-full text-xs font-bold uppercase"
            onClick={() => play()}
            disabled={state !== 'ready'}
            data-testid="music-quiz-play"
          >
            <Volume2 size={13} />
            {state === 'loading' ? 'Loading the clip...' : 'Tap to play'}
          </Button>
        )}

        {revealed && (
          <div className="border border-rule rounded-xs bg-canvas-sunk p-3 space-y-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
                {revealed.correctIndex === myAnswerIndex ? 'Correct' : myAnswerIndex === null ? 'No answer' : 'Not this one'}
              </span>
              <p className="text-sm font-black text-ink mt-0.5" data-testid="music-quiz-answer">{revealed.title}</p>
              <p className="text-xs font-mono text-ink-muted">{revealed.artist}</p>
              {revealed.fastestPlayerId && (
                <p className="text-[10px] font-mono text-ink-faint mt-1.5">
                  Fastest correct:{' '}
                  {playerView.scoreboard.find((p) => p.playerId === revealed.fastestPlayerId)?.displayName ??
                    'a player'}
                </p>
              )}
            </div>

            <div className="border-t border-rule pt-2 space-y-1" data-testid="music-quiz-reveal-results">
              {revealed.results.map((r) => (
                <div key={r.playerId} className="flex items-baseline justify-between gap-2 text-[10px] font-mono">
                  <span className="text-ink truncate">
                    {r.displayName}
                    <span className="text-ink-faint"> — </span>
                    {r.index === null ? (
                      <span className="text-ink-faint">no answer</span>
                    ) : (
                      <span className={r.correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-muted'}>
                        {choices[r.index]}
                      </span>
                    )}
                  </span>
                  <span className={`shrink-0 tabular-nums ${r.correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-faint'}`}>
                    {r.correct ? `+${r.points}` : '0'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
        {choices.map((c, i) => {
          const isCorrect = revealed?.correctIndex === i;
          const isMine = myAnswerIndex === i;
          const wrongPick = revealed && isMine && !isCorrect;
          return (
            <button
              key={i}
              type="button"
              disabled={phase !== 'ANSWERING' || answered}
              onClick={() => onAction('ANSWER', { index: i })}
              data-testid={`music-quiz-choice-${i}`}
              className={`text-left px-3 py-3 rounded-xs border text-xs font-bold transition-all ${
                isCorrect
                  ? 'border-emerald-500 bg-emerald-500/10 text-ink'
                  : wrongPick
                    ? 'border-red-500 bg-red-500/10 text-ink'
                    : answered
                      ? 'border-rule bg-canvas-sunk text-ink-faint'
                      : 'border-rule-strong bg-canvas text-ink hover:border-ink cursor-pointer'
              } ${phase !== 'ANSWERING' || answered ? 'cursor-default' : ''}`}
            >
              <span className="font-mono text-ink-faint mr-2">{i + 1}.</span>
              {c}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 w-full">
        {phase === 'ANSWERING' && (
          <Button
            variant="secondary"
            size="sm"
            className="text-[10px] ml-auto"
            disabled={!canAdvance}
            onClick={() => onAction('ADVANCE')}
            data-testid="music-quiz-advance"
          >
            {answered ? 'Show the answer' : 'Skip ahead'}
          </Button>
        )}
        {phase === 'REVEAL' && (
          <p className="text-[10px] font-mono text-ink-faint ml-auto flex items-center gap-1.5">
            <Music4 size={11} /> Next question in {Math.ceil(revealLeft / 1000)}s
          </p>
        )}
      </div>

      <Scoreboard playerView={playerView} />
    </div>
  );
}

/**
 * Real decoded amplitude, drawn from the clip the browser is already
 * downloading. A degraded state — decode failed or the clip has not loaded — is
 * a flat row of low bars, never a spinner, so the panel never looks like it is
 * waiting for something.
 */
function Waveform({ peaks, state }: { peaks: number[]; state: string }) {
  const bars = peaks.length ? peaks : Array.from({ length: 56 }, () => 0.06);
  const lit = state === 'playing';
  return (
    <div className="flex items-end gap-[2px] h-16 border border-rule rounded-xs bg-canvas-sunk px-2 py-2 overflow-hidden">
      {bars.map((p, i) => (
        <div
          key={i}
          className={`flex-1 rounded-[1px] transition-all duration-200 ${
            lit ? 'bg-ink' : 'bg-ink/25'
          }`}
          style={{ height: `${Math.round(p * 100)}%`, minHeight: 2 }}
        />
      ))}
    </div>
  );
}

function Scoreboard({ playerView }: { playerView: MusicQuizPlayerView }) {
  if (playerView.scoreboard.length < 2) return null;
  return (
    <div className="w-full border-t border-rule pt-2 space-y-1">
      {playerView.scoreboard.map((p, i) => (
        <div key={p.playerId} className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-ink">
            <span className="text-ink-faint mr-1.5">{i + 1}.</span>
            {p.displayName}
          </span>
          <span className="text-ink-muted tabular-nums">
            {p.correctCount} correct · {p.score} pts
          </span>
        </div>
      ))}
    </div>
  );
}

function Results({
  playerView,
  onPlayAgain,
  onReturnLobby,
}: {
  playerView: MusicQuizPlayerView;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}) {
  const { scoreboard, winners } = playerView;
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <Card className="p-8 border border-rule w-full max-w-md space-y-5 text-center font-mono">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
            Quiz over
          </span>
          <p className="text-xs font-mono text-ink-muted mt-1">
            {playerView.totalRounds} question{playerView.totalRounds === 1 ? '' : 's'} played
          </p>
        </div>

        <div className="space-y-1.5 border-t border-rule pt-4 text-left">
          {scoreboard.map((p, i) => (
            <div key={p.playerId} className="flex items-center justify-between text-xs">
              <span className={winners.includes(p.playerId) ? 'text-ink font-bold' : 'text-ink'}>
                {i === 0 && winners.length === 1 ? '★ ' : ''}
                {p.displayName}
              </span>
              <span className="font-bold text-ink-muted tabular-nums">{p.score} pts</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 text-xs" onClick={onReturnLobby}>
            Lobby
          </Button>
          <Button className="flex-1 text-xs font-bold uppercase" onClick={onPlayAgain}>
            New Quiz
          </Button>
        </div>
      </Card>
    </div>
  );
}
