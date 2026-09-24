import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ArrowRight, Users, Shield, Zap } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="flex-1 flex flex-col justify-center">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 max-w-5xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-xs font-mono uppercase tracking-widest font-semibold rounded-xs">
          Multiplayer Party Platform
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter uppercase text-black dark:text-white leading-[1.05]">
          Play Real-Time<br />Social Games With Friends
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Minimal, fast, and server-authoritative party games. Join effortlessly on mobile or desktop via QR code or 5-character room code.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link to={isAuthenticated ? "/room/create" : "/login"} className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto min-w-[200px]">
              Create Room <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
          <Link to={isAuthenticated ? "/dashboard" : "/login"} className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto min-w-[200px]">
              Join Game
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border border-zinc-300 dark:border-zinc-800">
              <span className="font-mono text-xs font-bold text-zinc-500">01</span>
              <h3 className="text-lg font-black uppercase text-black dark:text-white mt-2 mb-2">
                Instant Rooms
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Start a game lobby in seconds. Friends join directly by scanning a QR code or entering a 5-letter code.
              </p>
            </Card>

            <Card className="p-6 border border-zinc-300 dark:border-zinc-800">
              <span className="font-mono text-xs font-bold text-zinc-500">02</span>
              <h3 className="text-lg font-black uppercase text-black dark:text-white mt-2 mb-2">
                Host / Screen Mode
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Connect your TV or laptop as the room screen while players use their phones for private roles and voting.
              </p>
            </Card>

            <Card className="p-6 border border-zinc-300 dark:border-zinc-800">
              <span className="font-mono text-xs font-bold text-zinc-500">03</span>
              <h3 className="text-lg font-black uppercase text-black dark:text-white mt-2 mb-2">
                Server-Authoritative
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                State masking ensures secret roles, locations, and timers remain strictly protected from cheating.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
