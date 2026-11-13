import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Loader2, Sparkles, Users } from 'lucide-react';
import api from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';

export default function TrialCampaign() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/courses?limit=12').then(({ data }) => setCourses(data.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute -top-24 -right-20 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 py-20 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-300"><Sparkles className="w-4 h-4" /> International Education Week · 16–20 November 2026</span>
          <h1 className="text-4xl sm:text-6xl font-bold mt-5 leading-tight">One week.<br />Any course.<br />Build something real.</h1>
          <p className="text-gray-400 max-w-2xl mx-auto mt-5">Your one-week free trial starts on 13 November and ends on 20 November. Pick a course, build the first project, and see what you can actually do in seven days.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-8"><Link to="/courses" className="px-6 py-3 rounded-xl bg-indigo-500 font-semibold inline-flex items-center gap-2">Browse courses <ArrowRight className="w-4 h-4" /></Link><Link to="/signup" className="px-6 py-3 rounded-xl border border-white/20 font-semibold">Create account</Link></div>
          <p className="text-xs text-gray-500 mt-4">No card required to start. Progress stays after the trial.</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[['Guided lessons','Watch, read and practice with generated notes.'],['Build real projects','Tickets, standups, retrospectives and GitHub verification.'],['GiGo help','Screenshots, code review and debugging support.']].map(([title, body]) => <GlassCard key={title} className="p-5" hover={false}><BookOpen className="w-5 h-5 text-indigo-400 mb-2" /><p className="font-semibold">{title}</p><p className="text-sm text-gray-400 mt-1">{body}</p></GlassCard>)}
        </div>
        {loading ? <div className="grid place-items-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{courses.map((c) => <Link key={c.id} to={`/courses/${c.slug}`} className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-indigo-500/40 transition-colors"><p className="font-semibold">{c.title}</p><p className="text-xs text-gray-500 mt-1">{c.level} · {c.category}</p><p className="text-sm font-bold mt-3">₦{Number(c.price).toLocaleString()}</p><span className="text-xs text-indigo-400 mt-2 inline-flex items-center gap-1">Start trial <ArrowRight className="w-3 h-3" /></span></Link>)}</div>}
      </div>
    </div>
  );
}
