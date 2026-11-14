import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Database, HardDrive, Brain, Mail, Bell, ShieldCheck, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import toast from 'react-hot-toast';

const services = [
  { key: 'database', label: 'D1 database', icon: Database },
  { key: 'r2', label: 'R2 storage', icon: HardDrive },
  { key: 'ai', label: 'Workers AI', icon: Brain },
  { key: 'email', label: 'Email Service', icon: Mail },
  { key: 'push', label: 'Web Push', icon: Bell },
  { key: 'turnstile', label: 'Turnstile', icon: ShieldCheck },
];

export default function AdminSystemHealth() {
  const [health, setHealth] = useState<any>(null);
  const [actions, setActions] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<any>(null);
  const [reviewing, setReviewing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [h, a, u] = await Promise.all([
        api.get('/admin/health'),
        api.get('/admin/action-center'),
        api.get('/admin/ai-usage').catch(() => ({ data: { data: { daily: [], top: [] } } })),
      ]);
      setHealth(h.data.data);
      setActions(a.data.data);
      setUsage(u.data.data);
    } catch {
      toast.error('Failed to load system health');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const runReview = async () => {
    setReviewing(true);
    try {
      const { data } = await api.post('/admin/platform-review');
      setReview(data.data);
      toast.success('Platform review ready');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Platform review failed');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) return <PageSkeleton />;

  const cronRows = health?.crons || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Activity className="w-7 h-7 text-primary-500" /> System Health</h1>
          <p className="text-gray-500 text-sm mt-1">Live service checks, background jobs and AI usage.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} icon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map((s) => {
          const ok = !!health?.[s.key];
          return (
            <GlassCard key={s.key} className="p-4 flex items-center gap-3" hover={false}>
              <div className={`w-10 h-10 rounded-xl grid place-items-center ${ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <Badge variant={ok ? 'success' : 'danger'} size="sm">{ok ? 'Operational' : 'Not configured'}</Badge>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard className="p-4" hover={false}>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-primary-500" /> Background jobs</h2>
          <div className="space-y-2">
            {cronRows.length === 0 && <p className="text-sm text-gray-500">No cron runs recorded yet. The scheduler runs every 15 minutes and hourly.</p>}
            {cronRows.map((r: any) => (
              <div key={r.name} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-2.5">
                <div>
                  <p className="text-sm font-medium capitalize">{r.name}</p>
                  <p className="text-[11px] text-gray-500">{r.last_detail || '—'}</p>
                </div>
                <div className="text-right">
                  <Badge variant={r.last_status === 'ok' ? 'success' : 'danger'} size="sm">{r.last_status || 'unknown'}</Badge>
                  <p className="text-[10px] text-gray-400 mt-1">{r.last_run_at ? new Date(r.last_run_at).toLocaleString() : 'never'}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-4" hover={false}>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-amber-500" /> Action center</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Applications', actions?.applications],
              ['Course proposals', actions?.proposals],
              ['Flagged reviews', actions?.flaggedReviews],
              ['Community reports', actions?.communityReports],
              ['Pending payouts', actions?.pendingPayouts],
              ['Failed payments', actions?.failedPayments],
              ['Refunds', actions?.refunds],
              ['Open tickets', actions?.openTickets],
              ['AI requests today', actions?.aiToday],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-gray-200 dark:border-gray-800 p-2.5">
                <p className="text-lg font-bold tabular-nums">{Number(value) || 0}</p>
                <p className="text-[11px] text-gray-500">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Jobs last ingested: {actions?.jobsLastIngest ? new Date(actions.jobsLastIngest).toLocaleString() : 'never'}</p>
        </GlassCard>
      </div>

      <GlassCard className="p-4" hover={false}>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3"><Brain className="w-4 h-4 text-violet-500" /> GiGo usage (14 days)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2 pr-3">Day</th><th className="py-2 pr-3">Text</th><th className="py-2 pr-3">Voice</th><th className="py-2 pr-3">TTS</th><th className="py-2">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {(usage?.daily || []).map((d: any) => (
                <tr key={d.day} className="border-b border-gray-100 dark:border-gray-900">
                  <td className="py-1.5 pr-3">{d.day}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{d.requests || 0}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{d.voice || 0}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{d.tts || 0}</td>
                  <td className="py-1.5 tabular-nums">{d.tokens || 0}</td>
                </tr>
              ))}
              {!usage?.daily?.length && <tr><td colSpan={5} className="py-4 text-center text-gray-500">No usage recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="p-4" hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-violet-500" /> Independent platform review</h2>
            <p className="text-xs text-gray-500 mt-1">Ask Claude to review a sanitized snapshot of platform health, content, payments and recent errors.</p>
          </div>
          <Button size="sm" variant="outline" onClick={runReview} disabled={reviewing} icon={<RefreshCw className={`w-4 h-4 ${reviewing ? 'animate-spin' : ''}`} />}>
            {reviewing ? 'Reviewing…' : 'Run review'}
          </Button>
        </div>
        {review?.report ? (
          <div>
            <p className="text-[11px] text-gray-400 mb-2">Model: {review.model} · {new Date(review.generatedAt).toLocaleString()}</p>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/60 rounded-xl p-3 max-h-[420px] overflow-y-auto">{review.report}</pre>
          </div>
        ) : (
          <p className="text-xs text-gray-500">No review has been run yet. This uses the Cloudflare AI binding and is admin-only.</p>
        )}
      </GlassCard>
    </motion.div>
  );
}
