import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
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
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
          Social Network
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
          Friends
        </h1>
      </div>

      <div className="space-y-6">
        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`px-4 py-2 text-xs uppercase font-mono font-bold tracking-wider transition-colors cursor-pointer rounded-xs ${
                active === t.key
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-zinc-500 hover:text-black dark:hover:text-white'
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Card className="p-0 border border-zinc-300 dark:border-zinc-800 overflow-hidden">
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
