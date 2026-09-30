import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Swords, TrendingDown, TrendingUp, LogIn } from 'lucide-react';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useT } from '../stores/langStore';
import type { TranslationKey } from '../i18n/dictionaries';

/**
 * The three ranked modes. Each card states the metric and which end of the scale
 * wins before the player commits, so a run is never started without knowing what
 * it is being scored on.
 *
 * The variant is sent to the server as a name, never as rules: the server owns
 * the stage count, the HP, the penalty and the grid generation for a ranked run.
 */
const MODES = [
  {
    variant: 'RANKED_TIME',
    key: 'number-rush.time',
    nameKey: 'ranking.modeTime',
    blurbKey: 'ranked.time.blurb',
    ruleKeys: ['ranked.time.rule1', 'ranked.time.rule2', 'ranked.time.rule3', 'ranked.time.rule4'] as const,
  },
  {
    variant: 'RANKED_TOWER',
    key: 'number-rush.tower-climb',
    nameKey: 'ranking.modeTowerClimb',
    blurbKey: 'ranked.tower.blurb',
    ruleKeys: ['ranked.tower.rule1', 'ranked.tower.rule2', 'ranked.tower.rule3', 'ranked.tower.rule4'] as const,
  },
  {
    variant: 'RANKED_CHAOS',
    key: 'number-rush.chaos',
    nameKey: 'ranking.modeChaos',
    blurbKey: 'ranked.chaos.blurb',
    ruleKeys: ['ranked.chaos.rule1', 'ranked.chaos.rule2', 'ranked.chaos.rule3', 'ranked.chaos.rule4'] as const,
  },
] as const;

export function RankedPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const setRoom = useRoomStore((s) => s.setRoom);
  const navigate = useNavigate();
  const [personalBests, setPersonalBests] = useState<Record<string, { score: number; rank: number | null }>>({});
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const t = useT();

  // Guests may browse and see the rules; the server refuses to score them, and
  // the card says so before they press Start.
  const isGuest = !!user?.isGuest;
  const canPlay = isAuthenticated && !isGuest;

  useEffect(() => {
    if (!canPlay) return;
    api
      .get<{ entries: Record<string, { score: number; rank: number | null }> }>('/api/ranking/me')
      .then((res) => setPersonalBests(res?.entries ?? {}))
      .catch(() => {});
  }, [canPlay]);

  const startRun = (variant: string) => {
    if (!socket || !isConnected) {
      setError(t('ranked.errNotConnected'));
      return;
    }
    setError('');
    setStarting(variant);

    socket.emit(
      'room:create',
      {
        gameId: 'number-grid',
        gameType: 'number-grid',
        name: `Ranked ${variant}`,
        maxPlayers: 1,
        isPrivate: true,
        hostMode: false,
      },
      (room: any) => {
        if (!room?.roomCode) {
          setStarting(null);
          setError(room?.error || t('ranked.errOpenRun'));
          return;
        }
        if (room.room) setRoom(room.room);

        // The variant is the only thing the client states. Everything the run
        // is actually scored on is decided server-side when it starts.
        socket.emit(
          'room:update_settings',
          { roomId: room.room.id, settings: { gameSettings: { variant } } },
          () => {
            socket.emit(
              'game:start',
              { roomId: room.room.id },
              (res: any) => {
                if (res?.error) {
                  setStarting(null);
                  setError(res.error);
                  return;
                }
                navigate(`/game/${room.roomCode}`);
              }
            );
          }
        );
      }
    );
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
          {t('ranked.eyebrow')}
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-ink flex items-center gap-2.5">
          <Swords size={26} className="text-live" />
          {t('ranked.title')}
        </h1>
        <p className="text-sm text-ink-muted max-w-prose">
          {t('ranked.subtitle')}
        </p>
      </header>

      {!canPlay && (
        <Card className="p-4 border-live/40 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-muted font-mono">
            {isGuest
              ? t('ranked.guestNotice')
              : t('ranked.signInNotice')}
          </p>
          <Link to="/login">
            <Button size="sm" variant="primary" className="flex items-center gap-1.5">
              <LogIn size={13} />
              {isGuest ? t('ranked.register') : t('login.title')}
            </Button>
          </Link>
        </Card>
      )}

      {error && (
        <p className="text-xs font-mono text-red-600 dark:text-red-400 border border-red-300 dark:border-red-900/60 rounded-xs p-2.5">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {MODES.map((mode) => {
          const best = personalBests[mode.key];
          const isTime = mode.variant === 'RANKED_TIME';
          return (
            <Card key={mode.variant} className="p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight text-ink">
                    {t(mode.nameKey)}
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">{t(mode.blurbKey)}</p>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold px-2 py-1 rounded-xs border border-rule bg-canvas-sunk text-ink-muted">
                  {isTime ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                  {isTime ? t('ranked.lowerBetter') : t('ranked.higherBetter')}
                </span>
              </div>

              <ul className="space-y-1.5">
                {mode.ruleKeys.map((rule) => (
                  <li
                    key={rule}
                    className="text-xs text-ink-muted font-mono flex gap-2 before:content-['—'] before:text-ink-faint before:shrink-0"
                  >
                    {t(rule)}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-rule">
                <span className="text-[10px] font-mono uppercase text-ink-muted">
                  {t('ranked.personalBest')}{' '}
                  <span className="font-bold text-ink">
                    {best
                      ? isTime
                        ? `${(best.score / 1000).toFixed(2)}s`
                        : String(best.score)
                      : '—'}
                    {best?.rank ? ` • #${best.rank}` : ''}
                  </span>
                </span>
                <Button
                  variant="primary"
                  disabled={!canPlay || starting !== null}
                  onClick={() => startRun(mode.variant)}
                >
                  {starting === mode.variant ? t('ranked.starting') : t('ranked.startRun')}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
