import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { FriendList } from '../components/friends/FriendList';
import { FriendSearch } from '../components/friends/FriendSearch';
import { FriendRequests } from '../components/friends/FriendRequests';
import { useT } from '../stores/langStore';
import type { TranslationKey } from '../i18n/dictionaries';

const TABS = [
  { key: 'friends', labelKey: 'friends.tabMine' },
  { key: 'search', labelKey: 'friends.tabAdd' },
  { key: 'requests', labelKey: 'friends.tabRequests' },
] as const satisfies readonly { key: string; labelKey: TranslationKey }[];

export function FriendsPage() {
  const [params, setParams] = useSearchParams();
  const t = useT();
  const active = TABS.find((t) => t.key === params.get('tab'))?.key ?? 'friends';
  const setTab = (key: string) =>
    setParams(key === 'friends' ? {} : { tab: key }, { replace: true });

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
      <PageHeader
        eyebrow={t('friends.eyebrow')}
        title={t('friends.title')}
        description={t('friends.subtitle')}
      />

      <div className="space-y-6">
        <div role="tablist" className="flex gap-1 border-b border-rule">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active === tab.key}
              className={`-mb-px border-b-2 px-4 py-2.5 text-label font-semibold transition-colors cursor-pointer ${
                active === tab.key
                  ? 'border-live text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
              onClick={() => setTab(tab.key)}
            >
              {t(tab.labelKey)}
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
