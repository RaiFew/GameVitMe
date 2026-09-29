import { useEffect, useState } from 'react';
import type { SalemPlayerView } from '@party/salem';
import { useSocket } from '../../../hooks/useSocket';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Moon, Flame, Shield, KeyRound, Lock } from 'lucide-react';

interface Props {
  playerView: SalemPlayerView;
  onAction: (type: string, payload?: unknown) => void;
  isHost: boolean;
}

const ROLE_COPY = {
  WITCH: {
    title: 'The Witch acts',
    question: 'Who do you condemn tonight?',
    confirm: 'Condemn',
    icon: Flame,
  },
  CONSTABLE: {
    title: 'The Constable acts',
    question: 'Who do you guard tonight?',
    confirm: 'Guard',
    icon: Shield,
  },
} as const;

export function SalemNightScreen({ playerView, onAction, isHost }: Props) {
  const { socket } = useSocket();
  const night = playerView.night!;
  const { actingRole, claimed, iHaveClaimed, myTargetId } = night;
  const { title, question, confirm, icon: RoleIcon } = ROLE_COPY[actingRole];

  const [passphrase, setPassphrase] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // A new night invalidates the old capability.
  useEffect(() => {
    setToken(null);
    setPassphrase('');
    setSelected(null);
  }, [actingRole, playerView.roundNumber]);

  useEffect(() => {
    if (!socket) return;
    const onToken = (payload: any) => {
      if (payload?.role === actingRole && payload?.round === playerView.roundNumber) {
        setToken(payload.token);
      }
    };
    socket.on('salem:role_token', onToken);
    return () => {
      socket.off('salem:role_token', onToken);
    };
  }, [socket, actingRole, playerView.roundNumber]);

  const choices = playerView.players.filter((p) => !p.isHost && p.isAlive);
  const chosen = playerView.players.find((p) => p.id === (selected ?? myTargetId));

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
      <header className="border-b border-rule pb-6 text-center space-y-2">
        <span className="text-label font-mono uppercase tracking-widest text-ink-muted flex items-center justify-center gap-2">
          <Moon size={14} /> Night {playerView.roundNumber}
        </span>
        <h1 className="text-display font-black tracking-tight text-ink flex items-center justify-center gap-3">
          <RoleIcon size={32} /> {title}
        </h1>
      </header>

      {isHost ? (
        <Card className="p-6 border border-rule text-center space-y-4">
          <Lock size={20} className="mx-auto text-ink-muted" />
          <p className="text-body text-ink-muted">
            The {actingRole === 'WITCH' ? 'Witch' : 'Constable'} is acting now. You cannot
            see who holds the card or who they chose — advance the night when you are ready.
          </p>
          <Button onClick={() => onAction('HOST_ADVANCE')}>Move the night along</Button>
        </Card>
      ) : !token ? (
        <Card className="p-6 border border-rule space-y-5">
          <div className="space-y-1">
            <h2 className="text-title font-black tracking-tight text-ink">Reveal your card</h2>
            <p className="text-label text-ink-muted">
              {claimed
                ? iHaveClaimed
                  ? 'Enter the same secret phrase again to restore your turn.'
                  : 'That card has already been called for this night.'
                : 'If you are holding the card, type a secret phrase only you know.'}
            </p>
          </div>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              onAction('CLAIM_ROLE', { passphrase });
            }}
          >
            <Input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Your secret phrase"
              autoComplete="off"
              disabled={claimed && !iHaveClaimed}
            />
            <Button
              type="submit"
              variant={iHaveClaimed ? 'secondary' : 'primary'}
              disabled={passphrase.trim().length < 4 || (claimed && !iHaveClaimed)}
            >
              <KeyRound size={14} className="mr-2" />
              {iHaveClaimed ? 'Restore my turn' : 'Reveal my card'}
            </Button>
          </form>

          <p className="text-label text-ink-faint">
            Your phrase is never shown to anyone, and no one can act as the{' '}
            {actingRole === 'WITCH' ? 'Witch' : 'Constable'} without it.
          </p>
        </Card>
      ) : (
        <Card className="p-6 border-2 border-live space-y-5">
          <div className="space-y-1">
            <h2 className="text-title font-black tracking-tight text-ink">{question}</h2>
            <p className="text-label text-ink-muted">
              Only you can see your choice. Tap a name, then confirm.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {choices.map((p) => {
              const isChosen = (selected ?? myTargetId) === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={`border rounded-xs px-3 py-2.5 text-label font-semibold transition-colors cursor-pointer ${
                    isChosen
                      ? 'border-ink bg-canvas-sunk text-ink'
                      : 'border-rule text-ink-muted hover:border-ink-faint hover:text-ink'
                  }`}
                >
                  {p.displayName}
                </button>
              );
            })}
          </div>

          <Button
            className="w-full"
            disabled={!selected}
            onClick={() => onAction('NIGHT_ACTION', { token, targetPlayerId: selected })}
          >
            {confirm} {chosen?.displayName ?? '…'}
          </Button>
        </Card>
      )}
    </div>
  );
}
