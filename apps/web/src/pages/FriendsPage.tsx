import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { FriendList } from '../components/friends/FriendList';
import { FriendSearch } from '../components/friends/FriendSearch';
import { FriendRequests } from '../components/friends/FriendRequests';

const TABS = [
  { key: 'friends', label: 'My Friends' },
  { key: 'search', label: 'Add Friend' },
  { key: 'requests', label: 'Requests' },
] as const;

export function FriendsPage() {
  const [params, setParams] = useSearchParams();
  const active = TABS.find((t) => t.key === params.get('tab'))?.key ?? 'friends';
  const setTab = (key: string) =>
    setParams(key === 'friends' ? {} : { tab: key }, { replace: true });

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Social"
        title="Friends"
        description="Search for players by name, connect, then pull them into a room."
      />

      <div className="space-y-6">
        <div role="tablist" className="flex gap-1 border-b border-rule">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={active === t.key}
              className={`-mb-px border-b-2 px-4 py-2.5 text-label font-semibold transition-colors cursor-pointer ${
                active === t.key
                  ? 'border-live text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Card className="p-0 overflow-hidden">
          {active === 'friends' && <FriendList />}
          {active === 'search' && (
            <div className="p-6">
              <FriendSearch />
            </div>
          )}
          {active === 'requests' && <FriendRequests />}
        </Card>
      </div>
    </div>
  );
}
