import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import api from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';

const ITEMS = [
  { key: 'applications', label: 'Instructor applications', link: '/admin/applications', tone: 'text-amber-500' },
  { key: 'proposals', label: 'Course proposals', link: '/admin/course-proposals', tone: 'text-blue-500' },
  { key: 'flaggedReviews', label: 'Flagged reviews', link: '/admin/reports', tone: 'text-rose-500' },
  { key: 'communityReports', label: 'Community reports', link: '/admin/community-management', tone: 'text-pink-500' },
  { key: 'pendingPayouts', label: 'Pending payouts', link: '/admin/payouts', tone: 'text-violet-500' },
  { key: 'failedPayments', label: 'Failed payments', link: '/admin/payments', tone: 'text-red-500' },
  { key: 'openTickets', label: 'Open tickets', link: '/admin/tickets', tone: 'text-cyan-500' },
];

export function ActionCenter() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/admin/action-center')
      .then(({ data }) => setData(data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return null;
  if (!data) return null;

  const total = ITEMS.reduce((n, i) => n + (Number(data[i.key]) || 0), 0);
  if (!total && !data.aiToday) return null;

  return (
    <GlassCard className="p-4" hover={false}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Action center
          {total > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600">{total}</span>}
        </h2>
        <button onClick={load} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Refresh action center">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ITEMS.filter((i) => Number(data[i.key]) > 0).map((i) => (
          <Link key={i.key} to={i.link} className="rounded-xl border border-gray-200 dark:border-gray-800 p-2.5 hover:border-primary-400 transition-colors">
            <p className={`text-lg font-bold tabular-nums ${i.tone}`}>{Number(data[i.key])}</p>
            <p className="text-[11px] text-gray-500 leading-tight">{i.label}</p>
          </Link>
        ))}
        {total === 0 && (
          <p className="text-sm text-emerald-600 col-span-full flex items-center gap-1.5">
            <ArrowRight className="w-4 h-4" /> Nothing needs attention right now.
          </p>
        )}
      </div>
    </GlassCard>
  );
}
