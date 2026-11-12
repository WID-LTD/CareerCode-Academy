import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Plus, Loader2, Copy, Check, Trash2, Power, CalendarDays, BookOpen, GitBranch } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

type Coupon = {
  id: string;
  code: string;
  discount_type: 'percent' | 'amount';
  value: number;
  course_id?: string | null;
  path_id?: string | null;
  course_title?: string | null;
  path_title?: string | null;
  max_uses?: number | null;
  uses: number;
  expires_at?: string | null;
  status: string;
  created_at: string;
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [paths, setPaths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'amount',
    value: 20,
    scope: 'all' as 'all' | 'course' | 'path',
    course_id: '',
    path_id: '',
    max_uses: '' as string | number,
    expires_at: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [c, co, lp] = await Promise.all([
        api.get('/admin/coupons'),
        api.get('/courses?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/learning-paths').catch(() => ({ data: { data: [] } })),
      ]);
      setCoupons(c.data.data || []);
      setCourses(co.data.data || []);
      setPaths(lp.data.data || []);
    } catch {
      toast.error('Failed to load coupons');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.value || Number(form.value) <= 0) { toast.error('Enter a discount value'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/admin/coupons', {
        code: form.code.trim() || undefined,
        discount_type: form.discount_type,
        value: Number(form.value),
        course_id: form.scope === 'course' ? form.course_id || undefined : undefined,
        path_id: form.scope === 'path' ? form.path_id || undefined : undefined,
        max_uses: form.max_uses === '' ? null : Number(form.max_uses),
        expires_at: form.expires_at || undefined,
      });
      setCoupons((c) => [data.data, ...c]);
      setForm({ code: '', discount_type: 'percent', value: 20, scope: 'all', course_id: '', path_id: '', max_uses: '', expires_at: '' });
      toast.success(`Coupon ${data.data.code} created`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create coupon');
    } finally { setSaving(false); }
  };

  const toggle = async (coupon: Coupon) => {
    try {
      const next = coupon.status === 'active' ? 'disabled' : 'active';
      const { data } = await api.put(`/admin/coupons/${coupon.id}`, { status: next });
      setCoupons((list) => list.map((c) => c.id === coupon.id ? { ...c, ...data.data } : c));
      toast.success(next === 'active' ? 'Coupon enabled' : 'Coupon disabled');
    } catch { toast.error('Failed to update coupon'); }
  };

  const remove = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon ${coupon.code}?`)) return;
    try {
      await api.delete(`/admin/coupons/${coupon.id}`);
      setCoupons((list) => list.filter((c) => c.id !== coupon.id));
      toast.success('Coupon deleted');
    } catch { toast.error('Failed to delete coupon'); }
  };

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 1500); }
    catch { toast.error('Could not copy'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Coupons</h1>
        <p className="text-gray-500 mt-1">Generate discount codes for courses, pathways or the whole catalogue. Students apply them at checkout.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <GlassCard className="p-5 lg:col-span-1" hover={false}>
          <h2 className="font-semibold flex items-center gap-2 mb-4"><Plus className="w-4 h-4" /> Create coupon</h2>
          <form onSubmit={create} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Code (leave blank to generate)</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CC-XXXXXX" className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Type</label>
                <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm">
                  <option value="percent">Percent</option>
                  <option value="amount">Amount (₦)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Value</label>
                <input type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Scope</label>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as any })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm">
                <option value="all">Whole catalogue</option>
                <option value="course">One course</option>
                <option value="path">One pathway</option>
              </select>
            </div>
            {form.scope === 'course' && (
              <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Select a course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            )}
            {form.scope === 'path' && (
              <select value={form.path_id} onChange={(e) => setForm({ ...form, path_id: e.target.value })} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Select a pathway</option>
                {paths.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Max uses</label>
                <input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Unlimited" className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Expires</label>
                <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Ticket className="w-4 h-4 mr-1" />} Generate coupon
            </Button>
          </form>
        </GlassCard>

        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <GlassCard className="p-10 grid place-items-center" hover={false}><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></GlassCard>
          ) : coupons.length === 0 ? (
            <GlassCard className="p-10 text-center text-gray-500" hover={false}>No coupons yet. Create your first one.</GlassCard>
          ) : coupons.map((c) => (
            <GlassCard key={c.id} className="p-4" hover={false}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-bold tracking-wider">{c.code}</code>
                    <Badge variant={c.status === 'active' ? 'success' : 'default'} size="sm">{c.status}</Badge>
                    <Badge variant="primary" size="sm">{c.discount_type === 'percent' ? `${c.value}% off` : `₦${Number(c.value).toLocaleString()} off`}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 flex-wrap">
                    {c.course_title ? <><BookOpen className="w-3 h-3" /> {c.course_title}</> : c.path_title ? <><GitBranch className="w-3 h-3" /> {c.path_title}</> : 'Whole catalogue'}
                    <span>·</span><span>{c.uses}{c.max_uses ? `/${c.max_uses}` : ''} uses</span>
                    {c.expires_at && <><span>·</span><CalendarDays className="w-3 h-3" /> {new Date(c.expires_at).toLocaleDateString()}</>}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => void copy(c.code)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Copy code">{copied === c.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}</button>
                  <button onClick={() => void toggle(c)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Toggle status"><Power className={`w-4 h-4 ${c.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`} /></button>
                  <button onClick={() => void remove(c)} className="p-2 rounded-lg hover:bg-red-500/10" title="Delete"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
