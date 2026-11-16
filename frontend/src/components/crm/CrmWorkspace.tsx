import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Award, BarChart3, BookOpen, Briefcase, Building2, Calendar,
  CheckCircle2, ChevronRight, Clock, DollarSign, Eye, FileText, Filter, GitBranch,
  Inbox, Layers, ListChecks, Loader2, Mail, MapPin, MessageCircle, Phone, Plus,
  RefreshCw, Search, Send, Settings, Star, Tag, Target, Trash2, TrendingUp, UserPlus,
  Users, X, Zap,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

type Scope = 'admin' | 'instructor';
type TabKey = 'overview' | 'people' | 'pipeline' | 'accounts' | 'segments' | 'campaigns' | 'inbox' | 'tasks' | 'reports' | 'settings';

interface Props { scope: Scope }

function money(value: any, currency = 'NGN') {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

function shortDate(value: any) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function relative(value: any) {
  if (!value) return 'No activity';
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return '—';
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(value);
}

function stageVariant(stage: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' {
  if (['paid', 'active', 'completed', 'alumni', 'advocate'].includes(stage)) return 'success';
  if (['trial', 'prospect', 'applicant'].includes(stage)) return 'warning';
  if (['at_risk', 'churned'].includes(stage)) return 'danger';
  return 'default';
}

function riskVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 60) return 'danger';
  if (score >= 35) return 'warning';
  return 'success';
}

function CardStat({ label, value, hint, icon: Icon, tone = 'primary' }: { label: string; value: React.ReactNode; hint?: string; icon: any; tone?: string }) {
  const tones: Record<string, string> = {
    primary: 'bg-primary-500/10 text-primary-500',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };
  return (
    <GlassCard hover={false} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl grid place-items-center shrink-0', tones[tone] || tones.primary)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </GlassCard>
  );
}

function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-12 text-center">
      <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function CrmWorkspace({ scope }: Props) {
  const base = scope === 'admin' ? '/admin/crm' : '/instructor/crm';
  const [tab, setTab] = useState<TabKey>('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const tabs = useMemo(() => {
    const adminTabs = [
      { key: 'overview', label: 'Overview', icon: BarChart3 },
      { key: 'people', label: 'People', icon: Users },
      { key: 'pipeline', label: 'Pipeline', icon: GitBranch },
      { key: 'accounts', label: 'Accounts', icon: Building2 },
      { key: 'segments', label: 'Segments', icon: Filter },
      { key: 'campaigns', label: 'Campaigns', icon: Send },
      { key: 'inbox', label: 'Inbox', icon: Inbox },
      { key: 'tasks', label: 'Tasks', icon: ListChecks },
      { key: 'reports', label: 'Reports', icon: TrendingUp },
      { key: 'settings', label: 'Settings', icon: Settings },
    ];
    const instructorTabs = [
      { key: 'overview', label: 'Overview', icon: BarChart3 },
      { key: 'people', label: 'Students', icon: Users },
      { key: 'pipeline', label: 'Learner pipeline', icon: GitBranch },
      { key: 'inbox', label: 'Inbox', icon: Inbox },
      { key: 'tasks', label: 'Tasks', icon: ListChecks },
      { key: 'reports', label: 'Reports', icon: TrendingUp },
    ];
    return scope === 'admin' ? adminTabs : instructorTabs;
  }, [scope]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">
            {scope === 'admin' ? 'Customer relationships' : 'Learner relationships'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {scope === 'admin' ? 'Customer relationships' : 'My learners'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {scope === 'admin'
              ? 'People, accounts, pipeline, campaigns, support and outcomes in one place.'
              : 'Your students, their progress, risk signals, conversations and follow-ups.'}
          </p>
        </div>
        <Button variant="outline" onClick={() => setRefreshKey((k) => k + 1)} icon={<RefreshCw className="w-4 h-4" />}>
          Refresh
        </Button>
      </div>

      <Tabs tabs={tabs as any} activeKey={tab} onChange={(k) => setTab(k as TabKey)} variant="pills" />

      {tab === 'overview' && <OverviewTab base={base} scope={scope} refreshKey={refreshKey} />}
      {tab === 'people' && <PeopleTab base={base} scope={scope} refreshKey={refreshKey} onOpen={setSelectedPerson} />}
      {tab === 'pipeline' && <PipelineTab base={base} scope={scope} refreshKey={refreshKey} onOpenPerson={setSelectedPerson} />}
      {tab === 'accounts' && scope === 'admin' && <AccountsTab base={base} refreshKey={refreshKey} onOpen={setSelectedAccount} />}
      {tab === 'segments' && scope === 'admin' && <SegmentsTab base={base} refreshKey={refreshKey} />}
      {tab === 'campaigns' && scope === 'admin' && <CampaignsTab base={base} refreshKey={refreshKey} />}
      {tab === 'inbox' && <InboxTab base={base} scope={scope} refreshKey={refreshKey} onOpenPerson={setSelectedPerson} />}
      {tab === 'tasks' && <TasksTab base={base} scope={scope} refreshKey={refreshKey} onOpenPerson={setSelectedPerson} />}
      {tab === 'reports' && <ReportsTab base={base} scope={scope} refreshKey={refreshKey} />}
      {tab === 'settings' && scope === 'admin' && <SettingsTab base={base} refreshKey={refreshKey} />}

      {selectedPerson && (
        <PersonDrawer
          base={base}
          scope={scope}
          personId={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {selectedAccount && <AccountDrawer base={base} accountId={selectedAccount} onClose={() => setSelectedAccount(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Overview
// ─────────────────────────────────────────────────────────────
function OverviewTab({ base, scope, refreshKey }: { base: string; scope: Scope; refreshKey: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`${base}/overview`).then(({ data }) => { if (alive) setData(data.data); })
      .catch(() => toast.error('Failed to load relationships overview'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [base, refreshKey]);

  if (loading) return <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  if (!data) return <Empty title="No overview data" />;

  if (scope === 'instructor') {
    const s = data.students || {};
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <CardStat label="My students" value={s.total || 0} icon={Users} hint={`${data.courses?.published || 0} published courses`} />
          <CardStat label="At risk" value={s.at_risk || 0} icon={AlertTriangle} tone="red" hint="Risk score 60 or higher" />
          <CardStat label="Average progress" value={`${Math.round(s.avg_progress || 0)}%`} icon={TrendingUp} tone="green" hint={`${s.completions || 0} completions`} />
          <CardStat label="My course revenue" value={money(data.revenue?.total)} icon={DollarSign} tone="amber" hint={`${data.reviews?.count || 0} reviews`} />
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <GlassCard hover={false} className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Students who need attention</h2>
              <Badge variant="danger" size="sm">{data.at_risk?.length || 0}</Badge>
            </div>
            {(data.at_risk || []).length === 0 ? <Empty title="No at-risk students" hint="Your learners are on track." /> : (
              <div className="space-y-2">
                {data.at_risk.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 truncate">{p.course_title} · {Math.round(p.progress || 0)}%</p>
                    </div>
                    <Badge variant={riskVariant(Number(p.risk_score) || 0)}>Risk {p.risk_score || 0}</Badge>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
          <GlassCard hover={false} className="p-5">
            <h2 className="font-semibold mb-3">Work queue</h2>
            <div className="space-y-3 text-sm">
              <QueueRow label="Open tasks" value={data.tasks?.open || 0} icon={ListChecks} />
              <QueueRow label="Overdue tasks" value={data.tasks?.overdue || 0} icon={Clock} tone="red" />
              <QueueRow label="Open conversations" value={data.inbox?.open || 0} icon={Inbox} />
              <QueueRow label="Pending submissions" value={data.submissions?.pending || 0} icon={FileText} />
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  const p = data.people || {};
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <CardStat label="People" value={p.total || 0} icon={Users} />
        <CardStat label="Leads" value={p.leads || 0} icon={UserPlus} tone="blue" />
        <CardStat label="Trials" value={p.trials || 0} icon={Zap} tone="amber" />
        <CardStat label="Paid" value={p.paid || 0} icon={CheckCircle2} tone="green" />
        <CardStat label="At risk" value={p.at_risk || 0} icon={AlertTriangle} tone="red" />
        <CardStat label="Revenue" value={money(data.revenue?.total)} icon={DollarSign} tone="purple" hint={`${money(data.revenue?.month)} this month`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard hover={false} className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Pipeline</h2>
            <span className="text-xs text-gray-400">{money(data.pipeline?.reduce((sum: number, s: any) => sum + Number(s.value || 0), 0))} open value</span>
          </div>
          <div className="space-y-2">
            {(data.pipeline || []).map((s: any) => {
              const max = Math.max(1, ...(data.pipeline || []).map((x: any) => Number(x.count) || 0));
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-gray-500 truncate">{s.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${(Number(s.count) / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-medium">{s.count}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
        <GlassCard hover={false} className="p-5">
          <h2 className="font-semibold mb-3">Today</h2>
          <div className="space-y-3 text-sm">
            <QueueRow label="Open tasks" value={data.tasks?.open || 0} icon={ListChecks} />
            <QueueRow label="Overdue tasks" value={data.tasks?.overdue || 0} icon={Clock} tone="red" />
            <QueueRow label="Open conversations" value={data.inbox?.open || 0} icon={Inbox} />
            <QueueRow label="Unassigned" value={data.inbox?.unassigned || 0} icon={AlertTriangle} tone="amber" />
            <QueueRow label="Campaigns sent" value={data.campaigns?.sent || 0} icon={Send} />
          </div>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard hover={false} className="p-5">
          <h2 className="font-semibold mb-3">Where people come from</h2>
          {(data.sources || []).length === 0 ? <Empty title="No source data yet" /> : (
            <div className="space-y-2">
              {data.sources.map((s: any) => (
                <div key={s.source} className="flex items-center justify-between gap-3 text-sm">
                  <span className="capitalize text-gray-600 dark:text-gray-300">{String(s.source).replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-400">{s.count} people</span>
                  <span className="text-xs font-medium">{money(s.value)}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
        <GlassCard hover={false} className="p-5">
          <h2 className="font-semibold mb-3">Recent activity</h2>
          {(data.recent || []).length === 0 ? <Empty title="No activity yet" /> : (
            <div className="space-y-3">
              {data.recent.map((a: any) => (
                <div key={a.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 grid place-items-center shrink-0"><Activity className="w-4 h-4" /></div>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{a.subject || a.type}</p>
                    <p className="text-xs text-gray-400">{a.person_name || 'System'} · {relative(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function QueueRow({ label, value, icon: Icon, tone = 'primary' }: { label: string; value: number; icon: any; tone?: string }) {
  const tones: Record<string, string> = { primary: 'text-primary-500', red: 'text-red-500', amber: 'text-amber-500' };
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-gray-500"><Icon className={cn('w-4 h-4', tones[tone])} />{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// People
// ─────────────────────────────────────────────────────────────
function PeopleTab({ base, scope, refreshKey, onOpen }: { base: string; scope: Scope; refreshKey: number; onOpen: (id: string) => void }) {
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [risk, setRisk] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (search.trim()) params.set('search', search.trim());
    if (stage) params.set('stage', stage);
    if (risk === 'high') params.set('risk_min', '60');
    api.get(`${base}/people?${params}`).then(({ data }) => setPeople(data.data || []))
      .catch(() => toast.error('Failed to load people'))
      .finally(() => setLoading(false));
  }, [base, search, stage, risk]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const stageOptions = scope === 'admin'
    ? ['lead', 'prospect', 'applicant', 'trial', 'paid', 'active', 'at_risk', 'completed', 'alumni', 'churned']
    : ['trial', 'paid', 'active', 'at_risk', 'completed', 'alumni'];

  return (
    <div className="space-y-4">
      <GlassCard hover={false} className="p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
          <Select value={stage} onChange={(e) => setStage(e.target.value)} placeholder="All stages" options={stageOptions.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
          <Select value={risk} onChange={(e) => setRisk(e.target.value)} placeholder="All risk levels" options={[{ value: 'high', label: 'High risk' }, { value: 'low', label: 'Healthy' }]} />
          <Button variant="outline" onClick={load} icon={<RefreshCw className="w-4 h-4" />}>Reload</Button>
        </div>
      </GlassCard>

      {loading ? <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : people.length === 0 ? <Empty title="No people match these filters" hint="Try clearing the search or choosing another stage." /> : (
        <GlassCard hover={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] uppercase tracking-wider text-gray-400">
                  <th className="p-3">Person</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3 hidden md:table-cell">Courses</th>
                  <th className="p-3 hidden lg:table-cell">Value</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3 hidden lg:table-cell">Last activity</th>
                  <th className="p-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer" onClick={() => onOpen(p.id)}>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 grid place-items-center text-xs font-bold text-white shrink-0">{String(p.name || '?').charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 truncate">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><Badge variant={stageVariant(p.lifecycle_stage)}>{String(p.lifecycle_stage || 'lead').replace(/_/g, ' ')}</Badge></td>
                    <td className="p-3 hidden md:table-cell text-gray-500">{p.courses || 0}</td>
                    <td className="p-3 hidden lg:table-cell text-gray-500">{money(p.lifetime_value, p.currency || 'NGN')}</td>
                    <td className="p-3"><Badge variant={riskVariant(Number(p.risk_score) || 0)}>{p.risk_score || 0}</Badge></td>
                    <td className="p-3 hidden lg:table-cell text-xs text-gray-400">{relative(p.last_activity_at)}</td>
                    <td className="p-3 text-right"><ChevronRight className="w-4 h-4 text-gray-400 inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Person drawer
// ─────────────────────────────────────────────────────────────
function PersonDrawer({ base, scope, personId, onClose, onChanged }: { base: string; scope: Scope; personId: string; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [note, setNote] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`${base}/people/${personId}`).then(({ data }) => setData(data.data))
      .catch(() => toast.error('Failed to load person'))
      .finally(() => setLoading(false));
  }, [base, personId]);

  useEffect(() => { load(); }, [load]);

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await api.post(`${base}/people/${personId}/notes`, { body: note });
      setNote('');
      toast.success('Note added');
      load();
      onChanged();
    } catch { toast.error('Failed to add note'); }
    finally { setSaving(false); }
  };

  const addTask = async () => {
    if (!taskTitle.trim()) return;
    setSaving(true);
    try {
      await api.post(`${base}/people/${personId}/tasks`, { title: taskTitle });
      setTaskTitle('');
      toast.success('Task created');
      load();
      onChanged();
    } catch { toast.error('Failed to create task'); }
    finally { setSaving(false); }
  };

  const updateStage = async (stage: string) => {
    try {
      await api.put(`${base}/people/${personId}`, { lifecycle_stage: stage });
      toast.success('Stage updated');
      load();
    } catch { toast.error('Failed to update stage'); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl z-50 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{data?.user?.name || 'Person'}</h2>
            <p className="text-xs text-gray-400">{data?.user?.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
        </div>

        {loading ? <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : !data ? <Empty title="Person not found" /> : (
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={stageVariant(data.profile?.lifecycle_stage)}>{String(data.profile?.lifecycle_stage || 'lead').replace(/_/g, ' ')}</Badge>
              <Badge variant={riskVariant(Number(data.profile?.risk_score) || 0)}>Risk {data.profile?.risk_score || 0}</Badge>
              <Badge variant="primary">Engagement {data.profile?.engagement_score || 0}</Badge>
              <Badge variant="success">{money(data.profile?.lifetime_value, data.profile?.currency || 'NGN')}</Badge>
              {(data.profile?.tags || []).map((t: any) => <Badge key={typeof t === 'string' ? t : t.name} variant="default">{typeof t === 'string' ? t : t.name}</Badge>)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <a href={`mailto:${data.user?.email}`} className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"><Mail className="w-4 h-4 text-primary-500" /><span className="truncate">{data.user?.email}</span></a>
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-800 p-3"><Phone className="w-4 h-4 text-primary-500" /><span>{data.profile?.phone || 'No phone'}</span></div>
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-800 p-3"><MapPin className="w-4 h-4 text-primary-500" /><span>{data.profile?.country || data.user?.location || 'No location'}</span></div>
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-800 p-3"><Clock className="w-4 h-4 text-primary-500" /><span>Active {relative(data.profile?.last_activity_at)}</span></div>
            </div>

            {scope === 'admin' && (
              <div className="flex flex-wrap gap-2">
                <Select value={data.profile?.lifecycle_stage || 'lead'} onChange={(e) => updateStage(e.target.value)} options={['lead', 'prospect', 'applicant', 'trial', 'paid', 'active', 'at_risk', 'completed', 'alumni', 'churned'].map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
              </div>
            )}

            <Tabs
              tabs={[
                { key: 'overview', label: 'Overview' },
                { key: 'learning', label: 'Learning' },
                { key: 'money', label: 'Payments' },
                { key: 'activity', label: 'Activity' },
                { key: 'tasks', label: 'Tasks' },
              ]}
              activeKey={tab}
              onChange={setTab}
            />

            {tab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <MiniStat label="Courses" value={data.courses?.length || 0} />
                  <MiniStat label="Certificates" value={data.certificates?.length || 0} />
                  <MiniStat label="Open tasks" value={(data.tasks || []).filter((t: any) => t.status === 'open').length} />
                  <MiniStat label="Payments" value={data.payments?.length || 0} />
                </div>
                <GlassCard hover={false} className="p-4">
                  <h3 className="text-sm font-semibold mb-2">Add a note</h3>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What happened? What should the next person know?" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-3 py-2 text-sm" />
                  <div className="flex justify-end mt-2"><Button size="sm" loading={saving} onClick={addNote}>Save note</Button></div>
                </GlassCard>
                <GlassCard hover={false} className="p-4">
                  <h3 className="text-sm font-semibold mb-2">Recent activity</h3>
                  {(data.activities || []).length === 0 ? <p className="text-xs text-gray-400">No notes yet.</p> : (
                    <div className="space-y-3">
                      {data.activities.slice(0, 8).map((a: any) => (
                        <div key={a.id} className="flex gap-3">
                          <div className="w-7 h-7 rounded-lg bg-primary-500/10 text-primary-500 grid place-items-center shrink-0"><Activity className="w-3.5 h-3.5" /></div>
                          <div className="min-w-0">
                            <p className="text-sm">{a.subject || a.type}</p>
                            {a.body && <p className="text-xs text-gray-500 whitespace-pre-wrap">{a.body}</p>}
                            <p className="text-[11px] text-gray-400">{a.owner_name || 'System'} · {relative(a.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>
            )}

            {tab === 'learning' && (
              <div className="space-y-2">
                {(data.courses || []).length === 0 ? <Empty title="No courses yet" /> : data.courses.map((c: any) => (
                  <GlassCard key={c.enrollment_id || c.course_id} hover={false} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">{c.title}</p>
                        <p className="text-xs text-gray-400 capitalize">{c.access_type?.replace(/_/g, ' ')} · {c.level}</p>
                      </div>
                      <Badge variant={c.completed ? 'success' : 'primary'}>{c.completed ? 'Completed' : `${Math.round(c.progress || 0)}%`}</Badge>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-primary-500" style={{ width: `${Math.min(100, Math.max(0, Number(c.progress) || 0))}%` }} /></div>
                    <p className="mt-2 text-[11px] text-gray-400">{c.lessons_done || 0} lessons done · enrolled {shortDate(c.enrolled_at)}</p>
                  </GlassCard>
                ))}
              </div>
            )}

            {tab === 'money' && (
              <div className="space-y-2">
                {(data.payments || []).length === 0 ? <Empty title="No payments yet" /> : data.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                    <div>
                      <p className="text-sm font-medium">{money(p.amount, p.currency)}</p>
                      <p className="text-xs text-gray-400">{p.course_title || 'Course'} · {p.provider}</p>
                    </div>
                    <Badge variant={p.status === 'completed' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}

            {tab === 'activity' && (
              <div className="space-y-3">
                {(data.activities || []).length === 0 ? <Empty title="No activity" /> : data.activities.map((a: any) => (
                  <div key={a.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                    <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{a.subject || a.type}</p><span className="text-[11px] text-gray-400">{relative(a.created_at)}</span></div>
                    {a.body && <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{a.body}</p>}
                  </div>
                ))}
              </div>
            )}

            {tab === 'tasks' && (
              <div className="space-y-3">
                <GlassCard hover={false} className="p-4">
                  <h3 className="text-sm font-semibold mb-2">Create a task</h3>
                  <div className="flex gap-2">
                    <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Follow up about the trial" />
                    <Button size="sm" loading={saving} onClick={addTask}>Add</Button>
                  </div>
                </GlassCard>
                {(data.tasks || []).length === 0 ? <Empty title="No tasks" /> : data.tasks.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                    <div>
                      <p className={cn('text-sm', t.status === 'completed' && 'line-through text-gray-400')}>{t.title}</p>
                      <p className="text-xs text-gray-400">{t.due_at ? `Due ${shortDate(t.due_at)}` : 'No due date'} · {t.priority}</p>
                    </div>
                    <Badge variant={t.status === 'completed' ? 'success' : 'warning'}>{t.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3 text-center"><p className="text-lg font-bold">{value}</p><p className="text-[11px] text-gray-400">{label}</p></div>;
}

// ─────────────────────────────────────────────────────────────
// Pipeline
// ─────────────────────────────────────────────────────────────
function PipelineTab({ base, scope, refreshKey, onOpenPerson }: { base: string; scope: Scope; refreshKey: number; onOpenPerson: (id: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', value: '', stage_id: '', person_id: '', account_id: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const url = scope === 'admin' ? `${base}/pipeline?kind=opportunity` : `${base}/pipeline`;
    api.get(url).then(({ data }) => setData(data.data)).catch(() => toast.error('Failed to load pipeline')).finally(() => setLoading(false));
  }, [base, scope]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const move = async (id: string, stageId: string) => {
    try { await api.put(`${base}/opportunities/${id}`, { stage_id: stageId }); load(); }
    catch { toast.error('Failed to move opportunity'); }
  };

  const create = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post(`${base}/opportunities`, { ...form, value: Number(form.value) || 0 });
      toast.success('Opportunity created');
      setCreateOpen(false);
      setForm({ title: '', value: '', stage_id: '', person_id: '', account_id: '' });
      load();
    } catch { toast.error('Failed to create opportunity'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  if (!data) return <Empty title="No pipeline data" />;

  if (scope === 'instructor') {
    const stages = data.stages || [];
    const learners = data.learners || [];
    const stageFor = (p: any) => {
      if (p.lifecycle_stage === 'at_risk' || Number(p.risk_score) >= 60) return 'learner_risk';
      if (p.lifecycle_stage === 'completed') return 'learner_completed';
      if (p.lifecycle_stage === 'alumni') return 'learner_alumni';
      if (p.lifecycle_stage === 'trial') return 'learner_new';
      if (p.lifecycle_stage === 'paid' || p.lifecycle_stage === 'active') return 'learner_active';
      return 'learner_new';
    };
    return (
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stages.map((s: any) => {
          const items = learners.filter((p: any) => stageFor(p) === s.key);
          return (
            <GlassCard key={s.id} hover={false} className="p-3 min-h-[180px]">
              <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{s.label}</p><Badge size="sm">{items.length}</Badge></div>
              <div className="space-y-2">
                {items.map((p: any) => (
                  <button key={p.id} onClick={() => onOpenPerson(p.id)} className="w-full text-left rounded-xl border border-gray-100 dark:border-gray-800 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{p.email}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400"><span>{Math.round(p.progress || 0)}%</span><Badge variant={riskVariant(Number(p.risk_score) || 0)}>{p.risk_score || 0}</Badge></div>
                  </button>
                ))}
                {items.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">Empty</p>}
              </div>
            </GlassCard>
          );
        })}
      </div>
    );
  }

  const stages = data.stages || [];
  const opportunities = data.opportunities || [];
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={() => setCreateOpen(true)} icon={<Plus className="w-4 h-4" />}>New opportunity</Button></div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
        {stages.map((s: any) => {
          const items = opportunities.filter((o: any) => o.stage_id === s.id);
          return (
            <GlassCard key={s.id} hover={false} className="p-3 min-h-[200px]">
              <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{s.label}</p><Badge size="sm">{items.length}</Badge></div>
              <div className="space-y-2">
                {items.map((o: any) => (
                  <div key={o.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-2">
                    <p className="text-sm font-medium truncate">{o.title}</p>
                    <p className="text-[11px] text-gray-400 truncate">{o.person_name || o.account_name || 'No contact'}</p>
                    <p className="text-xs font-semibold mt-1">{money(o.value, o.currency)}</p>
                    <div className="mt-2 flex gap-1">
                      {stages.map((target: any) => target.id !== s.id && (
                        <button key={target.id} onClick={() => move(o.id, target.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-primary-100" title={`Move to ${target.label}`}>{target.label.slice(0, 2)}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {items.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">Empty</p>}
              </div>
            </GlassCard>
          );
        })}
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New opportunity">
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Corporate training for Acme" />
          <Input label="Value" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="250000" />
          <Select label="Stage" value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: e.target.value })} placeholder="First stage" options={stages.map((s: any) => ({ value: s.id, label: s.label }))} />
          <Input label="Person reference" value={form.person_id} onChange={(e) => setForm({ ...form, person_id: e.target.value })} placeholder="Optional person reference" />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button loading={saving} onClick={create}>Create</Button></div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────────────────────
function AccountsTab({ base, refreshKey, onOpen }: { base: string; refreshKey: number; onOpen: (id: string) => void }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'school', email: '', phone: '', country: '', status: 'prospect' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`${base}/accounts`).then(({ data }) => setAccounts(data.data || [])).catch(() => toast.error('Failed to load accounts')).finally(() => setLoading(false));
  }, [base]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const create = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post(`${base}/accounts`, form);
      toast.success('Account created');
      setOpen(false);
      setForm({ name: '', type: 'school', email: '', phone: '', country: '', status: 'prospect' });
      load();
    } catch { toast.error('Failed to create account'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)} icon={<Plus className="w-4 h-4" />}>New account</Button></div>
      {loading ? <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : accounts.length === 0 ? <Empty title="No accounts yet" hint="Add schools, employers and partners here." /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {accounts.map((a) => (
            <GlassCard key={a.id} hover={false} className="p-4 cursor-pointer" onClick={() => onOpen(a.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 grid place-items-center"><Building2 className="w-5 h-5" /></div>
                <Badge variant={a.status === 'active' ? 'success' : 'warning'}>{a.status}</Badge>
              </div>
              <p className="font-semibold mt-3">{a.name}</p>
              <p className="text-xs text-gray-400 capitalize">{String(a.type).replace(/_/g, ' ')} · {a.country || 'No country'}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div><p className="font-semibold">{a.contacts || 0}</p><p className="text-gray-400">Contacts</p></div>
                <div><p className="font-semibold">{a.opportunities || 0}</p><p className="text-gray-400">Deals</p></div>
                <div><p className="font-semibold">{money(a.won_value, a.currency)}</p><p className="text-gray-400">Won</p></div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="New account">
        <div className="space-y-3">
          <Input label="Account name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Lagos Business School" />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: 'school', label: 'School' }, { value: 'employer', label: 'Employer' }, { value: 'partner', label: 'Partner' }, { value: 'corporate', label: 'Corporate training' }, { value: 'vendor', label: 'Vendor' }]} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button loading={saving} onClick={create}>Create</Button></div>
        </div>
      </Modal>
    </div>
  );
}

function AccountDrawer({ base, accountId, onClose }: { base: string; accountId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get(`${base}/accounts/${accountId}`).then(({ data }) => setData(data.data)).catch(() => toast.error('Failed to load account')); }, [base, accountId]);
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl z-50 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{data?.account?.name || 'Account'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
        </div>
        {!data ? <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : (
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2"><Badge variant="primary">{data.account.type}</Badge><Badge variant={data.account.status === 'active' ? 'success' : 'warning'}>{data.account.status}</Badge><Badge variant="default">{data.account.country || 'No country'}</Badge></div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3"><p className="text-xs text-gray-400">Annual value</p><p className="font-semibold">{money(data.account.annual_value, data.account.currency)}</p></div>
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3"><p className="text-xs text-gray-400">Health</p><p className="font-semibold">{data.account.health_score}</p></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Contacts</h3>
              {(data.contacts || []).length === 0 ? <p className="text-xs text-gray-400">No contacts yet.</p> : data.contacts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 dark:border-gray-800 p-3 mb-2"><div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-gray-400">{c.email || c.phone || c.role}</p></div><Badge>{c.role}</Badge></div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Opportunities</h3>
              {(data.opportunities || []).length === 0 ? <p className="text-xs text-gray-400">No opportunities yet.</p> : data.opportunities.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 dark:border-gray-800 p-3 mb-2"><div><p className="text-sm font-medium">{o.title}</p><p className="text-xs text-gray-400">{o.stage_label}</p></div><span className="text-sm font-semibold">{money(o.value, o.currency)}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Segments
// ─────────────────────────────────────────────────────────────
const RULE_FIELDS = [
  { value: 'lifecycle_stage', label: 'Lifecycle stage' },
  { value: 'risk_score', label: 'Risk score' },
  { value: 'engagement_score', label: 'Engagement score' },
  { value: 'lifetime_value', label: 'Lifetime value' },
  { value: 'last_activity_days', label: 'Days since activity' },
  { value: 'trial_days_left', label: 'Trial days left' },
  { value: 'completed_courses', label: 'Completed courses' },
  { value: 'certificate_count', label: 'Certificates' },
  { value: 'failed_payments', label: 'Failed payments' },
  { value: 'lead_source', label: 'Lead source' },
  { value: 'country', label: 'Country' },
  { value: 'tag', label: 'Tag' },
];

function SegmentsTab({ base, refreshKey }: { base: string; refreshKey: number }) {
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: '', description: '', match: 'all', rules: [{ field: 'lifecycle_stage', op: 'eq', value: 'trial' }] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`${base}/segments`).then(({ data }) => setSegments(data.data || [])).catch(() => toast.error('Failed to load segments')).finally(() => setLoading(false));
  }, [base]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const previewSegment = async (id: string) => {
    try {
      const { data } = await api.post(`${base}/segments/${id}/preview`, {});
      setPreview({ id, ...data.data });
    } catch { toast.error('Failed to preview segment'); }
  };

  const create = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post(`${base}/segments`, { name: form.name, description: form.description, definition: { match: form.match, rules: form.rules } });
      toast.success('Segment created');
      setOpen(false);
      setForm({ name: '', description: '', match: 'all', rules: [{ field: 'lifecycle_stage', op: 'eq', value: 'trial' }] });
      load();
    } catch { toast.error('Failed to create segment'); }
    finally { setSaving(false); }
  };

  const refreshSegment = async (id: string) => {
    try { const { data } = await api.post(`${base}/segments/${id}/refresh`, {}); toast.success(`Segment refreshed: ${data.data.count} people`); load(); }
    catch { toast.error('Failed to refresh segment'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)} icon={<Plus className="w-4 h-4" />}>New segment</Button></div>
      {loading ? <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {segments.map((s) => (
            <GlassCard key={s.id} hover={false} className="p-4">
              <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{s.name}</p><p className="text-xs text-gray-400">{s.description || 'Rule-based audience'}</p></div><Badge variant="primary">{s.last_count || 0}</Badge></div>
              <p className="mt-3 text-[11px] text-gray-400">{Array.isArray(s.definition?.rules) ? s.definition.rules.length : 0} rules · updated {relative(s.last_run_at)}</p>
              <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => previewSegment(s.id)} icon={<Eye className="w-3.5 h-3.5" />}>Preview</Button><Button size="sm" variant="ghost" onClick={() => refreshSegment(s.id)} icon={<RefreshCw className="w-3.5 h-3.5" />}>Refresh</Button></div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title="Segment preview" size="lg">
        {preview && <div className="space-y-3"><p className="text-sm"><strong>{preview.count}</strong> people match this segment.</p>{preview.sample?.map((p: any) => <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 p-2"><div><p className="text-sm">{p.name}</p><p className="text-xs text-gray-400">{p.email}</p></div><Badge variant={riskVariant(Number(p.risk_score) || 0)}>{p.risk_score || 0}</Badge></div>)}</div>}
      </Modal>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="New segment" size="lg">
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Trial ending this week" />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="People to nudge before their trial ends" />
          <div className="space-y-2">
            {form.rules.map((rule: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5"><Select value={rule.field} onChange={(e) => { const rules = [...form.rules]; rules[i] = { ...rule, field: e.target.value }; setForm({ ...form, rules }); }} options={RULE_FIELDS} /></div>
                <div className="col-span-3"><Select value={rule.op} onChange={(e) => { const rules = [...form.rules]; rules[i] = { ...rule, op: e.target.value }; setForm({ ...form, rules }); }} options={[{ value: 'eq', label: 'equals' }, { value: 'neq', label: 'not equal' }, { value: 'gte', label: 'at least' }, { value: 'lte', label: 'at most' }, { value: 'gt', label: 'greater' }, { value: 'lt', label: 'less' }, { value: 'contains', label: 'contains' }]} /></div>
                <div className="col-span-3"><Input value={rule.value} onChange={(e) => { const rules = [...form.rules]; rules[i] = { ...rule, value: e.target.value }; setForm({ ...form, rules }); }} /></div>
                <div className="col-span-1"><button onClick={() => setForm({ ...form, rules: form.rules.filter((_: any, idx: number) => idx !== i) })} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button></div>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, rules: [...form.rules, { field: 'risk_score', op: 'gte', value: '60' }] })} icon={<Plus className="w-3.5 h-3.5" />}>Add rule</Button>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button loading={saving} onClick={create}>Create segment</Button></div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Campaigns
// ─────────────────────────────────────────────────────────────
function CampaignsTab({ base, refreshKey }: { base: string; refreshKey: number }) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', channel: 'email', segment_id: '', template_id: '', goal: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get(`${base}/campaigns`), api.get(`${base}/segments`), api.get(`${base}/templates`)]).then(([c, s, t]) => {
      setCampaigns(c.data.data || []); setSegments(s.data.data || []); setTemplates(t.data.data || []);
    }).catch(() => toast.error('Failed to load campaigns')).finally(() => setLoading(false));
  }, [base]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const create = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post(`${base}/campaigns`, form);
      toast.success('Campaign created');
      setOpen(false);
      setForm({ name: '', channel: 'email', segment_id: '', template_id: '', goal: '' });
      load();
    } catch { toast.error('Failed to create campaign'); }
    finally { setSaving(false); }
  };

  const send = async (id: string) => {
    try {
      const { data } = await api.post(`${base}/campaigns/${id}/send`, {});
      toast.success(`Sent to ${data.data.sent} people`);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to send campaign'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)} icon={<Plus className="w-4 h-4" />}>New campaign</Button></div>
      {loading ? <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : campaigns.length === 0 ? <Empty title="No campaigns yet" hint="Create an audience segment first, then send a campaign." /> : (
        <GlassCard hover={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] uppercase tracking-wider text-gray-400"><th className="p-3">Campaign</th><th className="p-3">Channel</th><th className="p-3">Audience</th><th className="p-3">Sent</th><th className="p-3">Converted</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr></thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800/50">
                    <td className="p-3"><p className="font-medium">{c.name}</p><p className="text-xs text-gray-400">{c.segment_name || 'No segment'} · {c.template_name || 'No template'}</p></td>
                    <td className="p-3 capitalize text-gray-500">{c.channel.replace(/_/g, ' ')}</td>
                    <td className="p-3">{c.audience_count || 0}</td>
                    <td className="p-3">{c.sent_count || 0}</td>
                    <td className="p-3">{c.converted_count || 0}</td>
                    <td className="p-3"><Badge variant={c.status === 'sent' ? 'success' : c.status === 'sending' ? 'warning' : 'default'}>{c.status}</Badge></td>
                    <td className="p-3 text-right">{c.status !== 'sent' && <Button size="sm" variant="outline" onClick={() => send(c.id)} icon={<Send className="w-3.5 h-3.5" />}>Send</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="New campaign" size="lg">
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Trial ending in 3 days" />
          <Select label="Channel" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} options={[{ value: 'email', label: 'Email' }, { value: 'in_app', label: 'In-app notification' }, { value: 'push', label: 'Push notification' }]} />
          <Select label="Audience segment" value={form.segment_id} onChange={(e) => setForm({ ...form, segment_id: e.target.value })} placeholder="Choose a segment" options={segments.map((s) => ({ value: s.id, label: `${s.name} (${s.last_count || 0})` }))} />
          <Select label="Template" value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })} placeholder="Choose a template" options={templates.filter((t) => t.channel === form.channel || form.channel === 'in_app').map((t) => ({ value: t.id, label: t.name }))} />
          <Input label="Goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="Start a trial or complete a lesson" />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button loading={saving} onClick={create}>Create campaign</Button></div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Inbox
// ─────────────────────────────────────────────────────────────
function InboxTab({ base, scope, refreshKey, onOpenPerson }: { base: string; scope: Scope; refreshKey: number; onOpenPerson: (id: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`${base}/inbox`).then(({ data }) => { setItems(data.data || []); if (!selected && data.data?.[0]) setSelected(data.data[0].id); })
      .catch(() => toast.error('Failed to load inbox')).finally(() => setLoading(false));
  }, [base, selected]);
  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    if (!selected) return;
    api.get(`${base}/inbox/${selected}`).then(({ data }) => setDetail(data.data)).catch(() => setDetail(null));
  }, [base, selected]);

  const send = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await api.post(`${base}/inbox/${selected}/reply`, { body: reply });
      setReply('');
      toast.success('Reply sent');
      load();
      const { data } = await api.get(`${base}/inbox/${selected}`);
      setDetail(data.data);
    } catch { toast.error('Failed to send reply'); }
    finally { setSending(false); }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-3 min-h-[500px]">
      <GlassCard hover={false} className="p-2 overflow-y-auto max-h-[70vh]">
        {loading ? <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : items.length === 0 ? <Empty title="Inbox is clear" /> : items.map((c) => (
          <button key={c.id} onClick={() => setSelected(c.id)} className={cn('w-full text-left p-3 rounded-xl mb-1', selected === c.id ? 'bg-primary-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50')}>
            <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium truncate">{c.subject || 'Conversation'}</p><Badge variant={c.status === 'open' ? 'warning' : 'success'} size="sm">{c.status}</Badge></div>
            <p className="text-xs text-gray-400 truncate">{c.person_name || c.person_email || c.channel}</p>
            <p className="text-[11px] text-gray-400 truncate mt-1">{c.last_message || 'No messages yet'}</p>
          </button>
        ))}
      </GlassCard>
      <GlassCard hover={false} className="p-4 lg:col-span-2 flex flex-col max-h-[70vh]">
        {!detail ? <Empty title="Select a conversation" /> : (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div><h2 className="font-semibold">{detail.conversation.subject || 'Conversation'}</h2><p className="text-xs text-gray-400">{detail.conversation.person_name} · {detail.conversation.channel}</p></div>
              <div className="flex gap-2">
                {detail.conversation.person_id && <Button size="sm" variant="outline" onClick={() => onOpenPerson(detail.conversation.person_id)}>Open person</Button>}
                <Badge variant={detail.conversation.status === 'open' ? 'warning' : 'success'}>{detail.conversation.status}</Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {(detail.messages || []).map((m: any) => (
                <div key={m.id} className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm', m.direction === 'inbound' ? 'bg-gray-100 dark:bg-gray-800' : m.is_internal ? 'bg-amber-500/10 ml-auto' : 'bg-primary-500/10 ml-auto')}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{m.author_name || m.direction} · {relative(m.created_at)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Write a reply or internal note..." className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-3 py-2 text-sm" />
              <div className="flex justify-end mt-2"><Button size="sm" loading={sending} onClick={send} icon={<Send className="w-3.5 h-3.5" />}>Send reply</Button></div>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tasks
// ─────────────────────────────────────────────────────────────
function TasksTab({ base, scope, refreshKey, onOpenPerson }: { base: string; scope: Scope; refreshKey: number; onOpenPerson: (id: string) => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_at: '', priority: 'medium', person_id: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`${base}/tasks`).then(({ data }) => setTasks(data.data || [])).catch(() => toast.error('Failed to load tasks')).finally(() => setLoading(false));
  }, [base]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const create = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (scope === 'instructor' && !form.person_id) { toast.error('Choose a student for this task'); setSaving(false); return; }
      await api.post(`${base}/tasks`, form);
      toast.success('Task created');
      setOpen(false);
      setForm({ title: '', description: '', due_at: '', priority: 'medium', person_id: '' });
      load();
    } catch { toast.error('Failed to create task'); }
    finally { setSaving(false); }
  };

  const complete = async (id: string) => {
    try { await api.put(`${base}/tasks/${id}`, { status: 'completed' }); load(); }
    catch { toast.error('Failed to update task'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)} icon={<Plus className="w-4 h-4" />}>New task</Button></div>
      {loading ? <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : tasks.length === 0 ? <Empty title="No tasks yet" hint="Create follow-ups for learners, leads and accounts." /> : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <GlassCard key={t.id} hover={false} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', t.status === 'completed' && 'line-through text-gray-400')}>{t.title}</p>
                  {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">{t.person_name || 'No person'} · {t.due_at ? `Due ${shortDate(t.due_at)}` : 'No due date'} · {t.priority}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.person_id && <Button size="sm" variant="ghost" onClick={() => onOpenPerson(t.person_id)}>Person</Button>}
                  {t.status !== 'completed' && <Button size="sm" variant="outline" onClick={() => complete(t.id)} icon={<CheckCircle2 className="w-3.5 h-3.5" />}>Done</Button>}
                  <Badge variant={t.status === 'completed' ? 'success' : 'warning'}>{t.status}</Badge>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} title="New task" size="lg">
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Follow up after trial" />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input label="Due date" type="date" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
          <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
          <Input label="Person reference" value={form.person_id} onChange={(e) => setForm({ ...form, person_id: e.target.value })} placeholder="Optional person reference" />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button loading={saving} onClick={create}>Create task</Button></div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────
function ReportsTab({ base, scope, refreshKey }: { base: string; scope: Scope; refreshKey: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api.get(`${base}/reports`).then(({ data }) => setData(data.data)).catch(() => toast.error('Failed to load reports')).finally(() => setLoading(false));
  }, [base, refreshKey]);

  if (loading) return <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  if (!data) return <Empty title="No report data" />;

  if (scope === 'instructor') {
    return (
      <div className="space-y-4">
        <GlassCard hover={false} className="p-5">
          <h2 className="font-semibold mb-3">Course performance</h2>
          <div className="space-y-2">
            {(data.courses || []).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate">{c.title}</span><span className="text-xs text-gray-400">{c.students} students</span><span className="text-xs font-medium">{Math.round(c.avg_progress || 0)}%</span><span className="text-xs text-gray-400">{c.completions} completed</span></div>
            ))}
          </div>
        </GlassCard>
        <div className="grid md:grid-cols-2 gap-4">
          <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-3">Risk bands</h2>{(data.risk || []).map((r: any) => <div key={r.band} className="flex justify-between text-sm py-1"><span className="capitalize">{r.band}</span><span className="font-medium">{r.people}</span></div>)}</GlassCard>
          <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-3">Reviews</h2>{(data.reviews || []).map((r: any) => <div key={r.title} className="flex justify-between text-sm py-1"><span className="truncate">{r.title}</span><span className="font-medium">{Number(r.rating).toFixed(1)} · {r.reviews}</span></div>)}</GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-3">Lifecycle funnel</h2>{(data.funnel || []).map((f: any) => <div key={f.stage} className="flex justify-between text-sm py-1"><span className="capitalize">{String(f.stage).replace(/_/g, ' ')}</span><span className="font-medium">{f.count}</span></div>)}</GlassCard>
        <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-3">Revenue by month</h2>{(data.revenue || []).slice().reverse().map((r: any) => <div key={r.month} className="flex justify-between text-sm py-1"><span>{r.month}</span><span className="font-medium">{money(r.revenue)}</span><span className="text-xs text-red-400">{r.refunds ? `-${money(r.refunds)}` : ''}</span></div>)}</GlassCard>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-3">Sources</h2>{(data.sources || []).map((s: any) => <div key={s.source} className="flex justify-between text-sm py-1"><span className="capitalize">{String(s.source).replace(/_/g, ' ')}</span><span>{s.people} people</span><span className="font-medium">{money(s.value)}</span></div>)}</GlassCard>
        <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-3">Support</h2>{(data.support || []).map((s: any) => <div key={s.status} className="flex justify-between text-sm py-1"><span className="capitalize">{s.status}</span><span className="font-medium">{s.count}</span></div>)}</GlassCard>
      </div>
      <GlassCard hover={false} className="p-5">
        <h2 className="font-semibold mb-3">Course performance</h2>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800"><th className="p-2">Course</th><th className="p-2">Level</th><th className="p-2">Students</th><th className="p-2">Progress</th><th className="p-2">Completions</th><th className="p-2">Revenue</th></tr></thead><tbody>{(data.courses || []).map((c: any) => <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800/50"><td className="p-2 truncate max-w-[260px]">{c.title}</td><td className="p-2 capitalize">{c.level}</td><td className="p-2">{c.students}</td><td className="p-2">{Math.round(c.avg_progress || 0)}%</td><td className="p-2">{c.completions}</td><td className="p-2">{money(c.revenue)}</td></tr>)}</tbody></table></div>
      </GlassCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────
function SettingsTab({ base, refreshKey }: { base: string; refreshKey: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`${base}/settings`).then(({ data }) => setData(data.data)).catch(() => toast.error('Failed to load settings')).finally(() => setLoading(false));
  }, [base]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const refreshScores = async () => {
    setRefreshing(true);
    try { await api.post(`${base}/maintenance/refresh`, {}); toast.success('Relationship profiles refreshed'); load(); }
    catch { toast.error('Failed to refresh profiles'); }
    finally { setRefreshing(false); }
  };

  if (loading) return <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  if (!data) return <Empty title="No settings" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" variant="outline" loading={refreshing} onClick={refreshScores} icon={<RefreshCw className="w-4 h-4" />}>Recalculate scores</Button></div>
      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-3">Pipeline stages</h2><div className="space-y-2">{(data.stages || []).map((s: any) => <div key={s.id} className="flex items-center justify-between text-sm"><span>{s.label}</span><Badge>{s.kind}</Badge></div>)}</div></GlassCard>
        <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-3">Tags</h2><div className="flex flex-wrap gap-2">{(data.tags || []).map((t: any) => <Badge key={t.id} variant="default">{t.name}</Badge>)}</div></GlassCard>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-3">Templates</h2><div className="space-y-2">{(data.templates || []).map((t: any) => <div key={t.id} className="flex items-center justify-between text-sm"><span className="truncate">{t.name}</span><Badge>{t.channel}</Badge></div>)}</div></GlassCard>
        <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-3">Playbooks</h2><div className="space-y-2">{(data.playbooks || []).map((p: any) => <div key={p.id} className="flex items-center justify-between text-sm"><span>{p.name}</span><Badge>{p.status}</Badge></div>)}</div></GlassCard>
      </div>
      <GlassCard hover={false} className="p-5"><h2 className="font-semibold mb-3">Owners</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{(data.owners || []).map((o: any) => <div key={o.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3"><p className="text-sm font-medium">{o.name}</p><p className="text-xs text-gray-400">{o.email} · {o.role}</p></div>)}</div></GlassCard>
    </div>
  );
}
