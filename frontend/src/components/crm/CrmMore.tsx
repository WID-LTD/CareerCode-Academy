import { useCallback, useEffect, useState } from 'react';
import {
  Award, BadgeCheck, Briefcase, CheckCircle2, FileText, Gift, Layers, ListChecks,
  Loader2, Play, Plus, Send, Settings2, ShieldCheck, Target, Trash2, TrendingUp, Users, Zap,
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

const SECTIONS = [
  { key: 'plans', label: 'Success plans', icon: Target, endpoint: 'success-plans' },
  { key: 'referrals', label: 'Referrals', icon: Gift, endpoint: 'referrals' },
  { key: 'surveys', label: 'Surveys', icon: ListChecks, endpoint: 'surveys' },
  { key: 'contracts', label: 'Contracts', icon: FileText, endpoint: 'contracts' },
  { key: 'playbooks', label: 'Playbooks', icon: Zap, endpoint: 'playbooks' },
  { key: 'approvals', label: 'Approvals', icon: ShieldCheck, endpoint: 'approvals' },
  { key: 'targets', label: 'Targets', icon: TrendingUp, endpoint: 'targets' },
  { key: 'automations', label: 'Automations', icon: Settings2, endpoint: 'automations' },
  { key: 'fields', label: 'Custom fields', icon: Layers, endpoint: 'custom-fields' },
];

function money(value: any, currency = 'NGN') {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

function date(value: any) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function CrmMore({ base, refreshKey }: { base: string; refreshKey: number }) {
  const [section, setSection] = useState('plans');
  const [data, setData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all(SECTIONS.map((s) => api.get(`${base}/${s.endpoint}`).then(({ data }) => [s.key, data.data || []] as const).catch(() => [s.key, []] as const)))
      .then((entries) => setData(Object.fromEntries(entries)))
      .finally(() => setLoading(false));
  }, [base]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const current = SECTIONS.find((s) => s.key === section)!;
  const rows = data[section] || [];

  const create = async () => {
    setSaving(true);
    try {
      await api.post(`${base}/${current.endpoint}`, form);
      toast.success(`${current.label.replace(/s$/, '')} created`);
      setOpen(false);
      setForm({});
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`${base}/${current.endpoint}/${id}`);
      toast.success('Removed');
      load();
    } catch { toast.error('Failed to remove'); }
  };

  const runAutomation = async (id: string) => {
    try { await api.post(`${base}/automations/${id}/run`, {}); toast.success('Automation run recorded'); load(); }
    catch { toast.error('Failed to run automation'); }
  };

  return (
    <div className="space-y-4">
      <Tabs tabs={SECTIONS.map((s) => ({ key: s.key, label: s.label, icon: s.icon })) as any} activeKey={section} onChange={setSection} variant="pills" />
      <div className="flex justify-end"><Button size="sm" onClick={() => { setForm({}); setOpen(true); }} icon={<Plus className="w-4 h-4" />}>New {current.label.replace(/s$/, '')}</Button></div>

      {loading ? <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : rows.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center"><current.icon className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-500">No {current.label.toLowerCase()} yet.</p></GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((row: any) => (
            <GlassCard key={row.id} hover={false} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{row.name || row.title || row.label || row.key || row.type || 'Record'}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {section === 'plans' && `${row.person_name || 'Person'} · ${row.completed || 0}/${row.milestones || 0} milestones`}
                    {section === 'referrals' && `${row.referrer_name || 'No referrer'} · ${row.referred_name || row.referred_email || 'No referral'}`}
                    {section === 'surveys' && `${row.type} · ${row.responses || 0} responses · ${Number(row.average_score || 0).toFixed(1)} average`}
                    {section === 'contracts' && `${row.account_name || row.person_name || 'No account'} · ${money(row.value, row.currency)}`}
                    {section === 'playbooks' && `${row.trigger || 'No trigger'} · ${(row.steps || []).length} steps`}
                    {section === 'approvals' && `${row.entity} · ${row.requested_by_name || 'Unknown'}`}
                    {section === 'targets' && `${row.owner_name || 'Everyone'} · ${row.period} · ${row.metric}`}
                    {section === 'automations' && `${row.trigger} · ${row.runs || 0} runs`}
                    {section === 'fields' && `${row.entity} · ${row.type} · ${row.key}`}
                  </p>
                </div>
                <Badge variant={['active', 'approved', 'completed', 'converted'].includes(row.status) ? 'success' : ['pending', 'draft', 'invited'].includes(row.status) ? 'warning' : 'default'}>{row.status || (row.enabled ? 'enabled' : 'active')}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="text-[11px] text-gray-400">
                  {section === 'targets' && money(row.target_value, row.currency)}
                  {section === 'referrals' && money(row.reward_amount, row.currency)}
                  {section === 'contracts' && date(row.end_date)}
                  {section === 'surveys' && date(row.created_at)}
                  {section === 'approvals' && date(row.created_at)}
                  {section === 'automations' && (row.enabled ? 'Enabled' : 'Paused')}
                  {section === 'fields' && (row.required ? 'Required' : 'Optional')}
                </div>
                <div className="flex gap-1">
                  {section === 'automations' && <Button size="sm" variant="outline" onClick={() => runAutomation(row.id)} icon={<Play className="w-3.5 h-3.5" />}>Run</Button>}
                  <Button size="sm" variant="ghost" onClick={() => remove(row.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title={`New ${current.label.replace(/s$/, '')}`} size="lg">
        <div className="space-y-3">
          {section === 'plans' && <>
            <Input label="Person reference" value={form.person_id || ''} onChange={(e) => setForm({ ...form, person_id: e.target.value })} placeholder="User id" />
            <Input label="Plan name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Onboarding to first project" />
            <Input label="Goal" value={form.goal || ''} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
            <Input label="Target date" type="date" value={form.target_date || ''} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
          </>}
          {section === 'referrals' && <>
            <Input label="Referrer reference" value={form.referrer_id || ''} onChange={(e) => setForm({ ...form, referrer_id: e.target.value })} placeholder="User id" />
            <Input label="Referred name" value={form.referred_name || ''} onChange={(e) => setForm({ ...form, referred_name: e.target.value })} />
            <Input label="Referred email" value={form.referred_email || ''} onChange={(e) => setForm({ ...form, referred_email: e.target.value })} />
            <Input label="Reward amount" type="number" value={form.reward_amount || ''} onChange={(e) => setForm({ ...form, reward_amount: e.target.value })} />
          </>}
          {section === 'surveys' && <>
            <Input label="Survey name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Course experience" />
            <Select label="Type" value={form.type || 'nps'} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: 'nps', label: 'Recommendation score' }, { value: 'csat', label: 'Satisfaction score' }, { value: 'course', label: 'Course feedback' }]} />
          </>}
          {section === 'contracts' && <>
            <Input label="Contract title" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Account reference" value={form.account_id || ''} onChange={(e) => setForm({ ...form, account_id: e.target.value })} placeholder="Optional account id" />
            <Input label="Value" type="number" value={form.value || ''} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            <Input label="End date" type="date" value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </>}
          {section === 'playbooks' && <>
            <Input label="Playbook name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Trigger" value={form.trigger || ''} onChange={(e) => setForm({ ...form, trigger: e.target.value })} placeholder="trial_started" />
            <Input label="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </>}
          {section === 'approvals' && <>
            <Select label="Type" value={form.type || 'discount'} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: 'discount', label: 'Discount' }, { value: 'refund', label: 'Refund' }, { value: 'campaign', label: 'Campaign' }, { value: 'payout', label: 'Payout' }]} />
            <Input label="Entity" value={form.entity || ''} onChange={(e) => setForm({ ...form, entity: e.target.value })} placeholder="payment" />
            <Input label="Entity reference" value={form.entity_id || ''} onChange={(e) => setForm({ ...form, entity_id: e.target.value })} />
            <Input label="Reason" value={form.reason || ''} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </>}
          {section === 'targets' && <>
            <Input label="Owner reference" value={form.owner_id || ''} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} placeholder="Optional user id" />
            <Input label="Period" value={form.period || ''} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="2026-11" />
            <Input label="Metric" value={form.metric || ''} onChange={(e) => setForm({ ...form, metric: e.target.value })} placeholder="revenue" />
            <Input label="Target value" type="number" value={form.target_value || ''} onChange={(e) => setForm({ ...form, target_value: e.target.value })} />
          </>}
          {section === 'automations' && <>
            <Input label="Automation name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Trigger" value={form.trigger || ''} onChange={(e) => setForm({ ...form, trigger: e.target.value })} placeholder="trial_expired" />
          </>}
          {section === 'fields' && <>
            <Select label="Entity" value={form.entity || 'person'} onChange={(e) => setForm({ ...form, entity: e.target.value })} options={[{ value: 'person', label: 'Person' }, { value: 'account', label: 'Account' }, { value: 'opportunity', label: 'Opportunity' }]} />
            <Input label="Key" value={form.key || ''} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="referral_code" />
            <Input label="Label" value={form.label || ''} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Referral code" />
            <Select label="Type" value={form.type || 'text'} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: 'text', label: 'Text' }, { value: 'number', label: 'Number' }, { value: 'date', label: 'Date' }, { value: 'select', label: 'Select' }]} />
          </>}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button loading={saving} onClick={create}>Create</Button></div>
        </div>
      </Modal>
    </div>
  );
}
