import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';

/** The product's signature artifact: five characters and everyone is in. */
const CODE_SPECIMEN = 'PXR42';

const PILLARS = [
  {
    title: 'Instant rooms',
    body: 'Start a lobby in seconds. Players join by scanning a QR code or typing a five-character code — no account required to get started.',
  },
  {
    title: 'Host and screen mode',
    body: 'Cast a TV or laptop as the room screen while players hold private roles and votes on their own phones.',
  },
  {
    title: 'Server-authoritative',
    body: 'The server holds the truth. Secret roles, locations, and timers are masked per player, so nothing worth hiding ever reaches a client.',
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="flex-1 flex flex-col">
      <section className="container mx-auto px-4 pt-20 pb-24 max-w-5xl">
        <h1 className="text-display sm:text-[3.25rem] sm:leading-[1.05] font-extrabold max-w-[18ch]">
          Everyone in the room in one code.
        </h1>

        <p className="mt-6 text-body sm:text-title text-ink-muted max-w-[52ch]">
          Real-time party games that run in the browser. No install, no lobby
          naming arguments — a host makes a room, everyone reads out five
          characters, and the game starts.
        </p>

        {/* The one ornament on the page: the code as a specimen, revealed once. */}
        <div
          className="mt-10 flex items-end gap-3 motion-safe:animate-[rise_600ms_cubic-bezier(0.2,0.8,0.2,1)_both]"
          style={{ animationDelay: '120ms' }}
        >
          <span className="tabular font-mono text-[3.5rem] leading-none font-semibold tracking-[0.02em]">
            {CODE_SPECIMEN}
          </span>
          <span className="pb-1.5 text-label text-ink-faint font-mono">
            a room code
          </span>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link to={isAuthenticated ? '/room/create' : '/login'} className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto min-w-44">
              Create a room
            </Button>
          </Link>
          <Link to={isAuthenticated ? '/dashboard' : '/login'} className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto min-w-44">
              Join a game
            </Button>
          </Link>
        </div>
      </section>

      <section className="border-t border-rule bg-canvas-sunk">
        <div className="container mx-auto px-4 py-16 max-w-5xl grid gap-10 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title}>
              <h2 className="text-title font-bold">{p.title}</h2>
              <p className="mt-3 text-body text-ink-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
