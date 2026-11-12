import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle2, Clock3, Github, Loader2, TrendingUp, XCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/axios';

export default function ProjectAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/project-analytics').then(({ data }) => setData(data.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  if (!data) return <GlassCard className="p-10 text-center text-gray-500" hover={false}>Could not load project analytics.</GlassCard>;

  const s = data.summary || {};
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Project Analytics</h1>
        <p className="text-gray-500 mt-1">Submission volume, GitHub verification and review progress.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Submissions', s.total || 0, Github, 'text-primary-500'],
          ['GitHub verified', s.verified || 0, CheckCircle2, 'text-emerald-500'],
          ['Needs work', s.needs_work || 0, XCircle, 'text-amber-500'],
          ['Reviewed', s.reviewed || 0, Clock3, 'text-violet-500'],
        ].map(([label, value, Icon, color]: any) => (
          <GlassCard key={label} className="p-4" hover={false}>
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard className="p-5" hover={false}>
          <h2 className="font-semibold flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4" /> By course</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(data.by_course || []).filter((c: any) => c.submissions > 0).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{c.title}</p><p className="text-[11px] text-gray-500">{c.verified} verified · avg {c.average_score}/100</p></div>
                <Badge variant="primary" size="sm">{c.submissions}</Badge>
              </div>
            ))}
            {(data.by_course || []).every((c: any) => c.submissions === 0) && <p className="text-sm text-gray-500">No project submissions yet.</p>}
          </div>
        </GlassCard>

        <GlassCard className="p-5" hover={false}>
          <h2 className="font-semibold flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4" /> Common failed checks</h2>
          <div className="space-y-2">
            {(data.common_failed_checks || []).map((c: any) => (
              <div key={c.label} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">{c.label}</p>
                <Badge variant="warning" size="sm">{c.count}</Badge>
              </div>
            ))}
            {(data.common_failed_checks || []).length === 0 && <p className="text-sm text-gray-500">No failed checks recorded yet.</p>}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-5" hover={false}>
        <h2 className="font-semibold flex items-center gap-2 mb-4"><Github className="w-4 h-4" /> Recent submissions</h2>
        <div className="space-y-2">
          {(data.recent || []).map((r: any) => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{r.project_title || r.title}</p>
                <p className="text-[11px] text-gray-500">{r.student_name} · {r.course_title}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.repo_verified ? <Badge variant="success" size="sm">Verified</Badge> : <Badge variant="warning" size="sm">Needs work</Badge>}
                {r.score != null && <Badge variant="primary" size="sm">{r.score}/100</Badge>}
              </div>
            </div>
          ))}
          {(data.recent || []).length === 0 && <p className="text-sm text-gray-500">No submissions yet.</p>}
        </div>
      </GlassCard>
    </motion.div>
  );
}
