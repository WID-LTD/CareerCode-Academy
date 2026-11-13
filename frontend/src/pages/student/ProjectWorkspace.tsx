import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, ClipboardList, Clock3, ExternalLink, Github, Loader2,
  MessageSquare, Plus, Rocket, Send, Sparkles, Target, Upload, Video, XCircle,
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const COLUMNS = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

type Tab = 'board' | 'standups' | 'retro' | 'defense';

export default function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('board');
  const [ticketForm, setTicketForm] = useState({ title: '', description: '', priority: 'medium', estimate_hours: '' });
  const [savingTicket, setSavingTicket] = useState(false);
  const [standup, setStandup] = useState({ yesterday: '', today: '', blockers: '' });
  const [retro, setRetro] = useState({ went_well: '', improve: '', actions: '' });
  const [defenseUrl, setDefenseUrl] = useState('');
  const [defenseNotes, setDefenseNotes] = useState('');
  const [defenseFile, setDefenseFile] = useState<File | null>(null);
  const [savingDefense, setSavingDefense] = useState(false);

  const load = async () => {
    if (!projectId) return;
    try {
      const { data } = await api.get(`/hub/projects/${projectId}/workspace`);
      setData(data.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load workspace');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [projectId]);

  const ticketsByStatus = useMemo(() => {
    const map: Record<string, any[]> = { backlog: [], in_progress: [], review: [], done: [] };
    for (const t of data?.tickets || []) (map[t.status] || map.backlog).push(t);
    return map;
  }, [data]);

  const addTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.title.trim()) return;
    setSavingTicket(true);
    try {
      const { data: res } = await api.post(`/hub/projects/${projectId}/tickets`, {
        ...ticketForm,
        estimate_hours: ticketForm.estimate_hours ? Number(ticketForm.estimate_hours) : undefined,
      });
      setData((d: any) => ({ ...d, tickets: [...(d.tickets || []), res.data] }));
      setTicketForm({ title: '', description: '', priority: 'medium', estimate_hours: '' });
      toast.success('Ticket added');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to add ticket'); }
    finally { setSavingTicket(false); }
  };

  const moveTicket = async (ticket: any, status: string) => {
    try {
      const { data: res } = await api.put(`/hub/tickets/${ticket.id}`, { status });
      setData((d: any) => ({ ...d, tickets: d.tickets.map((t: any) => t.id === ticket.id ? res.data : t) }));
    } catch { toast.error('Failed to move ticket'); }
  };

  const deleteTicket = async (id: string) => {
    try {
      await api.delete(`/hub/tickets/${id}`);
      setData((d: any) => ({ ...d, tickets: d.tickets.filter((t: any) => t.id !== id) }));
    } catch { toast.error('Failed to delete ticket'); }
  };

  const saveStandup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: res } = await api.post(`/hub/projects/${projectId}/standups`, standup);
      setData((d: any) => ({ ...d, standups: [res.data, ...(d.standups || [])] }));
      setStandup({ yesterday: '', today: '', blockers: '' });
      toast.success('Standup saved');
    } catch { toast.error('Failed to save standup'); }
  };

  const saveRetro = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: res } = await api.post(`/hub/projects/${projectId}/retrospective`, retro);
      setData((d: any) => ({ ...d, retrospective: res.data }));
      toast.success('Retrospective saved');
    } catch { toast.error('Failed to save retrospective'); }
  };

  const submitDefense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defenseUrl.trim() && !defenseFile) { toast.error('Upload a video or paste a video URL'); return; }
    setSavingDefense(true);
    try {
      let payload: any;
      if (defenseFile) {
        payload = new FormData();
        payload.append('file', defenseFile);
        payload.append('notes', defenseNotes);
      } else {
        payload = { video_url: defenseUrl.trim(), notes: defenseNotes };
      }
      const { data: res } = await api.post(`/hub/projects/${projectId}/oral-defense`, payload);
      setData((d: any) => ({ ...d, oral_defense: res.data }));
      setDefenseFile(null); setDefenseUrl(''); setDefenseNotes('');
      toast.success('Oral defense submitted for review');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to submit oral defense'); }
    finally { setSavingDefense(false); }
  };

  if (loading) return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  if (!data) return <GlassCard className="p-10 text-center" hover={false}>Project not found.</GlassCard>;

  const project = data.project;
  const defense = data.oral_defense;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/student/courses/${project.course_slug}#projects`} className="text-sm text-gray-500 inline-flex items-center gap-1 mb-2"><ArrowLeft className="w-4 h-4" /> Back to course</Link>
          <h1 className="text-2xl sm:text-3xl font-bold">{project.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{project.course_title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.source_url && <a href={project.source_url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm inline-flex items-center gap-1.5"><Github className="w-4 h-4" /> Repo</a>}
          {project.demo_url && <a href={project.demo_url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm inline-flex items-center gap-1.5"><ExternalLink className="w-4 h-4" /> Demo</a>}
          {data.sandbox && <a href={data.sandbox.url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-indigo-500 text-white text-sm inline-flex items-center gap-1.5"><Rocket className="w-4 h-4" /> {data.sandbox.provider}</a>}
          <button onClick={() => window.dispatchEvent(new CustomEvent('gigo:open', { detail: { prompt: project.gigo_prompt || `Help me plan the project "${project.title}". Ask for my brief and create milestones and tickets.` } }))} className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Ask GiGo</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <GlassCard className="p-4" hover={false}><p className="text-xs text-gray-500">Tickets done</p><p className="text-xl font-bold mt-1">{ticketsByStatus.done.length}/{(data.tickets || []).length}</p></GlassCard>
        <GlassCard className="p-4" hover={false}><p className="text-xs text-gray-500">Standups</p><p className="text-xl font-bold mt-1">{data.standups?.length || 0}</p></GlassCard>
        <GlassCard className="p-4" hover={false}><p className="text-xs text-gray-500">Oral defense</p><p className="text-xl font-bold mt-1 capitalize">{defense?.status || 'not submitted'}</p></GlassCard>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([['board','Board'],['standups','Standups'],['retro','Retrospective'],['defense','Oral defense']] as [Tab,string][]).map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl text-sm font-medium border ${tab===key?'bg-indigo-500 text-white border-indigo-500':'border-gray-200 dark:border-gray-800 text-gray-500'}`}>{label}</button>
        ))}
      </div>

      {tab === 'board' && (
        <div className="space-y-4">
          <GlassCard className="p-4" hover={false}>
            <form onSubmit={addTicket} className="grid sm:grid-cols-[1fr_140px_100px_auto] gap-2">
              <input value={ticketForm.title} onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })} placeholder="New ticket title" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
              <select value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
              <input value={ticketForm.estimate_hours} onChange={(e) => setTicketForm({ ...ticketForm, estimate_hours: e.target.value })} type="number" min={0} placeholder="Hours" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
              <Button type="submit" disabled={savingTicket || !ticketForm.title.trim()}>{savingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}</Button>
            </form>
          </GlassCard>
          <div className="grid md:grid-cols-4 gap-3">
            {COLUMNS.map((col) => (
              <div key={col.key} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-3 min-h-[180px]">
                <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{col.label}</p><span className="text-[10px] text-gray-400">{ticketsByStatus[col.key].length}</span></div>
                <div className="space-y-2">
                  {ticketsByStatus[col.key].map((t: any) => (
                    <div key={t.id} className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2.5">
                      <p className="text-sm font-medium">{t.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant={t.priority==='high'?'danger':t.priority==='medium'?'warning':'default'} size="sm">{t.priority}</Badge>
                        {t.estimate_hours && <span className="text-[10px] text-gray-400">{t.estimate_hours}h</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {COLUMNS.filter((c) => c.key !== t.status).map((c) => (
                          <button key={c.key} onClick={() => moveTicket(t, c.key)} className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500">{c.label}</button>
                        ))}
                        <button onClick={() => deleteTicket(t.id)} className="text-[10px] text-red-400 ml-auto">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'standups' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <GlassCard className="p-5" hover={false}>
            <h2 className="font-semibold mb-3">Today's standup</h2>
            <form onSubmit={saveStandup} className="space-y-3">
              <textarea value={standup.yesterday} onChange={(e)=>setStandup({...standup,yesterday:e.target.value})} rows={2} placeholder="What did you finish yesterday?" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
              <textarea value={standup.today} onChange={(e)=>setStandup({...standup,today:e.target.value})} rows={2} placeholder="What will you finish today?" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
              <textarea value={standup.blockers} onChange={(e)=>setStandup({...standup,blockers:e.target.value})} rows={2} placeholder="Blockers" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
              <Button type="submit"><Send className="w-4 h-4 mr-1" /> Save standup</Button>
            </form>
          </GlassCard>
          <div className="space-y-2">
            {(data.standups || []).map((s: any) => (
              <GlassCard key={s.id} className="p-4" hover={false}>
                <p className="text-xs text-gray-500">{s.standup_date}</p>
                <p className="text-sm mt-1"><strong>Yesterday:</strong> {s.yesterday || '—'}</p>
                <p className="text-sm"><strong>Today:</strong> {s.today || '—'}</p>
                <p className="text-sm"><strong>Blockers:</strong> {s.blockers || 'None'}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {tab === 'retro' && (
        <GlassCard className="p-5" hover={false}>
          <h2 className="font-semibold mb-3">Project retrospective</h2>
          <form onSubmit={saveRetro} className="space-y-3">
            <textarea value={retro.went_well} onChange={(e)=>setRetro({...retro,went_well:e.target.value})} rows={2} placeholder="What went well?" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
            <textarea value={retro.improve} onChange={(e)=>setRetro({...retro,improve:e.target.value})} rows={2} placeholder="What would you improve?" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
            <textarea value={retro.actions} onChange={(e)=>setRetro({...retro,actions:e.target.value})} rows={2} placeholder="Action items for next project" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
            <Button type="submit">Save retrospective</Button>
          </form>
          {data.retrospective && <div className="mt-4 text-sm text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-3"><p><strong>Last saved:</strong> {new Date(data.retrospective.created_at).toLocaleString()}</p><p>{data.retrospective.went_well}</p><p>{data.retrospective.improve}</p><p>{data.retrospective.actions}</p></div>}
        </GlassCard>
      )}

      {tab === 'defense' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <GlassCard className="p-5" hover={false}>
            <h2 className="font-semibold mb-1 flex items-center gap-2"><Video className="w-4 h-4" /> Record your walkthrough</h2>
            <p className="text-xs text-gray-500 mb-3">Explain what you built, why you made key decisions, and one bug you fixed. 5–10 minutes.</p>
            <form onSubmit={submitDefense} className="space-y-3">
              <input value={defenseUrl} onChange={(e)=>setDefenseUrl(e.target.value)} placeholder="Video URL (Loom, YouTube, Drive)" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm cursor-pointer">
                <Upload className="w-4 h-4" /> {defenseFile ? defenseFile.name : 'Or upload a video'}
                <input type="file" accept="video/*" className="hidden" onChange={(e)=>setDefenseFile(e.target.files?.[0] || null)} />
              </label>
              <textarea value={defenseNotes} onChange={(e)=>setDefenseNotes(e.target.value)} rows={3} placeholder="Notes for the reviewer" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
              <Button type="submit" disabled={savingDefense}>{savingDefense ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />} Submit defense</Button>
            </form>
          </GlassCard>
          <GlassCard className="p-5" hover={false}>
            <h2 className="font-semibold mb-3">Defense status</h2>
            {!defense ? <p className="text-sm text-gray-500">Not submitted yet.</p> : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">{defense.status === 'passed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : defense.status === 'needs_work' ? <XCircle className="w-4 h-4 text-amber-500" /> : <Clock3 className="w-4 h-4 text-gray-400" />}<span className="capitalize">{defense.status}</span></div>
                {defense.score != null && <p>Score: <strong>{defense.score}/100</strong></p>}
                {defense.feedback && <p className="text-gray-500">{defense.feedback}</p>}
                <a href={defense.video_url} target="_blank" rel="noreferrer" className="text-indigo-500 inline-flex items-center gap-1">Open video <ExternalLink className="w-3.5 h-3.5" /></a>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </motion.div>
  );
}
