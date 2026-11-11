import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ToggleLeft, ShieldAlert, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import toast from 'react-hot-toast';

export default function AdminFeatureFlags() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    try {
      const { data } = await api.get('/admin/feature-flags');
      setFlags(data.data || []);
    } catch {
      toast.error('Failed to load feature flags');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const toggle = async (flag: any) => {
    setSaving(flag.key);
    try {
      const { data } = await api.put(`/admin/feature-flags/${flag.key}`, { enabled: !flag.enabled });
      setFlags((list) => list.map((f) => f.key === flag.key ? data.data : f));
      toast.success(`${flag.key} ${data.data.enabled ? 'enabled' : 'disabled'}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update flag');
    } finally { setSaving(null); }
  };

  if (loading) return <PageSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><ToggleLeft className="w-7 h-7 text-primary-500" /> Feature Flags</h1>
        <p className="text-gray-500 text-sm mt-1">Turn platform features on or off instantly. Changes are audited and applied on the next request.</p>
      </div>

      <GlassCard className="p-4 mb-4 border-amber-500/20 bg-amber-500/5" hover={false}>
        <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Maintenance mode only blocks non-admin API access when enforced by the route guards. Disabling AI or payments takes effect immediately.</p>
        </div>
      </GlassCard>

      <div className="space-y-2">
        {flags.map((flag) => (
          <GlassCard key={flag.key} className="p-4 flex items-center justify-between gap-4" hover={false}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{flag.key}</p>
                <Badge variant={flag.enabled ? 'success' : 'default'} size="sm">{flag.enabled ? 'Enabled' : 'Disabled'}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{flag.description}</p>
            </div>
            <button
              onClick={() => toggle(flag)}
              disabled={saving === flag.key}
              aria-label={`Toggle ${flag.key}`}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${flag.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${flag.enabled ? 'translate-x-5' : ''}`} />
              {saving === flag.key && <Loader2 className="absolute inset-0 m-auto w-3 h-3 animate-spin text-white" />}
            </button>
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
}
