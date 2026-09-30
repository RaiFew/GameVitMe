import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { useT } from '../stores/langStore';

/** The product's signature artifact: five characters and everyone is in. */
const CODE_SPECIMEN = 'PXR42';

const PILLAR_KEYS = [
  { title: 'home.pillar1.title', body: 'home.pillar1.body' },
  { title: 'home.pillar2.title', body: 'home.pillar2.body' },
  { title: 'home.pillar3.title', body: 'home.pillar3.body' },
] as const;

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const t = useT();

  return (
    <div className="flex-1 flex flex-col">
      <section className="container mx-auto px-4 pt-20 pb-24 max-w-5xl">
        <h1 className="text-display sm:text-[3.25rem] sm:leading-[1.05] font-extrabold max-w-[18ch]">
          {t('home.headline')}
        </h1>

        <p className="mt-6 text-body sm:text-title text-ink-muted max-w-[52ch]">
          {t('home.subhead')}
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
            {t('home.codeCaption')}
          </span>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link to={isAuthenticated ? '/room/create' : '/login'} className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto min-w-44">
              {t('home.createRoom')}
            </Button>
          </Link>
          <Link to={isAuthenticated ? '/dashboard' : '/login'} className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto min-w-44">
              {t('home.joinGame')}
            </Button>
          </Link>
        </div>
      </section>

      <section className="border-t border-rule bg-canvas-sunk">
        <div className="container mx-auto px-4 py-16 max-w-5xl grid gap-10 md:grid-cols-3">
          {PILLAR_KEYS.map((p) => (
            <div key={p.title}>
              <h2 className="text-title font-bold">{t(p.title)}</h2>
              <p className="mt-3 text-body text-ink-muted">{t(p.body)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
