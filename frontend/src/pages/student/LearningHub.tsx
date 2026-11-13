import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Briefcase, CheckCircle2, Clock3, ExternalLink, GitBranch, Loader2, MessageSquare, RefreshCw, Send, ShieldCheck, Sparkles } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type Tab = 'badges' | 'client' | 'peer' | 'review';

export default function LearningHub() {
  const [tab, setTab] = useState<Tab>('badges');
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<any>({ badges: [], mine: [] });
  const [clientProjects, setClientProjects] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [peerQueue, setPeerQueue] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [pitches, setPitches] = useState<Record<string, string>>({});
  const [peerForm, setPeerForm] = useState<Record<string, { score: string; feedback: string }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [b, cp, ap, pq, sr] = await Promise.all([
        api.get('/hub/badges').then(r => r.data.data).catch(() => ({ badges: [], mine: [] })),
        api.get('/hub/client-projects').then(r => r.data.data || []).catch(() => []),
        api.get('/hub/client-projects/my').then(r => r.data.data || []).catch(() => []),
        api.get('/hub/peer-reviews/queue').then(r => r.data.data || []).catch(() => []),
        api.get('/hub/spaced-reviews').then(r => r.data.data || []).catch(() => []),
      ]);
      setBadges(b); setClientProjects(cp); setApplications(ap); setPeerQueue(pq); setReviews(sr);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const requestBadge = async (badge: any) => {
    try {
      await api.post(`/hub/badges/${badge.id}/request`, { evidence_url: evidence[badge.id] || '' });
      toast.success('Badge request submitted');
      const b = await api.get('/hub/badges'); setBadges(b.data.data);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to request badge'); }
  };

  const applyClient = async (project: any) => {
    try {
      await api.post(`/hub/client-projects/${project.id}/apply`, { pitch: pitches[project.id] || '' });
      toast.success('Application submitted');
      const ap = await api.get('/hub/client-projects/my'); setApplications(ap.data.data || []);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to apply'); }
  };

  const submitPeer = async (project: any) => {
    const f = peerForm[project.id] || { score: '', feedback: '' };
    if (!f.score) { toast.error('Enter a score'); return; }
    try {
      await api.post(`/hub/peer-reviews/${project.id}`, { score: Number(f.score), feedback: f.feedback });
      toast.success('Peer review submitted');
      setPeerQueue((q) => q.filter((p) => p.id !== project.id));
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to submit review'); }
  };

  const completeReview = async (review: any, result: 'again' | 'good') => {
    try {
      await api.post(`/hub/spaced-reviews/${review.id}/complete`, { result });
      setReviews((r) => r.filter((x) => x.id !== review.id));
      toast.success(result === 'good' ? 'Scheduled further out' : 'Will repeat tomorrow');
    } catch { toast.error('Failed to update review'); }
  };

  const myBadgeIds = new Set((badges.mine || []).map((m: any) => m.badge_id));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Career Hub</h1>
        <p className="text-gray-500 mt-1">Badges, real client work, peer review and spaced practice.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([['badges','Skill badges',Award],['client','Client projects',Briefcase],['peer','Peer review',MessageSquare],['review','Spaced review',RefreshCw]] as [Tab,string,any][]).map(([key,label,Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-xl text-sm font-medium border inline-flex items-center gap-1.5 ${tab===key?'bg-indigo-500 text-white border-indigo-500':'border-gray-200 dark:border-gray-800 text-gray-500'}`}><Icon className="w-4 h-4" /> {label}</button>
        ))}
      </div>

      {loading ? <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div> : (
        <>
          {tab === 'badges' && (
            <div className="grid md:grid-cols-2 gap-3">
              {(badges.badges || []).map((b: any) => {
                const mine = (badges.mine || []).find((m: any) => m.badge_id === b.id);
                return (
                  <GlassCard key={b.id} className="p-5" hover={false}>
                    <div className="flex items-start justify-between gap-2">
                      <div><h3 className="font-semibold flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> {b.title}</h3><p className="text-xs text-gray-500 mt-1">{b.description}</p></div>
                      {mine ? <Badge variant={mine.status==='awarded'?'success':mine.status==='rejected'?'danger':'warning'} size="sm">{mine.status}</Badge> : <Badge variant="default" size="sm">{b.level}</Badge>}
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-gray-500">{(b.rubric || []).map((r: string) => <li key={r} className="flex gap-1.5"><CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-500" /> {r}</li>)}</ul>
                    {!mine && <div className="flex gap-2 mt-3"><input value={evidence[b.id] || ''} onChange={(e)=>setEvidence({...evidence,[b.id]:e.target.value})} placeholder="Evidence URL (repo, demo, certificate)" className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs" /><Button size="sm" onClick={()=>requestBadge(b)}>Request</Button></div>}
                    {mine?.status === 'awarded' && mine.verified_code && <a href={`/badges/${mine.verified_code}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 mt-2 inline-flex items-center gap-1">Public verification <ExternalLink className="w-3 h-3" /></a>}
                  </GlassCard>
                );
              })}
            </div>
          )}

          {tab === 'client' && (
            <div className="space-y-3">
              {clientProjects.map((p: any) => {
                const applied = applications.find((a: any) => a.client_project_id === p.id);
                return (
                  <GlassCard key={p.id} className="p-5" hover={false}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><h3 className="font-semibold">{p.title}</h3><p className="text-xs text-gray-500 mt-1">{p.client_name} · {p.sector} · {p.scope}</p></div>
                      {applied ? <Badge variant="success" size="sm">{applied.status}</Badge> : <Badge variant="primary" size="sm">{p.status}</Badge>}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{p.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">{(p.skills || []).map((s: string) => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{s}</span>)}</div>
                    {!applied && <div className="flex gap-2 mt-3"><input value={pitches[p.id] || ''} onChange={(e)=>setPitches({...pitches,[p.id]:e.target.value})} placeholder="Short pitch: why you, what you'll build" className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs" /><Button size="sm" onClick={()=>applyClient(p)}><Send className="w-3.5 h-3.5 mr-1" /> Apply</Button></div>}
                  </GlassCard>
                );
              })}
            </div>
          )}

          {tab === 'peer' && (
            <div className="space-y-3">
              {peerQueue.length === 0 ? <GlassCard className="p-8 text-center text-gray-500" hover={false}>No projects waiting for peer review.</GlassCard> : peerQueue.map((p: any) => (
                <GlassCard key={p.id} className="p-5" hover={false}>
                  <h3 className="font-semibold">{p.project_title}</h3>
                  <p className="text-xs text-gray-500">{p.learner_name} · {p.course_title}</p>
                  <p className="text-sm text-gray-500 mt-2">{p.description}</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    {p.source_url && <a href={p.source_url} target="_blank" rel="noreferrer" className="text-indigo-500 inline-flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> Repo</a>}
                    {p.demo_url && <a href={p.demo_url} target="_blank" rel="noreferrer" className="text-indigo-500 inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Demo</a>}
                  </div>
                  <div className="grid sm:grid-cols-[100px_1fr_auto] gap-2 mt-3">
                    <input type="number" min={0} max={100} placeholder="Score" value={peerForm[p.id]?.score || ''} onChange={(e)=>setPeerForm({...peerForm,[p.id]:{score:e.target.value,feedback:peerForm[p.id]?.feedback||''}})} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs" />
                    <input placeholder="Specific feedback" value={peerForm[p.id]?.feedback || ''} onChange={(e)=>setPeerForm({...peerForm,[p.id]:{score:peerForm[p.id]?.score||'',feedback:e.target.value}})} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs" />
                    <Button size="sm" onClick={()=>submitPeer(p)}>Submit</Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {tab === 'review' && (
            <div className="space-y-3">
              {reviews.length === 0 ? <GlassCard className="p-8 text-center text-gray-500" hover={false}>No reviews due. Complete lessons and quizzes to schedule spaced practice.</GlassCard> : reviews.map((r: any) => (
                <GlassCard key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3" hover={false}>
                  <div className="flex-1"><p className="font-medium text-sm">{r.lesson_title}</p><p className="text-xs text-gray-500">{r.course_title} · interval {r.interval_days}d</p></div>
                  <div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>completeReview(r,'again')}>Again</Button><Button size="sm" onClick={()=>completeReview(r,'good')}>Got it</Button></div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
