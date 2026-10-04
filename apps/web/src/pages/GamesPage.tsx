import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useT } from '../stores/langStore';

export function GamesPage() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const t = useT();

  // JoinRoomPage forwards to the dashboard, which owns the socket handshake.
  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const roomCode = code.trim().toUpperCase();
    if (roomCode) navigate(`/join/${roomCode}`);
  };
  const games = [
    {
      id: 'spyfall',
      name: 'Spyfall',
      category: 'Social Deduction',
      categoryKey: 'games.catSpyfall',
      players: '4–12 Players',
      duration: '8–10 Min',
      descriptionKey: 'games.descSpyfall',
      status: 'Ready to play',
    },
    {
      id: 'werewolf',
      name: 'Werewolf',
      category: 'Hidden Roles',
      categoryKey: 'games.catWerewolf',
      players: '4–12 Players',
      duration: '15 Min',
      descriptionKey: 'games.descWerewolf',
      status: 'Ready to play',
    },
    {
      id: 'salem',
      name: 'Salem 1692',
      category: 'Witch Trials & Deduction',
      categoryKey: 'games.catSalem',
      players: '4–12 Players',
      duration: '15 Min',
      descriptionKey: 'games.descSalem',
      status: 'Ready to play',
    },
    {
      id: 'codenames',
      name: 'Codenames',
      category: 'Word Deduction & Teams',
      categoryKey: 'games.catCodenames',
      players: '2–20 Players',
      duration: '10–15 Min',
      descriptionKey: 'games.descCodenames',
      status: 'Ready to play',
    },
    {
      id: 'rock-paper-scissors',
      name: 'Rock Paper Scissors',
      category: 'Arcade & Battle Royale',
      categoryKey: 'games.catRps',
      players: '2–20 Players',
      duration: '3–5 Min',
      descriptionKey: 'games.descRps',
      status: 'Ready to play',
    },
    {
      id: 'number-grid',
      name: 'Number Grid / Rush',
      category: 'Speedrun & Reflex',
      categoryKey: 'games.catNumberGrid',
      players: '1–20 Players',
      duration: '2–5 Min',
      descriptionKey: 'games.descNumberGrid',
      status: 'Ready to play',
    },
    {
    id: 'music-quiz',
    name: 'Music Quiz',
    category: 'Co-op & Puzzle',
    categoryKey: 'games.catMusicQuiz',
    players: '2–20 Players',
    duration: '5–15 Min',
    descriptionKey: 'games.descMusicQuiz',
    status: 'Ready to play',
    },
  ] as const;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="border-b border-rule pb-8 mb-10">
        <h1 className="text-display font-extrabold">{t('games.heading')}</h1>
        <p className="mt-2 text-body text-ink-muted max-w-xl">
          {t('games.subheading')}
        </p>
      </div>

      {/* Joining a room is one code, so it gets one field above the catalogue
          rather than a button on every card. */}
      <form
        onSubmit={submitCode}
        className="mb-12 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="join-code" className="block text-label font-semibold mb-2">
            {t('games.gotCode')}
          </label>
          <Input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t('games.codePlaceholder')}
            maxLength={5}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="font-mono tracking-[0.2em]"
          />
        </div>
        <Button type="submit" size="lg" disabled={!code.trim()}>
          {t('games.joinRoom')}
        </Button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map((game) => {
          const isPlayable = game.status === 'Ready to play';
          return (
            <Card
              key={game.id}
              className={`flex flex-col justify-between h-full ${
                isPlayable ? 'border-rule-strong' : 'opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-micro font-mono px-2 py-0.5 border border-rule bg-canvas-sunk text-ink-muted">
                    {t(game.categoryKey)}
                  </span>
                  {isPlayable && (
                    <span className="text-micro font-mono font-semibold text-live">
                      {t('games.ready')}
                    </span>
                  )}
                </div>

                <h2 className="text-title font-bold mb-2">{game.name}</h2>

                <p className="text-label text-ink-muted leading-relaxed mb-6">
                  {t(game.descriptionKey)}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-micro font-mono text-ink-faint border-t border-rule pt-4 mb-4">
                  <span>{game.players}</span>
                  <span>{game.duration}</span>
                </div>

                {isPlayable ? (
                  <Link to={`/room/create?game=${game.id}`} className="block w-full">
                    <Button variant="secondary" className="w-full">
                      {t('games.startRoom')}
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" className="w-full" disabled>
                    {t('games.comingSoon')}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
export default GamesPage;
