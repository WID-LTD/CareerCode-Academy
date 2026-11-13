import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Loader2, Save, Ticket } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

export default function TrialSettings() {
  const [form, setForm] = useState<any>({ enabled: true, default_days: 7, campaign_start: '', campaign_end: '', certificate_allowed: false, oral_defense_allowed: true, gigo_daily_limit: 20, max_trials: 1, reset_allowed: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/crm/settings/trials').then(({ data }) => {
      if (data.data) setForm({ ...data.data, enabled: !!data.data.enabled, certificate_allowed: !!data.data.certificate_allowed, oral_defense_allowed: !!data.data.oral_defense_allowed, reset_allowed: !!data.data.reset_allowed });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/admin/crm/settings/trials', form);
      setForm({ ...data.data, enabled: !!data.data.enabled, certificate_allowed: !!data.data.certificate_allowed, oral_defense_allowed: !!data.data.oral_defense_allowed, reset_allowed: !!data.data.reset_allowed });
      toast.success('Trial settings saved');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl space-y-5">
      <div><h1 className="text-2xl sm:text-3xl font-bold">Trial Settings</h1><p className="text-gray-500 mt-1">Control free trial availability, dates, duration and limits.</p></div>
      <GlassCard className="p-6 space-y-5" hover={false}>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div><p className="font-medium text-sm">Free trials enabled</p><p className="text-xs text-gray-500">When off, learners can only buy courses.</p></div>
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="w-5 h-5" />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-gray-500">Default duration (days)</label><input type="number" min={1} value={form.default_days} onChange={(e) => setForm({ ...form, default_days: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-medium text-gray-500">Maximum trials per user</label><input type="number" min={1} value={form.max_trials} onChange={(e) => setForm({ ...form, max_trials: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-medium text-gray-500">Campaign start</label><input type="datetime-local" value={(form.campaign_start || '').slice(0, 16)} onChange={(e) => setForm({ ...form, campaign_start: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-medium text-gray-500">Campaign end</label><input type="datetime-local" value={(form.campaign_end || '').slice(0, 16)} onChange={(e) => setForm({ ...form, campaign_end: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-medium text-gray-500">GiGo daily limit during trial</label><input type="number" min={0} value={form.gigo_daily_limit} onChange={(e) => setForm({ ...form, gigo_daily_limit: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" /></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {[['certificate_allowed','Certificates during trial'],['oral_defense_allowed','Oral defense during trial'],['reset_allowed','Allow admin trial reset']].map(([key,label]) => (
            <label key={key} className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-xs"><input type="checkbox" checked={!!form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} /> {label}</label>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500"><CalendarDays className="w-4 h-4" /> Current campaign: 13 November 2026 to 20 November 2026.</div>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} Save settings</Button>
      </GlassCard>
    </motion.div>
  );
}
