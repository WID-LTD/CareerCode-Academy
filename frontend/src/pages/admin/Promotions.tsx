import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BadgePercent, Plus, Pencil, Trash2, Search, Power, Globe, Tag, BookOpen,
  TrendingUp, CalendarClock, CalendarX2, Wallet,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const toInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const scopeMeta: Record<string, { label: string; icon: any; tone: string }> = {
  all: { label: 'Platform-wide', icon: Globe, tone: 'bg-primary-500/10 text-primary-600 dark:text-primary-400' },
  category: { label: 'Category', icon: Tag, tone: 'bg-accent-500/10 text-accent-600 dark:text-accent-400' },
  course: { label: 'Course', icon: BookOpen, tone: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
};

const emptyForm = {
  title: '',
  description: '',
  slug: '',
  discount_percent: 10,
  scope: 'all' as 'all' | 'category' | 'course',
  category_id: '',
  course_id: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
};

export default function Promotions() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [promoRes, catRes, courseRes] = await Promise.all([
        api.get('/promotions'),
        api.get('/categories').catch(() => api.get('/admin/categories').catch(() => ({ data: { data: [] } }))),
        api.get('/admin/courses').catch(() => ({ data: { data: [] } })),
      ]);
      setPromotions(promoRes.data.data || []);
      setCategories(catRes.data.data || []);
      setCourses(courseRes.data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load promotions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const status = (p: any) => {
    const now = Date.now();
    const start = new Date(p.starts_at).getTime();
    const end = new Date(p.ends_at).getTime();
    if (!p.is_active) return { label: 'Disabled', variant: 'default' as const };
    if (start > now) return { label: 'Scheduled', variant: 'warning' as const };
    if (end <= now) return { label: 'Ended', variant: 'default' as const };
    return { label: 'Live', variant: 'success' as const };
  };

  const stats = useMemo(() => {
    const now = Date.now();
    const live = promotions.filter((p) => p.is_active && new Date(p.starts_at).getTime() <= now && new Date(p.ends_at).getTime() > now);
    return {
      total: promotions.length,
      live: live.length,
      scheduled: promotions.filter((p) => p.is_active && new Date(p.starts_at).getTime() > now).length,
      finished: promotions.filter((p) => new Date(p.ends_at).getTime() <= now).length,
    };
  }, [promotions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((p) => [p.title, p.scope, p.category_name, p.course_title].join(' ').toLowerCase().includes(q));
  }, [promotions, query]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      title: p.title || '',
      description: p.description || '',
      slug: p.slug || '',
      discount_percent: Number(p.discount_percent) || 0,
      scope: p.scope || 'all',
      category_id: p.category_id || '',
      course_id: p.course_id || '',
      starts_at: toInput(p.starts_at),
      ends_at: toInput(p.ends_at),
      is_active: !!p.is_active,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.title || !form.discount_percent || !form.starts_at || !form.ends_at) {
      toast.error('Please fill in the required fields');
      return;
    }
    const payload: any = {
      title: form.title,
      description: form.description || undefined,
      discount_percent: Number(form.discount_percent),
      scope: form.scope,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      is_active: form.is_active,
    };
    if (form.slug) payload.slug = form.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (form.scope === 'category') payload.category_id = form.category_id || null;
    if (form.scope === 'course') payload.course_id = form.course_id || null;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/promotions/${editing.id}`, payload);
        toast.success('Promotion updated');
      } else {
        await api.post('/promotions', payload);
        toast.success('Promotion created');
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save promotion');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: any) => {
    try {
      await api.put(`/promotions/${p.id}`, { is_active: !p.is_active });
      toast.success(p.is_active ? 'Promotion disabled' : 'Promotion enabled');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update promotion');
    }
  };

  const remove = async (p: any) => {
    if (!window.confirm(`Delete promotion "${p.title}"?`)) return;
    try {
      await api.delete(`/promotions/${p.id}`);
      toast.success('Promotion deleted');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete promotion');
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BadgePercent className="w-7 h-7 text-primary-500" /> Promotions
          </h1>
          <p className="text-gray-500 mt-1">Time-boxed discount events. Courses no longer carry standing discounts — price cuts only happen through active promotions.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> New Promotion</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Promotions', value: stats.total, icon: BadgePercent, tone: 'bg-primary-500/10 text-primary-500' },
          { label: 'Live Now', value: stats.live, icon: TrendingUp, tone: 'bg-success-500/10 text-success-500' },
          { label: 'Scheduled', value: stats.scheduled, icon: CalendarClock, tone: 'bg-warning-500/10 text-warning-500' },
          { label: 'Finished', value: stats.finished, icon: CalendarX2, tone: 'bg-gray-500/10 text-gray-500' },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4 flex items-center gap-3" hover>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.tone}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold leading-none">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4 space-y-4" hover={false}>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search promotions…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Wallet className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            No promotions yet. Create your first discount event.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-2 pr-4">Promotion</th>
                  <th className="pb-2 pr-4">Scope</th>
                  <th className="pb-2 pr-4">Discount</th>
                  <th className="pb-2 pr-4">Window</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const st = status(p);
                  const scope = scopeMeta[p.scope] || scopeMeta.all;
                  const ScopeIcon = scope.icon;
                  return (
                    <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-gray-500">{p.description || p.slug || '—'}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${scope.tone}`}>
                          <ScopeIcon className="w-3.5 h-3.5" />
                          {p.scope === 'category' ? p.category_name || scope.label : p.scope === 'course' ? p.course_title || scope.label : scope.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1 font-bold text-success-500">
                          {Number(p.discount_percent)}% off
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-xs">{fmtDate(p.starts_at)} → {fmtDate(p.ends_at)}</div>
                      </td>
                      <td className="py-3 pr-4"><Badge variant={st.variant}>{st.label}</Badge></td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleActive(p)}
                            title={p.is_active ? 'Disable' : 'Enable'}
                            className={`p-2 rounded-lg transition-colors ${p.is_active ? 'text-success-500 hover:bg-success-500/10' : 'text-gray-400 hover:bg-gray-100'}`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => remove(p)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg glass rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? 'Edit Promotion' : 'New Promotion'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Spring Sale 2026"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Discount % *</label>
                  <input type="number" min={0.01} max={100} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Slug</label>
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="spring-sale-2026"
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Scope *</label>
                <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['all', 'category', 'course'] as const).map((s) => (
                    <button key={s} onClick={() => setForm({ ...form, scope: s })} type="button"
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${form.scope === s ? 'bg-primary-500/10 border-primary-500/40 text-primary-600 dark:text-primary-400' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {form.scope === 'category' && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Category *</label>
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none">
                    <option value="">Select category…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {form.scope === 'course' && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Course *</label>
                  <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none">
                    <option value="">Select course…</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Starts *</label>
                  <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Ends *</label>
                  <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                <Power className="w-4 h-4 text-gray-400" /> Active immediately
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Promotion'}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}