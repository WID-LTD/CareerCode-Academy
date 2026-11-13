import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, CheckCircle2, ExternalLink, Loader2, ShieldCheck, Video, XCircle } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function InstructorHubReview() {
  const [tab, setTab] = useState<'defenses' | 'badges'>('defenses');
  const [defenses, setDefenses] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, { score: string; feedback: string }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [d, b] = await Promise.all([
        api.get('/hub/review/oral-defenses').then(r => r.data.data || []).catch(() => []),
        api.get('/hub/review/badges').then(r => r.data.data || []).catch(() => []),
      ]);
      setDefenses(d); setBadges(b);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const reviewDefense = async (d: any, status: 'passed' | 'needs_work') => {
    const f = forms[d.id] || { score: '', feedback: '' };
    if (!f.score) { toast.error('Enter a score'); return; }
    try {
      await api.put(`/hub/oral-defenses/${d.id}/review`, { score: Number(f.score), feedback: f.feedback, status });
      toast.success('Oral defense reviewed');
      await load();
    } catch { toast.error('Failed to review defense'); }
  };

  const reviewBadge = async (b: any, status: 'awarded' | 'rejected') => {
    try {
      await api.put(`/hub/badges/${b.id}/review`, { status });
      toast.success(status === 'awarded' ? 'Badge awarded' : 'Badge rejected');
      await load();
    } catch { toast.error('Failed to review badge'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div><h1 className="text-2xl sm:text-3xl font-bold">Hub Reviews</h1><p className="text-gray-500 mt-1">Oral defenses and skill badge evidence.</p></div>
      <div className="flex gap-2">
        <button onClick={()=>setTab('defenses')} className={`px-4 py-2 rounded-xl text-sm border inline-flex items-center gap-1.5 ${tab==='defenses'?'bg-indigo-500 text-white border-indigo-500':'border-gray-200 dark:border-gray-800 text-gray-500'}`}><Video className="w-4 h-4" /> Oral defenses ({defenses.filter(d=>d.status==='submitted').length})</button>
        <button onClick={()=>setTab('badges')} className={`px-4 py-2 rounded-xl text-sm border inline-flex items-center gap-1.5 ${tab==='badges'?'bg-indigo-500 text-white border-indigo-500':'border-gray-200 dark:border-gray-800 text-gray-500'}`}><Award className="w-4 h-4" /> Badges ({badges.filter(b=>b.status==='pending').length})</button>
      </div>
      {loading ? <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div> : tab === 'defenses' ? (
        <div className="space-y-3">
          {defenses.map((d) => (
            <GlassCard key={d.id} className="p-5" hover={false}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="font-semibold">{d.project_title}</h3><p className="text-xs text-gray-500">{d.student_name} · {d.course_title}</p></div>
                <Badge variant={d.status==='passed'?'success':d.status==='needs_work'?'danger':'warning'} size="sm">{d.status}</Badge>
              </div>
              <a href={d.video_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 inline-flex items-center gap-1 mt-2"><Video className="w-3.5 h-3.5" /> Open walkthrough <ExternalLink className="w-3 h-3" /></a>
              {d.notes && <p className="text-xs text-gray-500 mt-2">{d.notes}</p>}
              <div className="grid sm:grid-cols-[100px_1fr_auto_auto] gap-2 mt-3">
                <input type="number" min={0} max={100} placeholder="Score" value={forms[d.id]?.score || ''} onChange={(e)=>setForms({...forms,[d.id]:{score:e.target.value,feedback:forms[d.id]?.feedback||''}})} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs" />
                <input placeholder="Feedback" value={forms[d.id]?.feedback || ''} onChange={(e)=>setForms({...forms,[d.id]:{score:forms[d.id]?.score||'',feedback:e.target.value}})} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-xs" />
                <Button size="sm" onClick={()=>reviewDefense(d,'passed')}>Pass</Button>
                <Button size="sm" variant="outline" onClick={()=>reviewDefense(d,'needs_work')}>Needs work</Button>
              </div>
            </GlassCard>
          ))}
          {defenses.length===0 && <GlassCard className="p-8 text-center text-gray-500" hover={false}>No oral defenses yet.</GlassCard>}
        </div>
      ) : (
        <div className="space-y-3">
          {badges.map((b) => (
            <GlassCard key={b.id} className="p-5" hover={false}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="font-semibold">{b.title}</h3><p className="text-xs text-gray-500">{b.learner_name} · {b.email}</p></div>
                <Badge variant={b.status==='awarded'?'success':b.status==='rejected'?'danger':'warning'} size="sm">{b.status}</Badge>
              </div>
              {b.evidence_url && <a href={b.evidence_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 inline-flex items-center gap-1 mt-2"><ShieldCheck className="w-3.5 h-3.5" /> Evidence <ExternalLink className="w-3 h-3" /></a>}
              <ul className="mt-2 text-xs text-gray-500">{(b.rubric || []).map((r: string) => <li key={r}>• {r}</li>)}</ul>
              <div className="flex gap-2 mt-3"><Button size="sm" onClick={()=>reviewBadge(b,'awarded')}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Award</Button><Button size="sm" variant="outline" onClick={()=>reviewBadge(b,'rejected')}><XCircle className="w-3.5 h-3.5 mr-1" /> Reject</Button></div>
            </GlassCard>
          ))}
          {badges.length===0 && <GlassCard className="p-8 text-center text-gray-500" hover={false}>No badge requests yet.</GlassCard>}
        </div>
      )}
    </motion.div>
  );
}
