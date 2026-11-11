import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Landmark, ShieldCheck, Users, BookOpenCheck, ScrollText, ChevronDown, Camera } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import api from '@/lib/axios';

const categoryMeta: Record<string, { label: string; tone: string }> = {
  pricing: { label: 'Pricing', tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  content: { label: 'Content', tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  community: { label: 'Community', tone: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  data: { label: 'Data', tone: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  finance: { label: 'Finance', tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  operations: { label: 'Operations', tone: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  governance: { label: 'Governance', tone: 'bg-red-500/10 text-red-600 dark:text-red-400' },
};

const fmt = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Board() {
  const [members, setMembers] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openPolicy, setOpenPolicy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [m, p, r] = await Promise.all([
          api.get('/board/members').catch(() => ({ data: { data: [] } })),
          api.get('/board/policies').catch(() => ({ data: { data: [] } })),
          api.get('/board/resolutions').catch(() => ({ data: { data: [] } })),
        ]);
        if (cancelled) return;
        setMembers(m.data.data || []);
        setPolicies(p.data.data || []);
        setResolutions(r.data.data || []);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) return <PageSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl gradient-bg p-6 sm:p-10 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_45%)]" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold">Board of Directors</h1>
              <p className="text-white/80 mt-1">Governance and oversight for CareerCode Academy.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="font-bold text-2xl">{members.length}</div>
              <div className="text-white/80 text-xs mt-1">Active Directors</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="font-bold text-2xl">{policies.length}</div>
              <div className="text-white/80 text-xs mt-1">Published Policies</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="font-bold text-2xl">{resolutions.length}</div>
              <div className="text-white/80 text-xs mt-1">Board Resolutions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Members */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-500" />
          <h2 className="text-xl font-bold">Our Directors</h2>
        </div>
        {members.length === 0 ? (
          <div className="text-center py-10 text-gray-500">Board profiles will appear here once published.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {members.map((m) => (
              <GlassCard key={m.id} className="p-5 text-center" hover>
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold mb-3 overflow-hidden">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-7 h-7 opacity-60" />
                  )}
                </div>
                <div className="font-semibold">{m.name}</div>
                <div className="text-sm text-primary-600 dark:text-primary-400 mt-0.5">{m.title}</div>
                {m.bio && <p className="text-xs text-gray-500 mt-2 line-clamp-3">{m.bio}</p>}
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {/* Policies */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="w-5 h-5 text-accent-500" />
          <h2 className="text-xl font-bold">Published Policies</h2>
        </div>
        {policies.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No policies published yet.</div>
        ) : (
          <div className="space-y-3">
            {policies.map((p) => {
              const cat = categoryMeta[p.category] || { label: p.category, tone: 'bg-gray-500/10 text-gray-500' };
              const open = openPolicy === p.slug;
              return (
                <GlassCard key={p.slug} className="p-5" hover>
                  <button className="w-full text-left flex items-start justify-between gap-4" onClick={() => setOpenPolicy(open ? null : p.slug)}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ${cat.tone}`}>{cat.label}</span>
                        <Badge variant="default" size="sm">v{p.version}</Badge>
                        {p.summary && <span className="text-xs text-gray-500">Updated {fmt(p.updated_at)}</span>}
                      </div>
                      <h3 className="font-semibold mt-2">{p.title}</h3>
                      {p.summary && <p className="text-sm text-gray-500 mt-1">{p.summary}</p>}
                    </div>
                    <ChevronDown className={`w-5 h-5 mt-1 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4 prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{p.body}</div>}
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>

      {/* Resolutions */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary-500" />
          <h2 className="text-xl font-bold">Resolutions</h2>
        </div>
        {resolutions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No resolutions recorded yet.</div>
        ) : (
          <GlassCard className="divide-y divide-gray-100 dark:divide-gray-800" hover={false}>
            {resolutions.map((r) => (
              <div key={r.id} className="p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${r.passed ? 'text-success-500' : 'text-gray-400'}`} />
                    <h3 className="font-semibold">{r.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.passed ? 'success' : 'default'} size="sm">{r.passed ? 'Passed' : 'Not passed'}</Badge>
                    <span className="text-xs text-gray-400">{r.resolution_number}</span>
                  </div>
                </div>
                {r.summary && <p className="text-sm text-gray-500 mt-1">{r.summary}</p>}
                <div className="text-xs text-gray-400 mt-2">Meeting date: {fmt(r.meeting_date)}</div>
              </div>
            ))}
          </GlassCard>
        )}
      </section>
    </motion.div>
  );
}