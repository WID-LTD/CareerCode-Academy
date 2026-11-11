import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Save, Plus, Trash2, ChevronUp, ChevronDown, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

type Path = {
  id: string;
  title: string;
  slug: string;
  level: string;
  courses_count: number;
  full_price: number;
  bundle_price: number | null;
  bundle_discount_percent: number | null;
  enrollment_mode: string;
  bundle_enabled: number;
  is_published: number;
};

export default function AdminLearningPaths() {
  const [paths, setPaths] = useState<Path[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const load = async () => {
    try {
      const [p, c] = await Promise.all([
        api.get('/admin/learning-paths'),
        api.get('/admin/courses', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
      ]);
      setPaths(p.data.data || []);
      setCourses(c.data.data || []);
    } catch {
      toast.error('Failed to load learning paths');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const loadDetail = async (path: Path) => {
    if (expanded === path.id) { setExpanded(null); return; }
    setExpanded(path.id);
    if (detail[path.id]) return;
    try {
      const { data } = await api.get(`/learning-paths/${path.slug}`);
      setDetail((d) => ({ ...d, [path.id]: data.data }));
    } catch { /* ignore */ }
  };

  const save = async (path: Path) => {
    setBusy(path.id);
    try {
      const f = form[path.id] || {};
      await api.put(`/admin/learning-paths/${path.id}`, {
        bundle_price: f.bundle_price !== undefined ? f.bundle_price : path.bundle_price,
        bundle_discount_percent: f.bundle_discount_percent !== undefined ? f.bundle_discount_percent : path.bundle_discount_percent,
        enrollment_mode: f.enrollment_mode || path.enrollment_mode,
        bundle_enabled: f.bundle_enabled !== undefined ? f.bundle_enabled : !!path.bundle_enabled,
        is_published: f.is_published !== undefined ? f.is_published : !!path.is_published,
      });
      toast.success('Learning path updated');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally { setBusy(null); }
  };

  const addCourse = async (path: Path, courseId: string) => {
    if (!courseId) return;
    setBusy(path.id);
    try {
      await api.post(`/admin/learning-paths/${path.id}/courses`, { course_id: courseId });
      toast.success('Course added');
      setDetail((d) => { const n = { ...d }; delete n[path.id]; return n; });
      await loadDetail(path);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to add course');
    } finally { setBusy(null); }
  };

  const removeCourse = async (path: Path, courseId: string) => {
    setBusy(path.id);
    try {
      await api.delete(`/admin/learning-paths/${path.id}/courses/${courseId}`);
      setDetail((d) => { const n = { ...d }; delete n[path.id]; return n; });
      await loadDetail(path);
      await load();
    } catch { toast.error('Failed to remove course'); }
    finally { setBusy(null); }
  };

  const move = async (path: Path, index: number, dir: -1 | 1) => {
    const list = detail[path.id]?.courses || [];
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(path.id);
    try {
      await api.post(`/admin/learning-paths/${path.id}/reorder`, { courseIds: next.map((c: any) => c.id) });
      setDetail((d) => ({ ...d, [path.id]: { ...d[path.id], courses: next } }));
    } catch { toast.error('Failed to reorder'); }
    finally { setBusy(null); }
  };

  const total = useMemo(() => paths.reduce((n, p) => n + Number(p.courses_count || 0), 0), [paths]);

  if (loading) return <PageSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><GitBranch className="w-7 h-7 text-primary-500" /> Learning Paths</h1>
          <p className="text-gray-500 text-sm mt-1">{paths.length} paths · {total} course links · set bundle pricing, publish state and course order.</p>
        </div>
      </div>

      <div className="space-y-3">
        {paths.map((path) => {
          const f = form[path.id] || {};
          const open = expanded === path.id;
          const d = detail[path.id];
          return (
            <GlassCard key={path.id} className="p-4" hover={false}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button onClick={() => loadDetail(path)} className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{path.title}</p>
                    <Badge variant="primary" size="sm">{path.level}</Badge>
                    <Badge variant={path.is_published ? 'success' : 'default'} size="sm">{path.is_published ? 'Published' : 'Draft'}</Badge>
                    <Badge variant={path.bundle_enabled ? 'success' : 'default'} size="sm">{path.bundle_enabled ? 'Bundle on' : 'Bundle off'}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{path.courses_count} courses · list {formatCurrency(path.full_price)} · bundle {path.bundle_price != null ? formatCurrency(path.bundle_price) : 'auto'}</p>
                </button>
                <div className="flex items-center gap-2">
                  <Link to={`/learning-paths/${path.slug}`} target="_blank" className="p-2 rounded-lg text-gray-400 hover:text-primary-500" aria-label="Open public page"><ExternalLink className="w-4 h-4" /></Link>
                  <Button size="sm" variant="outline" onClick={() => loadDetail(path)}>{open ? 'Close' : 'Manage'}</Button>
                </div>
              </div>

              {open && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pricing</p>
                    <label className="block text-xs text-gray-500">Bundle price (leave empty for automatic)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={f.bundle_price ?? (path.bundle_price ?? '')}
                      onChange={(e) => setForm((x) => ({ ...x, [path.id]: { ...x[path.id], bundle_price: e.target.value } }))}
                      placeholder="Auto"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                    />
                    <label className="block text-xs text-gray-500">Bundle discount % (when no fixed price)</label>
                    <input
                      type="number" min="0" max="90" step="1"
                      value={f.bundle_discount_percent ?? (path.bundle_discount_percent ?? 0)}
                      onChange={(e) => setForm((x) => ({ ...x, [path.id]: { ...x[path.id], bundle_discount_percent: e.target.value } }))}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                    />
                    <label className="block text-xs text-gray-500">Enrolment mode</label>
                    <select
                      value={f.enrollment_mode ?? path.enrollment_mode ?? 'mixed'}
                      onChange={(e) => setForm((x) => ({ ...x, [path.id]: { ...x[path.id], enrollment_mode: e.target.value } }))}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="mixed">Mixed (free + paid)</option>
                      <option value="free">Free only</option>
                      <option value="paid">Paid only</option>
                    </select>
                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={f.bundle_enabled ?? !!path.bundle_enabled} onChange={(e) => setForm((x) => ({ ...x, [path.id]: { ...x[path.id], bundle_enabled: e.target.checked } }))} /> Bundle enabled
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={f.is_published ?? !!path.is_published} onChange={(e) => setForm((x) => ({ ...x, [path.id]: { ...x[path.id], is_published: e.target.checked } }))} /> Published
                      </label>
                    </div>
                    <Button size="sm" onClick={() => save(path)} disabled={busy === path.id} icon={busy === path.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}>Save</Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Courses</p>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {(d?.courses || []).map((course: any, i: number) => (
                        <div key={course.id} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 px-2 py-1.5">
                          <span className="text-[10px] text-gray-400 w-4">{i + 1}</span>
                          <span className="text-xs flex-1 truncate">{course.title}</span>
                          <span className="text-[10px] text-gray-400">{Number(course.price) > 0 ? formatCurrency(course.price) : 'Free'}</span>
                          <button onClick={() => move(path, i, -1)} disabled={i === 0 || busy === path.id} className="p-1 text-gray-400 disabled:opacity-30" aria-label="Move up"><ChevronUp className="w-3.5 h-3.5" /></button>
                          <button onClick={() => move(path, i, 1)} disabled={i === (d?.courses?.length || 0) - 1 || busy === path.id} className="p-1 text-gray-400 disabled:opacity-30" aria-label="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
                          <button onClick={() => removeCourse(path, course.id)} className="p-1 text-gray-400 hover:text-rose-500" aria-label="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      {!d && <p className="text-xs text-gray-500">Loading courses…</p>}
                      {d?.courses?.length === 0 && <p className="text-xs text-gray-500">No courses yet.</p>}
                    </div>
                    <div className="flex gap-2">
                      <select
                        defaultValue=""
                        onChange={(e) => { void addCourse(path, e.target.value); e.currentTarget.value = ''; }}
                        className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1.5 text-xs"
                      >
                        <option value="">Add a course…</option>
                        {courses.filter((c) => !(d?.courses || []).some((x: any) => x.id === c.id)).map((c) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                      <Plus className="w-4 h-4 text-gray-400 self-center" />
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </motion.div>
  );
}
