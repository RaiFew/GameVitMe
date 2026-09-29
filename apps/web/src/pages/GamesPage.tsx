import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export function GamesPage() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

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
      players: '4–12 Players',
      duration: '8–10 Min',
      description: 'Find the secret spy among the players. Everyone knows the secret location except for one player: The Spy.',
      status: 'Ready to play',
    },
    {
      id: 'werewolf',
      name: 'Werewolf',
      category: 'Hidden Roles',
      players: '4–12 Players',
      duration: '15 Min',
      description: 'Villagers and special roles work together to uncover and eliminate hidden werewolves before they outnumber the village.',
      status: 'Ready to play',
    },
    {
      id: 'salem',
      name: 'Salem 1692',
      category: 'Witch Trials & Deduction',
      players: '4–12 Players',
      duration: '15 Min',
      description: 'Accuse, conspire, and defend against hidden witches before Salem falls into hysteria. 1 Host Moderator required.',
      status: 'Ready to play',
    },
    {
      id: 'codenames',
      name: 'Codenames',
      category: 'Word Deduction & Teams',
      players: '2–20 Players',
      duration: '10–15 Min',
      description: 'Two rival teams (Red vs Blue) deduce word cards via Spymaster clues. Features 2-Player Cooperative mode and custom word file uploads.',
      status: 'Ready to play',
    },
    {
      id: 'rock-paper-scissors',
      name: 'Rock Paper Scissors',
      category: 'Arcade & Battle Royale',
      players: '2–20 Players',
      duration: '3–5 Min',
      description: 'Fast-paced hand battles! Features 1v1 Fighting Game Duel with TV Host Screen mode, Battle Royale Survival Elimination, and Points Race.',
      status: 'Ready to play',
    },
    {
      id: 'number-grid',
      name: 'Number Grid / Rush',
      category: 'Speedrun & Reflex',
      players: '1–20 Players',
      duration: '2–5 Min',
      description: 'Click numbered circles in ascending order from 2x2 up to 10x10. Features sequential rounds, custom grid layouts, HP penalty, and survival damage modes.',
      status: 'Ready to play',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="border-b border-rule pb-8 mb-10">
        <h1 className="text-display font-extrabold">Available Games</h1>
        <p className="mt-2 text-body text-ink-muted max-w-xl">
          Browse multiplayer party and social deduction games optimized for mobile and
          desktop screens.
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
            Got a room code?
          </label>
          <Input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="5-character code"
            maxLength={5}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="font-mono tracking-[0.2em]"
          />
        </div>
        <Button type="submit" size="lg" disabled={!code.trim()}>
          Join room
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
                    {game.category}
                  </span>
                  {isPlayable && (
                    <span className="text-micro font-mono font-semibold text-live">
                      {game.status}
                    </span>
                  )}
                </div>

                <h2 className="text-title font-bold mb-2">{game.name}</h2>

                <p className="text-label text-ink-muted leading-relaxed mb-6">
                  {game.description}
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
                      Start a room
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" className="w-full" disabled>
                    Coming soon
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
