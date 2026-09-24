import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Users, Shield, ArrowRight } from 'lucide-react';

export function GamesPage() {
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
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-8 mb-10">
        <span className="text-xs uppercase tracking-widest font-mono font-bold text-zinc-500 dark:text-zinc-400">
          Game Catalogue
        </span>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
          Available Games
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 max-w-xl">
          Browse multiplayer party and social deduction games optimized for mobile and desktop screens.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map((game) => {
          const isPlayable = game.status === 'Ready to play';
          return (
            <Card
              key={game.id}
              className={`flex flex-col justify-between h-full border ${
                isPlayable
                  ? 'border-black dark:border-white'
                  : 'border-zinc-200 dark:border-zinc-800 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[10px] uppercase tracking-widest font-mono font-bold px-2 py-0.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                    {game.category}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
                    {game.status}
                  </span>
                </div>

                <h2 className="text-2xl font-black tracking-tight uppercase text-black dark:text-white mb-2">
                  {game.name}
                </h2>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                  {game.description}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 pt-4 mb-4">
                  <span>{game.players}</span>
                  <span>{game.duration}</span>
                </div>

                {isPlayable ? (
                  <Link to={`/room/create?game=${game.id}`} className="block w-full">
                    <Button className="w-full text-xs">
                      Play Now <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" className="w-full text-xs" disabled>
                    Coming Soon
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
