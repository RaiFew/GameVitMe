import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { FriendList } from '../components/friends/FriendList';
import { FriendSearch } from '../components/friends/FriendSearch';
import { FriendRequests } from '../components/friends/FriendRequests';

export function FriendsPage() {
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
          Social Network
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white mt-1">
          Friends
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <button
              className={`px-4 py-2 text-xs uppercase font-mono font-bold tracking-wider transition-colors cursor-pointer rounded-xs ${
                tab === 'friends'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-zinc-500 hover:text-black dark:hover:text-white'
              }`}
              onClick={() => setTab('friends')}
            >
              My Friends
            </button>
            <button
              className={`px-4 py-2 text-xs uppercase font-mono font-bold tracking-wider transition-colors cursor-pointer rounded-xs ${
                tab === 'requests'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-zinc-500 hover:text-black dark:hover:text-white'
              }`}
              onClick={() => setTab('requests')}
            >
              Requests
            </button>
          </div>

          <Card className="p-0 border border-zinc-300 dark:border-zinc-800 overflow-hidden">
            {tab === 'friends' && <FriendList />}
            {tab === 'requests' && <FriendRequests />}
          </Card>
        </div>

        <div>
          <Card className="p-6 border border-zinc-300 dark:border-zinc-800">
            <h2 className="text-sm font-black uppercase tracking-wider text-black dark:text-white mb-4">
              Add Friend
            </h2>
            <FriendSearch />
          </Card>
        </div>
      </div>
    </div>
  );
}
