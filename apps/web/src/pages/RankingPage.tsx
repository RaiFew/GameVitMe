import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface LeaderboardEntry {
  rank: number | null;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  isViewer: boolean;
}

interface Leaderboard {
  leaderboard: {
    key: string;
    name: string;
    category: string;
    direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
    metric: string;
  } | null;
  entries: LeaderboardEntry[];
  totalRanked: number;
  viewer: { rank: number | null; score: number | null } | null;
}

const formatScore = (score: number, metric: string) =>
  metric === 'totalTimeMs' ? `${(score / 1000).toFixed(2)}s` : String(score);

const METRIC_LABEL: Record<string, string> = {
  totalTimeMs: 'Total time — lower is better',
  highestFloor: 'Highest floor — higher is better',
};

/**
 * The public ranking board.
 *
 * Read-only for everyone. A signed-in visitor additionally sees their own row
 * and rank; a guest sees the same board with their panel empty. Nothing on this
 * page can be submitted from here — a score only ever comes from a finished
 * ranked run.
 */
export function RankingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [boards, setBoards] = useState<any[]>([]);
  const [activeKey, setActiveKey] = useState<string>('');
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<any[]>('/api/ranking/leaderboards')
      .then((list) => {
        const rows = Array.isArray(list) ? list : [];
        setBoards(rows);
        if (rows[0]) setActiveKey(rows[0].key);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadBoard = useCallback((key: string) => {
    if (!key) return;
    setLoading(true);
    api
      .get<Leaderboard>(`/api/ranking/leaderboards/${key}`)
      .then(setBoard)
      .catch(() => setBoard(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBoard(activeKey);
  }, [activeKey, loadBoard]);

  const active = board?.leaderboard;
  const metric = active?.metric ?? 'totalTimeMs';

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-muted block">
          Leaderboards
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-ink flex items-center gap-2.5">
          <Trophy size={26} />
          Ranking
        </h1>
        <p className="text-sm text-ink-muted max-w-prose">
          Ranked runs are played alone and scored entirely on the server. Only registered
          accounts can record a score.
        </p>
      </header>

      {/* Category + mode filters. The category is data, not a hardcoded tab, so a
          future game with its own rankings appears here without a new page. */}
      <div className="space-y-3">
        {[...new Set(boards.map((b) => b.category))].map((category) => (
          <div key={category} className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold block">
              {category}
            </span>
            <div className="flex flex-wrap gap-2">
              {boards
                .filter((b) => b.category === category)
                .map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setActiveKey(b.key)}
                    className={`px-3 h-9 text-xs font-mono font-bold uppercase rounded-xs border transition-colors cursor-pointer ${
                      activeKey === b.key
                        ? 'border-ink bg-ink text-canvas'
                        : 'border-rule bg-canvas text-ink-muted hover:border-ink/40'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase text-ink-muted">
          <span className="px-2 py-0.5 rounded-xs border border-rule bg-canvas-sunk">
            {METRIC_LABEL[metric] ?? metric}
          </span>
          {active.direction === 'LOWER_IS_BETTER' ? (
            <TrendingDown size={13} />
          ) : (
            <TrendingUp size={13} />
          )}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-muted font-mono">Loading…</div>
        ) : !board || board.entries.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-ink-muted font-mono">No ranked runs yet.</p>
            <Link to="/ranked">
              <Button size="sm">Play a ranked run</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-rule text-left text-[10px] uppercase tracking-wider text-ink-muted">
                  <th className="px-3 py-2.5 font-bold">#</th>
                  <th className="px-3 py-2.5 font-bold">Player</th>
                  <th className="px-3 py-2.5 font-bold text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {board.entries.map((entry, idx) => (
                  <tr
                    key={entry.userId}
                    className={`border-b border-rule last:border-b-0 ${
                      entry.isViewer ? 'bg-canvas-sunk' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 font-bold text-ink-faint">
                      {entry.rank ?? idx + 1}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-ink">
                      {entry.displayName}
                      {entry.isViewer && (
                        <span className="ml-2 text-[9px] uppercase text-ink-muted">(you)</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-ink">
                      {formatScore(entry.score, metric)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Viewer panel. Empty for a signed-out visitor or a guest, by design. */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-ink-muted">
            <Users size={15} />
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
              {board?.totalRanked ?? 0} player{board?.totalRanked === 1 ? '' : 's'} ranked
            </span>
          </div>
          {board?.viewer ? (
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-ink-muted">
                Your rank <span className="font-bold text-ink">#{board.viewer.rank ?? '—'}</span>
              </span>
              <span className="text-ink-muted">
                Your best{' '}
                <span className="font-bold text-ink">
                  {formatScore(board.viewer.score ?? 0, metric)}
                </span>
              </span>
            </div>
          ) : isAuthenticated ? (
            <p className="text-[10px] font-mono text-ink-muted">
              {user?.isGuest
                ? 'Guest accounts cannot be ranked. Register to record a score.'
                : 'You have no score on this board yet.'}
            </p>
          ) : (
            <p className="text-[10px] font-mono text-ink-muted">
              Sign in to see your rank and record scores.
            </p>
          )}
        </div>
        <Link to="/ranked" className="block">
          <Button variant="primary" className="w-full">
            Play Ranked
          </Button>
        </Link>
      </Card>
    </div>
  );
}
