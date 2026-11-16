import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Loader2, Plus, Trash2, User, CheckCircle2, AlertCircle, Eye, Settings, Globe, Video, Save } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmt(date: string, timeZone = 'Africa/Lagos') {
  if (!date) return '—';
  try { return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(date)); }
  catch { return new Date(date).toLocaleString(); }
}

export default function InstructorMentorship() {
  const confirm = useConfirm();
  const [tab, setTab] = useState('overview');
  const [profile, setProfile] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [previewRule, setPreviewRule] = useState<any>(null);
  const [form, setForm] = useState<any>({ weekday: 1, start_time: '09:00', end_time: '12:00', timezone: 'Africa/Lagos', slot_minutes: 45, buffer_minutes: 15, course_id: '', meeting_url: '', valid_from: '', valid_until: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a, s, st, c] = await Promise.all([
        api.get('/mentoring/instructor/profile'),
        api.get('/mentoring/instructor/availability'),
        api.get('/mentoring/instructor/slots'),
        api.get('/mentoring/instructor/stats'),
        api.get('/courses/instructor').catch(() => ({ data: { data: [] } })),
      ]);
      setProfile(p.data.data);
      setAvailability(a.data.data || []);
      setSlots(s.data.data || []);
      setStats(st.data.data || {});
      setCourses(c.data.data || []);
    } catch { toast.error('Failed to load mentorship'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const payload = {
        ...profile,
        topics: typeof profile.topics === 'string' ? profile.topics.split(',').map((t: string) => t.trim()).filter(Boolean) : profile.topics,
        languages: typeof profile.languages === 'string' ? profile.languages.split(',').map((t: string) => t.trim()).filter(Boolean) : profile.languages,
      };
      const { data } = await api.put('/mentoring/instructor/profile', payload);
      setProfile(data.data);
      toast.success('Mentoring profile saved');
    } catch { toast.error('Failed to save profile'); }
    finally { setSavingProfile(false); }
  };

  const createRule = async () => {
    setRuleSaving(true);
    try {
      await api.post('/mentoring/instructor/availability', form);
      toast.success('Availability rule created');
      setRuleOpen(false);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create availability'); }
    finally { setRuleSaving(false); }
  };

  const deleteRule = async (rule: any) => {
    const ok = await confirm({ title: 'Delete availability rule?', message: 'Unbooked generated slots will remain until you delete them.', confirmLabel: 'Delete rule', destructive: true });
    if (!ok) return;
    try { await api.delete(`/mentoring/instructor/availability/${rule.id}`); toast.success('Rule deleted'); load(); }
    catch { toast.error('Failed to delete rule'); }
  };

  const doPreview = async (rule: any) => {
    try {
      const { data } = await api.post(`/mentoring/instructor/availability/${rule.id}/preview`, { weeks: 4 });
      setPreview(data.data);
      setPreviewRule(rule);
    } catch { toast.error('Failed to preview availability'); }
  };

  const approve = async () => {
    if (!previewRule) return;
    try {
      const { data } = await api.post(`/mentoring/instructor/availability/${previewRule.id}/approve`, { weeks: 4 });
      toast.success(`${data.data.created} slots published`);
      setPreview(null); setPreviewRule(null);
      load();
    } catch { toast.error('Failed to publish slots'); }
  };

  const deleteSlot = async (slot: any) => {
    const ok = await confirm({ title: 'Delete this slot?', message: 'Students will no longer see this session.', confirmLabel: 'Delete slot', destructive: true });
    if (!ok) return;
    try { await api.delete(`/mentoring/instructor/slots/${slot.id}`); toast.success('Slot deleted'); load(); }
    catch { toast.error('Failed to delete slot'); }
  };

  const updateSlot = async (slot: any, status: string) => {
    try {
      await api.post(`/mentoring/instructor/slots/${slot.id}/${status === 'completed' ? 'complete' : 'no-show'}`, {});
      toast.success('Session updated'); load();
    } catch { toast.error('Failed to update session'); }
  };

  const resolveReschedule = async (slot: any, approve: boolean) => {
    try {
      await api.post(`/instructor/mentoring-slots/${slot.id}/reschedule/${approve ? 'approve' : 'reject'}`, {});
      toast.success(approve ? 'Reschedule approved' : 'Reschedule declined'); load();
    } catch { toast.error('Failed to update reschedule'); }
  };

  const booked = slots.filter((s) => s.status === 'booked');
  const available = slots.filter((s) => s.status === 'available');
  const past = slots.filter((s) => ['completed', 'no_show', 'cancelled'].includes(s.status));

  if (loading) return <div className="py-20 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">Mentorship</p>
          <h1 className="text-2xl sm:text-3xl font-bold">Your mentoring availability</h1>
          <p className="text-sm text-gray-500 mt-1">Preview and approve availability before students can book.</p>
        </div>
        <Button onClick={() => setRuleOpen(true)} icon={<Plus className="w-4 h-4" />}>Add availability</Button>
      </div>

      <Tabs
        tabs={[
          { key: 'overview', label: 'Overview', icon: Calendar },
          { key: 'availability', label: `Availability (${availability.length})`, icon: Clock },
          { key: 'sessions', label: `Sessions (${booked.length})`, icon: User },
          { key: 'profile', label: 'Profile', icon: Settings },
        ]}
        activeKey={tab}
        onChange={setTab}
        variant="pills"
      />

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ['Total slots', stats.total || 0],
              ['Booked', stats.booked || 0],
              ['Completed', stats.completed || 0],
              ['No-shows', stats.no_show || 0],
              ['This week', stats.this_week || 0],
            ].map(([label, value]) => (
              <GlassCard key={String(label)} hover={false} className="p-4 text-center"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-gray-400">{label}</p></GlassCard>
            ))}
          </div>
          <GlassCard hover={false} className="p-5">
            <h2 className="font-semibold mb-3">Next sessions</h2>
            {booked.slice(0, 5).length === 0 ? <p className="text-sm text-gray-400">No upcoming bookings yet.</p> : booked.slice(0, 5).map((slot) => (
              <div key={slot.id} className="flex items-center justify-between gap-2 border-b border-gray-50 dark:border-gray-800/50 py-2 last:border-0">
                <div><p className="text-sm font-medium">{slot.student_name || 'Student'}</p><p className="text-xs text-gray-400">{fmt(slot.start_time, slot.timezone)} · {slot.title}</p></div>
                <Badge variant="warning">Booked</Badge>
              </div>
            ))}
          </GlassCard>
        </div>
      )}

      {tab === 'availability' && (
        <div className="space-y-3">
          {availability.length === 0 ? <GlassCard hover={false} className="p-10 text-center"><Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="font-medium">No availability rules yet</p><p className="text-sm text-gray-500 mt-1">Add a weekly rule, preview the slots, then approve them.</p></GlassCard> : availability.map((rule) => (
            <GlassCard key={rule.id} hover={false} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{DAYS[rule.weekday]} · {rule.start_time}–{rule.end_time}</p>
                  <p className="text-xs text-gray-500 mt-1">{rule.slot_minutes} min sessions · {rule.buffer_minutes} min buffer · {rule.timezone} {rule.course_title ? `· ${rule.course_title}` : ''}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => doPreview(rule)} icon={<Eye className="w-3.5 h-3.5" />}>Preview</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteRule(rule)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
              </div>
            </GlassCard>
          ))}
          <GlassCard hover={false} className="p-4">
            <h3 className="text-sm font-semibold mb-2">Published slots</h3>
            {available.length === 0 ? <p className="text-xs text-gray-400">No published slots.</p> : available.slice(0, 12).map((slot) => (
              <div key={slot.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <span>{fmt(slot.start_time, slot.timezone)}</span>
                <button onClick={() => deleteSlot(slot)} className="text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </GlassCard>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-3">
          {booked.length === 0 ? <GlassCard hover={false} className="p-10 text-center"><User className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="font-medium">No booked sessions</p></GlassCard> : booked.map((slot) => (
            <GlassCard key={slot.id} hover={false} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{slot.student_name || 'Student'}</p>
                  <p className="text-xs text-gray-500">{slot.student_email} · {slot.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{fmt(slot.start_time, slot.timezone)} ({slot.timezone})</p>
                  {slot.reschedule_status === 'requested' && (
                    <div className="mt-2 rounded-xl border border-amber-300/50 bg-amber-500/5 p-2">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Reschedule requested</p>
                      <p className="text-[11px] text-gray-500">{fmt(slot.proposed_start_time, slot.timezone)} · {slot.reschedule_reason || 'No reason given'}</p>
                      <div className="flex gap-2 mt-2"><Button size="sm" onClick={() => resolveReschedule(slot, true)}>Approve</Button><Button size="sm" variant="outline" onClick={() => resolveReschedule(slot, false)}>Decline</Button></div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {slot.meeting_url && <a href={slot.meeting_url} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" icon={<Video className="w-3.5 h-3.5" />}>Join</Button></a>}
                  <Button size="sm" variant="outline" onClick={() => updateSlot(slot, 'completed')}>Complete</Button>
                  <Button size="sm" variant="ghost" onClick={() => updateSlot(slot, 'no_show')}>No-show</Button>
                </div>
              </div>
            </GlassCard>
          ))}
          {past.length > 0 && <GlassCard hover={false} className="p-4"><h3 className="text-sm font-semibold mb-2">Past sessions</h3>{past.slice(0, 10).map((slot) => <div key={slot.id} className="flex justify-between text-sm py-1"><span>{slot.student_name || 'Student'} · {fmt(slot.start_time, slot.timezone)}</span><Badge>{slot.status}</Badge></div>)}</GlassCard>}
        </div>
      )}

      {tab === 'profile' && profile && (
        <GlassCard hover={false} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Mentoring bio" value={profile.bio || ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
            <Input label="Topics (comma separated)" value={Array.isArray(profile.topics) ? profile.topics.join(', ') : profile.topics || ''} onChange={(e) => setProfile({ ...profile, topics: e.target.value })} />
            <Input label="Languages (comma separated)" value={Array.isArray(profile.languages) ? profile.languages.join(', ') : profile.languages || ''} onChange={(e) => setProfile({ ...profile, languages: e.target.value })} />
            <Input label="Timezone" value={profile.timezone || 'Africa/Lagos'} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} />
            <Input label="Default duration (minutes)" type="number" value={profile.default_duration_minutes || 45} onChange={(e) => setProfile({ ...profile, default_duration_minutes: Number(e.target.value) })} />
            <Input label="Buffer (minutes)" type="number" value={profile.buffer_minutes || 15} onChange={(e) => setProfile({ ...profile, buffer_minutes: Number(e.target.value) })} />
            <Input label="Maximum sessions per week" type="number" value={profile.max_sessions_per_week || 10} onChange={(e) => setProfile({ ...profile, max_sessions_per_week: Number(e.target.value) })} />
            <Input label="Default meeting link" value={profile.default_meeting_url || ''} onChange={(e) => setProfile({ ...profile, default_meeting_url: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!profile.enabled} onChange={(e) => setProfile({ ...profile, enabled: e.target.checked })} /> Mentoring enabled</label>
          <div className="flex justify-end"><Button loading={savingProfile} onClick={saveProfile} icon={<Save className="w-4 h-4" />}>Save profile</Button></div>
        </GlassCard>
      )}

      <Modal isOpen={ruleOpen} onClose={() => setRuleOpen(false)} title="Add weekly availability" size="lg">
        <div className="space-y-3">
          <Select label="Day" value={String(form.weekday)} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })} options={DAYS.map((d, i) => ({ value: String(i), label: d }))} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Start time" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            <Input label="End time" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            <Input label="Session minutes" type="number" value={form.slot_minutes} onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })} />
            <Input label="Buffer minutes" type="number" value={form.buffer_minutes} onChange={(e) => setForm({ ...form, buffer_minutes: Number(e.target.value) })} />
            <Input label="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            <Input label="Meeting link (optional)" value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} />
            <Input label="Valid from (optional)" type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
            <Input label="Valid until (optional)" type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
          </div>
          <Select label="Course (optional)" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} placeholder="General mentoring" options={courses.map((c: any) => ({ value: c.id, label: c.title }))} />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRuleOpen(false)}>Cancel</Button><Button loading={ruleSaving} onClick={createRule}>Create rule</Button></div>
        </div>
      </Modal>

      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title="Preview generated slots" size="lg">
        {preview && <div className="space-y-3"><p className="text-sm text-gray-500">{preview.count} slots will be published. Review them before approving.</p><div className="max-h-72 overflow-y-auto space-y-1">{preview.slots.map((slot: any) => <div key={slot.start_time} className="flex justify-between text-sm border-b border-gray-50 dark:border-gray-800/50 py-1.5"><span>{fmt(slot.start_time, previewRule?.timezone)}</span><span className="text-xs text-gray-400">{slot.duration_minutes} min</span></div>)}</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button><Button onClick={approve} icon={<CheckCircle2 className="w-4 h-4" />}>Approve and publish</Button></div></div>}
      </Modal>
    </motion.div>
  );
}
